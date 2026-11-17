// app/api/assignments/import-questions-pdf/route.js
//
// 🆕 قراءة أسئلة واجب (اختيار من متعدد / صح وغلط) من ملف PDF بنفس صيغة "بنك
// الأسئلة" بتاعة الكويزات (app/lib/quizPdfParser.js + "pdf quizes format.md").
//
// POST multipart/form-data: file (PDF) + type? ("multiple_choice"|"true_false"|"auto") + lang? ("ar"|"en"|"es")
//
// ⚠️ بيرجّع الأسئلة المقروءة *من غير ما يحفظها*: الواجب ممكن لسه ما اتحفظش (فورم
// "واجب جديد" مفتوح)، فالأسئلة بتتضاف لقايمة الفورم وبتتحفظ مع الواجب عند "حفظ".
// نفس صلاحيات إنشاء الواجب (canManageCourse) ونفس قيود التحقق (validateOptionsLikeForm).

import { requireSession, canManageCourse } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { parseQuizPdfText } from "@/app/lib/quizPdfParser";
import { validateOptionsLikeForm, normalizeOptions, normalizePoints } from "@/app/lib/quizQuestionHelpers";
import { MAX_ASSIGNMENT_QUESTIONS } from "@/app/lib/assignmentQuestions";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALLOWED_FORCED_TYPES = ["multiple_choice", "true_false"];
const ALLOWED_FORCED_LANGS = ["ar", "en", "es"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!canManageCourse(auth.session)) return jsonResponse({ error: "forbidden" }, 403);

    const rl = await enforceRateLimit(request, {
      keyPrefix: "assignments:import-pdf",
      limit: 15,
      windowSeconds: 60,
      extraKey: `user:${auth.session.user.id}`,
    });
    if (rl) return rl;

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse({ error: "invalid_form_data" }, 400);
    }

    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return jsonResponse({ error: "missing_file" }, 400);
    if (file.type && file.type !== "application/pdf" && !file.name?.toLowerCase().endsWith(".pdf")) {
      return jsonResponse({ error: "file_must_be_pdf" }, 400);
    }
    if (file.size > MAX_FILE_BYTES) return jsonResponse({ error: "file_too_large", maxBytes: MAX_FILE_BYTES }, 400);

    const rawType = formData.get("type");
    const forcedType = ALLOWED_FORCED_TYPES.includes(rawType) ? rawType : null;
    const rawLang = formData.get("lang");
    const forcedLang = ALLOWED_FORCED_LANGS.includes(rawLang) ? rawLang : null;

    const buffer = Buffer.from(await file.arrayBuffer());

    let pdfText = "";
    try {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const parsed = await pdfParse(buffer);
      pdfText = parsed.text || "";
    } catch (err) {
      console.error("[assignments/import-questions-pdf] pdf-parse error:", err);
      return jsonResponse({ error: "could_not_read_pdf" }, 400);
    }
    if (!pdfText.trim()) return jsonResponse({ error: "empty_pdf_text" }, 400);

    const { questions: parsed, errors: parseErrors } = parseQuizPdfText(pdfText, { forcedType, forcedLang });
    if (parsed.length === 0) return jsonResponse({ error: "no_questions_found", parseErrors }, 400);

    const questions = [];
    const skipped = [...parseErrors];
    for (const q of parsed) {
      const options = normalizeOptions(q.options);
      const optionsError = validateOptionsLikeForm(q.type, options);
      if (optionsError) {
        skipped.push({ reason: optionsError, preview: q.text.slice(0, 60) });
        continue;
      }
      if (questions.length >= MAX_ASSIGNMENT_QUESTIONS) {
        skipped.push({ reason: "too_many_questions", preview: q.text.slice(0, 60) });
        continue;
      }
      questions.push({ type: q.type, text: q.text, options, points: normalizePoints(q.points) });
    }

    if (questions.length === 0) return jsonResponse({ error: "no_valid_questions", parseErrors: skipped }, 400);

    return jsonResponse({ questions, importedCount: questions.length, skippedCount: skipped.length, skipped });
  } catch (err) {
    console.error("[/api/assignments/import-questions-pdf] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
