// app/api/quizzes/[id]/questions/import-pdf/route.js
//
// استيراد أسئلة بالجملة لكويز معيّن من ملف PDF بصيغة "بنك الأسئلة"
// (شوف app/lib/quizPdfParser.js + PDF_QUIZ_FORMAT.md للتفاصيل الكاملة).
//
// POST multipart/form-data:
//   file       -> ملف PDF (مطلوب)
//   type       -> "multiple_choice" | "true_false" | "auto" (اختياري، افتراضي auto)
//
// نفس صلاحيات إضافة سؤال عادي: صاحب الكورس أو أدمن بس. بيتحقق من كل سؤال
// بنفس قواعد /api/quizzes/[id]/questions (validateOptions) قبل ما يتحفظ,
// وبيرجّع تقرير بالأسئلة اللي اتحفظت والأسئلة اللي فشل تحليلها (مع السبب)
// عشان المدرس يقدر يصلّح الملف ويعيد المحاولة.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getQuizModel, getQuestionModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { parseQuizPdfText } from "@/app/lib/quizPdfParser";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALLOWED_FORCED_TYPES = ["multiple_choice", "true_false"];
const ALLOWED_FORCED_LANGS = ["ar", "en", "es"]; // نفس اللغات المدعومة في LanguageContext
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB كفاية جدًا لملف نصي بصيغة PDF

// نفس منطق التحقق من الخيارات المستخدم في route.js الأساسي، مكرر هنا
// عمدًا (بدل استيراده) عشان الاستيراد بالجملة يفضل مستقل وميتأثرش لو
// حد عدّل شكل الـ validation بتاع الإنشاء الفردي من غير قصد.
function validateOptions(type, options) {
  if (!Array.isArray(options) || options.length < 2) return "options_required";
  if (type === "true_false" && options.length !== 2) return "true_false_needs_two_options";
  if (options.some((o) => !String(o?.text || "").trim())) return "empty_option_text";
  if (!options.some((o) => Boolean(o?.isCorrect))) return "no_correct_option";
  if (type === "true_false" && options.filter((o) => o.isCorrect).length !== 1) {
    return "true_false_needs_one_correct";
  }
  return null;
}

function serializeQuestion(qq) {
  return {
    id: qq._id.toString(),
    type: qq.type,
    text: qq.text,
    points: qq.points,
    order: qq.order,
    options: (qq.options || []).map((o, index) => ({ index, text: o.text, isCorrect: o.isCorrect })),
  };
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_quiz" }, 400);

    await connectToMongo();
    const Quiz = getQuizModel();
    const quiz = await Quiz.findById(id);
    if (!quiz) return jsonResponse({ error: "not_found" }, 404);

    const Course = getCourseModel();
    const course = await Course.findById(quiz.course);
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse({ error: "invalid_form_data" }, 400);
    }

    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return jsonResponse({ error: "missing_file" }, 400);
    }
    if (file.type && file.type !== "application/pdf" && !file.name?.toLowerCase().endsWith(".pdf")) {
      return jsonResponse({ error: "file_must_be_pdf" }, 400);
    }
    if (file.size > MAX_FILE_BYTES) {
      return jsonResponse({ error: "file_too_large", maxBytes: MAX_FILE_BYTES }, 400);
    }

    const rawType = formData.get("type");
    const forcedType = ALLOWED_FORCED_TYPES.includes(rawType) ? rawType : null;

    const rawLang = formData.get("lang");
    const forcedLang = ALLOWED_FORCED_LANGS.includes(rawLang) ? rawLang : null;

    // pdf-parse بيتطلب Buffer (Node), مش ArrayBuffer مباشرة
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pdfText = "";
    try {
      // استيراد ديناميكي عشان الحزمة تتحمّل بس وقت الحاجة (route ده تحديدًا)
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buffer);
      pdfText = parsed.text || "";
    } catch (err) {
      console.error("[import-pdf] pdf-parse error:", err);
      return jsonResponse({ error: "could_not_read_pdf" }, 400);
    }

    if (!pdfText.trim()) {
      return jsonResponse({ error: "empty_pdf_text" }, 400);
    }

    const { questions: parsedQuestions, errors: parseErrors } = parseQuizPdfText(pdfText, { forcedType, forcedLang });

    if (parsedQuestions.length === 0) {
      return jsonResponse({ error: "no_questions_found", parseErrors }, 400);
    }

    const Question = getQuestionModel();
    let order = await Question.countDocuments({ quiz: quiz._id });

    const toInsert = [];
    const rejected = [...parseErrors]; // هنضيف عليها أي سؤال اتفهم لكن فشل في validateOptions

    for (const q of parsedQuestions) {
      const options = q.options.map((o) => ({ text: String(o.text || "").trim(), isCorrect: Boolean(o.isCorrect) }));
      const optionsError = validateOptions(q.type, options);
      if (optionsError) {
        rejected.push({ reason: optionsError, preview: q.text.slice(0, 60) });
        continue;
      }
      toInsert.push({
        quiz: quiz._id,
        type: q.type,
        text: q.text,
        options,
        points: Number.isFinite(q.points) ? Math.max(0, q.points) : 1,
        order: order++,
      });
    }

    if (toInsert.length === 0) {
      return jsonResponse({ error: "no_valid_questions", parseErrors: rejected }, 400);
    }

    const created = await Question.insertMany(toInsert);

    return jsonResponse(
      {
        imported: created.map(serializeQuestion),
        importedCount: created.length,
        skippedCount: rejected.length,
        skipped: rejected,
      },
      201
    );
  } catch (err) {
    console.error("[/api/quizzes/[id]/questions/import-pdf] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}