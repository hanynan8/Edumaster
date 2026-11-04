// app/api/quizzes/[id]/results/[resultId]/messages/route.js
//
// 🆕 محادثة نصية على محاولة كويز: المدرّس/الموديريتر/الأدمن والطالب صاحب المحاولة
// يقدروا يبعتوا نص (طويل) لبعض — مثلًا المدرّس يسأل/يوضّح والطالب يرد.
//
// GET  → كل الرسائل.     POST { text } → رسالة جديدة (والطرف التاني بيتبعتله إشعار).

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getCourseModel, getQuizModel, getQuizResultModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { createNotification } from "@/app/lib/notificationHelpers";
import {
  sanitizeMessageText,
  threadAccess,
  serializeMessages,
  MAX_MESSAGES_PER_THREAD,
} from "@/app/lib/threadMessages";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function load(quizId, resultId) {
  if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(resultId)) return {};
  const quiz = await getQuizModel().findById(quizId).lean();
  if (!quiz) return {};
  const course = await getCourseModel().findById(quiz.course).lean();
  const result = await getQuizResultModel().findOne({ _id: resultId, quiz: quiz._id });
  return { quiz, course, result };
}

async function namesFor(ids) {
  const users = await getAuthModel().find({ _id: { $in: [...new Set(ids.map(String))] } }, "name").lean();
  return Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));
}

export async function GET(request, { params }) {
  try {
    const { id, resultId } = await params;
    await connectToMongo();
    const { quiz, course, result } = await load(id, resultId);
    if (!quiz || !course || !result) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!threadAccess(auth.session, course.teacher, result.student)) return jsonResponse({ error: "forbidden" }, 403);

    const names = await namesFor(result.messages.map((m) => m.sender));
    return jsonResponse({ messages: serializeMessages(result.messages, names) });
  } catch (err) {
    console.error("[quiz result messages] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id, resultId } = await params;
    await connectToMongo();
    const { quiz, course, result } = await load(id, resultId);
    if (!quiz || !course || !result) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    const access = threadAccess(session, course.teacher, result.student);
    if (!access) return jsonResponse({ error: "forbidden" }, 403);

    const rl = await enforceRateLimit(request, {
      keyPrefix: "quiz:thread",
      limit: 20,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    const parsed = sanitizeMessageText(body?.text);
    if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);
    if (result.messages.length >= MAX_MESSAGES_PER_THREAD) return jsonResponse({ error: "thread_full" }, 400);

    // 🔒 senderRole من الـ session مش من الـ body
    const senderRole = access === "student" ? "student" : ["teacher", "moderator", "admin"].includes(session.user.role) ? session.user.role : "teacher";
    result.messages.push({ sender: session.user.id, senderRole, text: parsed.text });
    await result.save();

    // 🔔 إشعار للطرف التاني: الطالب → صاحب الكورس، والمدرّس/الموديريتر → الطالب
    const recipient = access === "student" ? course.teacher : result.student;
    if (recipient && String(recipient) !== String(session.user.id)) {
      await createNotification({
        user: recipient,
        type: "message_new",
        key: "thread_message",
        params: { senderName: session.user.name || null, itemTitle: quiz.title, body: parsed.text.slice(0, 200) },
        link: access === "student" ? `/teacher/quizzes/${quiz._id}/results` : `/student/quizzes/${quiz._id}`,
        course: course._id,
      });
    }

    const names = await namesFor(result.messages.map((m) => m.sender));
    return jsonResponse({ messages: serializeMessages(result.messages, names) }, 201);
  } catch (err) {
    console.error("[quiz result messages] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
