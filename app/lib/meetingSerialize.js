// app/lib/meetingSerialize.js
//
// 🆕 شكل واحد موحّد لإرجاع Meeting من كل الـ API routes (كان متكرر في 3
// ملفات). بيدعم المستند الـ populated (course/teacher كـ objects) والخام
// (ObjectIds).
//
// 🔒 الخصوصية: قائمة المدعوين بالإيميل (invitedEmails) بترجع بس لمن يملك
// إدارة المحاضرة (includeInvitees=true) — الطالب العادي مايشوفش إيميلات
// غيره.

export function serializeMeeting(m, { includeInvitees = false } = {}) {
  const course = m.course;
  const teacher = m.teacher;
  const rec = m.recurrence;
  return {
    id: m._id.toString(),
    course: course?._id ? course._id.toString() : course ? course.toString() : null,
    isGeneral: !course,
    courseTitle: course?.title,
    teacher: teacher?._id ? teacher._id.toString() : teacher?.toString(),
    teacherName: teacher?.name,
    title: m.title,
    description: m.description || "",
    link: m.link,
    source: m.source || "manual",
    scheduledAt: m.scheduledAt,
    durationMinutes: m.durationMinutes,
    recordings: (m.recordings || []).map((r) => ({
      id: r.dailyRecordingId,
      durationSeconds: r.durationSeconds,
      createdAt: r.createdAt,
    })),
    // 🔁 السلسلة المتكررة
    seriesId: m.seriesId ? m.seriesId.toString() : null,
    seriesIndex: m.seriesIndex ?? null,
    recurrence: rec
      ? {
          frequency: rec.frequency,
          interval: rec.interval,
          daysOfWeek: rec.daysOfWeek || [],
          endType: rec.endType,
          count: rec.count ?? null,
          until: rec.until ?? null,
          timeZone: rec.timeZone || "UTC",
        }
      : null,
    // 📧 المدعوين
    invitedCount: (m.invitedEmails || []).length,
    ...(includeInvitees ? { invitedEmails: m.invitedEmails || [] } : {}),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}
