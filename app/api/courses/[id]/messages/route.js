// app/api/courses/[id]/messages/route.js
//
// 🆕 محادثة خاصة بين طالب ومدرس كورسه — خيط واحد بس لكل (course, student).
//
// GET  /api/courses/[id]/messages[?studentId=]
//   - طالب عنده وصول فعلي للكورس (enrollment/membership، زي فحص اللي في
//     app/api/lessons/[id]/comments/route.js بالظبط): بيرجّع محادثته هو مع
//     مدرس الكورس (studentId بيتجاهل، دايمًا session.user.id).
//   - مدرس صاحب الكورس أو أدمن (isOwnerOrAdmin): لازم ?studentId= — بيرجّع
//     محادثة الطالب ده تحديدًا (للاستخدام من صندوق وارد المدرس).
//   - فتح الخيط بيعلّم رسايل الطرف التاني كـ "مقروءة" تلقائيًا (isRead=true).
//
// POST /api/courses/[id]/messages { body, studentId? }
//   - طالب: بيبدأ/يكمل محادثة مع مدرس الكورس (نفس فحص الوصول). studentId في
//     الـ body بيتجاهل — دايمًا هو نفسه.
//   - مدرس صاحب الكورس أو أدمن: بيرد على طالب معيّن — studentId إجباري في
//     الـ body. 🔒 المدرس مش بيقدر "يبدأ" محادثة مع طالب من الصفر (مفيش
//     initiate)، لازم يكون الطالب هو اللي بدأ أول رسالة — يعني لازم يكون
//     فيه enrollment/access فعلي للطالب ده على الكورس ده وقت الرد.
//
// 🔔 كل رسالة جديدة → إشعار "message_new" للطرف المستقبِل، برابط لصندوق
// الوارد بتاعه (/student/messages أو /teacher/messages).

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getCourseModel, getMessageModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { createNotification } from "@/app/lib/notificationHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeMessage(m) {
  return {
    id: m._id.toString(),
    body: m.body,
    isRead: m.isRead,
    sender: {
      id: m.sender._id ? m.sender._id.toString() : m.sender.toString(),
      name: m.sender.name ?? null,
      avatar: resolveSecureStoredUrl(m.sender.profile?.avatar ?? null),
    },
    createdAt: m.createdAt,
  };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(id, "teacher title").populate("teacher", "name profile.avatar").lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    const canManage = isOwnerOrAdmin(session, course.teacher?._id || course.teacher);

    let studentId;
    if (canManage) {
      studentId = searchParams.get("studentId");
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return jsonResponse({ error: "missing_student" }, 400);
      }
    } else {
      const { hasAccess } = await getCourseAccessForUser({ userId: session.user.id, courseId: id });
      if (!hasAccess) return jsonResponse({ error: "forbidden", reason: "enrollment_required" }, 403);
      studentId = session.user.id;
    }

    const Message = getMessageModel();
    getAuthModel(); // تسجيل موديل الـ auth عشان populate("sender") يشتغل

    const messages = await Message.find({ course: id, student: studentId })
      .sort({ createdAt: 1 })
      .populate("sender", "name profile.avatar")
      .lean();

    // 🆕 فتح الخيط = قراءة رسايل الطرف التاني (مش رسايلي أنا).
    await Message.updateMany(
      { course: id, student: studentId, sender: { $ne: session.user.id }, isRead: false },
      { $set: { isRead: true } }
    );

    return jsonResponse({
      course: { id: course._id.toString(), title: course.title },
      teacher: {
        id: course.teacher?._id ? course.teacher._id.toString() : course.teacher?.toString(),
        name: course.teacher?.name ?? null,
        avatar: resolveSecureStoredUrl(course.teacher?.profile?.avatar ?? null),
      },
      messages: messages.map(serializeMessage),
    });
  } catch (err) {
    console.error("[/api/courses/[id]/messages] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(id, "teacher title");
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json().catch(() => null);
    const text = String(body?.body || "").trim();
    if (!text) return jsonResponse({ error: "missing_body" }, 400);

    const canManage = isOwnerOrAdmin(session, course.teacher);

    let studentId;
    if (canManage) {
      studentId = body?.studentId;
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return jsonResponse({ error: "missing_student" }, 400);
      }
      // 🔒 المدرس مايبدأش محادثة من الصفر — لازم الطالب يكون عنده وصول فعلي
      // للكورس ده أصلاً (يعني هو اللي المفروض بدأ أول رسالة).
      const { hasAccess } = await getCourseAccessForUser({ userId: studentId, courseId: id });
      if (!hasAccess) return jsonResponse({ error: "student_no_access" }, 400);
    } else {
      const { hasAccess } = await getCourseAccessForUser({ userId: session.user.id, courseId: id });
      if (!hasAccess) return jsonResponse({ error: "forbidden", reason: "enrollment_required" }, 403);
      studentId = session.user.id;
    }

    const rl = await enforceRateLimit(request, {
      keyPrefix: "messages:create",
      limit: 20,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const Message = getMessageModel();
    const created = await Message.create({
      course: course._id,
      student: studentId,
      teacher: course.teacher,
      sender: session.user.id,
      body: text.slice(0, 3000),
    });

    // 🔔 المستقبِل = الطرف التاني (لو أنا الطالب، المستقبِل المدرس، والعكس)
    const recipientId = String(session.user.id) === String(studentId) ? course.teacher : studentId;
    const senderIsStudent = String(session.user.id) === String(studentId);
    if (String(recipientId) !== String(session.user.id)) {
      createNotification({
        user: recipientId,
        type: "message_new",
        title: senderIsStudent
          ? `رسالة جديدة من ${session.user.name || "طالب"}`
          : `رد جديد من مدرس "${course.title}"`,
        message: text.slice(0, 200),
        link: senderIsStudent
          ? `/teacher/messages?course=${course._id}&student=${studentId}`
          : `/student/messages?course=${course._id}`,
        course: course._id,
      }).catch((err) => console.error("[/api/courses/[id]/messages] notify error:", err));
    }

    return jsonResponse(
      {
        id: created._id.toString(),
        body: created.body,
        isRead: created.isRead,
        sender: { id: session.user.id, name: session.user.name ?? null, avatar: session.user.avatar ?? null },
        createdAt: created.createdAt,
      },
      201
    );
  } catch (err) {
    console.error("[/api/courses/[id]/messages] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}