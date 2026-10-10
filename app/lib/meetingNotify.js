// app/lib/meetingNotify.js
//
// 🆕 إشعارات تغيير/إلغاء محاضرة موجودة. قبل كده الطلاب كانوا بيتبلّغوا بالمحاضرة
// وقت الإنشاء بس — لو المدرس غيّر الموعد أو حذفها ماكانش حد بيتبلّغ (وطالب ممكن يدخل
// في الميعاد القديم لوحده). إشعار داخل الموقع بس (مفيش إيميل جماعي هنا عن قصد)،
// best-effort بالكامل — فشله مايوقفش التعديل/الحذف نفسه.
//
// المستلمين: مسجّلو الكورس + المدعوين بالإيميل (محاضرة كورس)، أو كل المستخدمين
// (جلسة عامة). بنستبعد اللي عمل التغيير.

import { getAuthModel } from "@/app/lib/mongodb";
import { formatMeetingWhen } from "@/app/lib/meetingTime";
import {
  createNotificationsForUsers,
  getEnrolledUserIds,
  getAllUserIds,
} from "@/app/lib/notificationHelpers";

export async function getMeetingRecipientIds(meeting, { excludeUserId } = {}) {
  let ids;
  if (!meeting.course) {
    ids = await getAllUserIds();
  } else {
    ids = await getEnrolledUserIds(meeting.course);
    const emails = (meeting.invitedEmails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
    if (emails.length > 0) {
      const invited = await getAuthModel().find({ email: { $in: emails } }, "_id").lean();
      ids = [...ids, ...invited.map((u) => String(u._id))];
    }
  }
  const exclude = excludeUserId ? String(excludeUserId) : null;
  return [...new Set(ids.map(String))].filter((id) => id !== exclude);
}

/**
 * @param {object} params
 * @param {object} params.meeting - المحاضرة (بعد التعديل في حالة rescheduled)
 * @param {"rescheduled"|"cancelled"} params.kind
 * @param {string} params.actorId
 * @param {number} [params.count] - عدد المحاضرات المتأثرة (سلسلة)
 */
export async function notifyMeetingChange({ meeting, kind, actorId, count = 1 }) {
  try {
    const recipients = await getMeetingRecipientIds(meeting, { excludeUserId: actorId });
    if (recipients.length === 0) return 0;

    const when = formatMeetingWhen(meeting.scheduledAt, {
      locale: "ar-EG",
      timeZone: meeting.recurrence?.timeZone,
      withZoneName: true,
    });
    const many = count > 1;
    const title =
      kind === "cancelled"
        ? many
          ? `تم إلغاء ${count} محاضرات: ${meeting.title}`
          : `تم إلغاء المحاضرة: ${meeting.title}`
        : many
        ? `تم تغيير موعد سلسلة المحاضرات: ${meeting.title}`
        : `تم تغيير موعد المحاضرة: ${meeting.title}`;
    const message = kind === "cancelled" ? `كانت في ${when}` : `الموعد الجديد: ${when}`;

    const created = await createNotificationsForUsers(recipients, {
      type: "meeting_scheduled",
      title,
      message,
      link: "/meet",
      course: meeting.course || null,
    });
    return created.length;
  } catch (err) {
    console.error("[meetingNotify] notifyMeetingChange failed:", err);
    return 0;
  }
}
