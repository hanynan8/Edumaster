// app/lib/meetingCleanup.js
//
// 🔧 حذف كورس كان بيسيب محاضراته (Meeting) وغرف Daily بتاعتها معلّقة: المحاضرات اليتيمة
// كانت بتفضل ظاهرة للمدرس/الأدمن كـ"جلسة عامة" (لأن populate بيرجّع course = null)،
// وكمان الـ cron كان بيفضل يبعت تذكيرات ليها. بنمسحهم مع الكورس (best-effort).

import { getMeetingModel } from "@/app/lib/models";
import { deleteDailyRoom } from "@/app/lib/daily";

const ROOM_DELETE_BATCH = 10;

export async function deleteMeetingsForCourse(courseId) {
  try {
    const Meeting = getMeetingModel();
    const meetings = await Meeting.find({ course: courseId }, "dailyRoomName source").lean();
    if (meetings.length === 0) return 0;

    const rooms = meetings.filter((m) => m.source === "daily" && m.dailyRoomName).map((m) => m.dailyRoomName);
    for (let i = 0; i < rooms.length; i += ROOM_DELETE_BATCH) {
      await Promise.all(rooms.slice(i, i + ROOM_DELETE_BATCH).map((name) => deleteDailyRoom(name)));
    }

    const res = await Meeting.deleteMany({ course: courseId });
    return res?.deletedCount || 0;
  } catch (err) {
    console.error("[meetingCleanup] deleteMeetingsForCourse failed:", err);
    return 0;
  }
}
