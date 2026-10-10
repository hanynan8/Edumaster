// app/lib/meetingInvites.js
//
// 🆕 دعوة مستخدمين مسجّلين في الموقع للميتنج (Meeting.invitedEmails) — مفيش
// حد أقصى لعدد المدعوين. التحقق إن الإيميل مسجّل فعلًا في الموقع بيتم في
// app/lib/meetingCreate.js (findUnregisteredEmails).
//
// - parseInvitedEmails: بيقبل array أو نص (مفصول بفاصلة / فاصلة منقوطة / سطر
//   جديد / مسافة)، وبيرجّع الإيميلات صالحة + lowercase + بدون تكرار، والغلط
//   لوحده عشان الـ API يرد بـ 400 واضح.
// - isEmailInvited: فحص صلاحية الدخول — هل إيميل المستخدم الحالي ضمن المدعوين.
// - diffInvitedEmails: الجداد/المحذوفين عند التعديل (الدعوة بتتبعت للجداد بس).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseInvitedEmails(input) {
  if (input === undefined || input === null || input === "") return { emails: [], invalid: [] };

  const rawList = Array.isArray(input) ? input : String(input).split(/[\s,;]+/);
  const emails = [];
  const invalid = [];
  const seen = new Set();

  for (const item of rawList) {
    const email = String(item || "").trim().toLowerCase();
    if (!email) continue;
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      invalid.push(String(item).trim());
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return { emails, invalid };
}

export function isEmailInvited(meeting, email) {
  if (!email || !Array.isArray(meeting?.invitedEmails)) return false;
  const target = String(email).trim().toLowerCase();
  return meeting.invitedEmails.some((e) => String(e).toLowerCase() === target);
}

export function diffInvitedEmails(previous = [], next = []) {
  const prev = new Set((previous || []).map((e) => String(e).toLowerCase()));
  const nxt = new Set((next || []).map((e) => String(e).toLowerCase()));
  return {
    added: [...nxt].filter((e) => !prev.has(e)),
    removed: [...prev].filter((e) => !nxt.has(e)),
  };
}

/**
 * 🔒 فحص وصول موحّد لأي route بيخص محاضرة (token / presence / recordings):
 * مدرس/أدمن صاحبها، أو مدعو بالإيميل، أو جلسة عامة، أو وصول فعلي على الكورس.
 * بيرجّع { allowed: true } أو { allowed: false, status, error, reason? }.
 * getCourseAccessForUser و Course بتتمرّر من بره عشان الملف ده يفضل خفيف
 * ويتجنب أي import دائري.
 */
export async function checkMeetingAccess({ meeting, session, isManager, findCourse, getCourseAccess }) {
  if (isManager) return { allowed: true };
  if (isEmailInvited(meeting, session?.user?.email)) return { allowed: true };
  // جلسة عامة (من غير كورس): متاحة لأي مستخدم مسجّل دخول.
  if (!meeting.course) return { allowed: true };

  const course = await findCourse(meeting.course);
  if (!course) return { allowed: false, status: 404, error: "not_found" };

  const access = await getCourseAccess({ userId: session.user.id, courseId: meeting.course });
  if (!access.hasAccess) return { allowed: false, status: 403, error: "forbidden", reason: access.reason };
  return { allowed: true };
}
