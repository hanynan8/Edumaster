// app/api/quizzes/[id]/questions/import-pdf/route.js
//
// 🆕 استيراد أسئلة كويز بالجملة من ملف PDF — بدل ما المدرس يضيف كل سؤال
// يدويًا من QuestionFormModal، يقدر يرفع ملف PDF مكتوب بفورمات محدد (شوف
// app/lib/quizPdfParser.js للتوثيق الكامل للفورمات) ويتملي الأسئلة
// تلقائيًا. نفس صلاحيات POST /api/quizzes/[id]/questions بالظبط (صاحب
// الكورس أو أدمن)، ونفس الـ validation النهائي.
//
// FormData المتوقع:
//   - file: ملف PDF (application/pdf)
//   - mode: "true_false" | "multiple_choice"
//
// الرد:
//   { created: [Question...], createdCount, errors: string[] }
//   - errors بترجع لو في أسئلة اتقفزت لعيب في الفورمات (باقي الأسئلة
//     الصحيحة بتتضاف عادي، مش كل الملف بيترفض عشان سؤال واحد غلط).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getQuizModel, getQuestionModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { parseTrueFalseText, parseMultipleChoiceText } from "@/app/lib/quizPdfParser";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALLOWED_MODES = ["multiple_choice", "true_false"];

// 🔒 حد أقصى لحجم الملف المرفوع (10MB كافية جدًا لملف نصي بسيط بكذا سؤال).
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// نفس منطق validateOptions في route.js الرئيسي — بنعيد التحقق هنا كمان
// (defense in depth) قبل ما ننشئ أي سؤال، حتى لو الـ parser المفروض يضمن
// شكل صحيح أصلًا.
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

    const mode = formData.get("mode");
    if (!ALLOWED_MODES.includes(mode)) {
      return jsonResponse({ error: "invalid_mode", allowed: ALLOWED_MODES }, 400);
    }

    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return jsonResponse({ error: "missing_file" }, 400);
    }
    if (file.size > MAX_FILE_BYTES) {
      return jsonResponse({ error: "file_too_large", maxBytes: MAX_FILE_BYTES }, 400);
    }
    const looksLikePdf =
      (file.type && file.type.includes("pdf")) || (file.name && file.name.toLowerCase().endsWith(".pdf"));
    if (!looksLikePdf) {
      return jsonResponse({ error: "file_must_be_pdf" }, 400);
    }

    // 🆕 استخراج نص الـ PDF — pdf-parse v2 (import ديناميكي عشان النسخة
    // Node-only ومحتاجة تتحمّل بس وقت الحاجة، مش على كل استيراد للراوت).
    let text = "";
    try {
      const { PDFParse } = await import("pdf-parse");
      const buffer = Buffer.from(await file.arrayBuffer());
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      text = result?.text || "";
    } catch (err) {
      console.error("[import-pdf] pdf-parse error:", err);
      return jsonResponse({ error: "pdf_read_failed" }, 400);
    }

    if (!text.trim()) {
      return jsonResponse({ error: "empty_pdf_text" }, 400);
    }

    const { questions: parsedQuestions, errors: parseErrors } =
      mode === "true_false" ? parseTrueFalseText(text) : parseMultipleChoiceText(text);

    if (parsedQuestions.length === 0) {
      return jsonResponse({ error: "no_questions_found", errors: parseErrors }, 400);
    }

    const Question = getQuestionModel();
    let order = await Question.countDocuments({ quiz: quiz._id });

    const errors = [...parseErrors];
    const docsToInsert = [];
    parsedQuestions.forEach((q, idx) => {
      const options = q.options.map((o) => ({ text: o.text.trim(), isCorrect: Boolean(o.isCorrect) }));
      const optionsError = validateOptions(q.type, options);
      if (optionsError) {
        errors.push(`Question ${idx + 1} ("${q.text.slice(0, 40)}..."): ${optionsError}`);
        return;
      }
      docsToInsert.push({
        quiz: quiz._id,
        type: q.type,
        text: q.text,
        options,
        points: Number.isFinite(q.points) ? Math.max(0, q.points) : 1,
        order: order++,
      });
    });

    if (docsToInsert.length === 0) {
      return jsonResponse({ error: "no_valid_questions", errors }, 400);
    }

    const created = await Question.insertMany(docsToInsert);

    return jsonResponse(
      {
        created: created.map(serializeQuestion),
        createdCount: created.length,
        errors,
      },
      201
    );
  } catch (err) {
    console.error("[/api/quizzes/[id]/questions/import-pdf] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}