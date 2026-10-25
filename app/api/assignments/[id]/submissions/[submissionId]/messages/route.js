// app/api/assignments/[id]/submissions/[submissionId]/messages/route.js
//
// 🆕 محادثة نصية على تسليم واجب: المدرّس/الموديريتر/الأدمن والطالب صاحب التسليم
// يقدروا يبعتوا نص (طويل) لبعض. إعادة تسليم الطالب بتحافظ على الرسائل.
//
// GET  → كل الرسائل.     POST { text } → رسالة جديدة (والطرف التاني بيتبعتله إشعار).

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getCourseModel, getAssignmentModel, getSubmissionModel } from "@/app/lib/models";
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

async function load(assignmentId, submissionId) {
  if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(submissionId)) return {};
  const assignment = await getAssignmentModel().findById(assignmentId).lean();
  if (!assignment) return {};
  const course = await getCourseModel().findById(assignment.course).lean();
  const submission = await getSubmissionModel().findOne({ _id: submissionId, assignment: assignment._id });
  return { assignment, course, submission };
}

async function namesFor(ids) {
  const users = await getAuthModel().find({ _id: { $in: [...new Set(ids.map(String))] } }, "name").lean();
  return Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));
}

export async function GET(request, { params }) {
  try {
    const { id, submissionId } = await params;
    await connectToMongo();
    const { assignment, course, submission } = await load(id, submissionId);
    if (!assignment || !course || !submission) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!threadAccess(auth.session, course.teacher, submission.student)) return jsonResponse({ error: "forbidden" }, 403);

    const names = await namesFor(submission.messages.map((m) => m.sender));
    return jsonResponse({ messages: serializeMessages(submission.messages, names) });
  } catch (err) {
    console.error("[assignment submission messages] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id, submissionId } = await params;
    await connectToMongo();
    const { assignment, course, submission } = await load(id, submissionId);
    if (!assignment || !course || !submission) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    const access = threadAccess(session, course.teacher, submission.student);
    if (!access) return jsonResponse({ error: "forbidden" }, 403);

    const rl = await enforceRateLimit(request, {
      keyPrefix: "assignments:thread",
      limit: 20,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    const parsed = sanitizeMessageText(body?.text);
    if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);
    if (submission.messages.length >= MAX_MESSAGES_PER_THREAD) return jsonResponse({ error: "thread_full" }, 400);

    const senderRole =
      access === "student" ? "student" : ["teacher", "moderator", "admin"].includes(session.user.role) ? session.user.role : "teacher";
    submission.messages.push({ sender: session.user.id, senderRole, text: parsed.text });
    await submission.save();

    const recipient = access === "student" ? course.teacher : submission.student;
    if (recipient && String(recipient) !== String(session.user.id)) {
      await createNotification({
        user: recipient,
        type: "message_new",
        key: "thread_message",
        params: { senderName: session.user.name || null, itemTitle: assignment.title, body: parsed.text.slice(0, 200) },
        link:
          access === "student"
            ? `/teacher/assignments/${assignment._id}/submissions`
            : `/student/assignments/${assignment._id}`,
        course: course._id,
      });
    }

    const names = await namesFor(submission.messages.map((m) => m.sender));
    return jsonResponse({ messages: serializeMessages(submission.messages, names) }, 201);
  } catch (err) {
    console.error("[assignment submission messages] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
