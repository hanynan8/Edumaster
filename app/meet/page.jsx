"use client";

// app/meet/page.jsx
//
// 🆕 صفحة "المحاضرات اللايف" — بتعرض روابط اجتماعات Daily (متولّدة تلقائيًا
// أو يدوية، شوف تعليق app/lib/models/Meeting.js) لكل الأدوار الثلاثة بنفس
// الصفحة:
//   - مدرس: بيشوف اجتماعات كورساته، يقدر يضيف/يعدّل/يحذف.
//   - طالب: بيشوف اجتماعات الكورسات المسجّل فيها بس، بزرار "دخول" للينك.
//   - أدمن: بيشوف كل الاجتماعات (رقابة عامة)، وعنده صلاحية حذف/تعديل أي
//     اجتماع زي أي owner (isOwnerOrAdmin في الـ API).
//
// الحماية: middleware.js بيحمي المسار ده لأي مستخدم مسجل دخول (أي role)،
// والفحص هنا طبقة UX إضافية بس (شاشة تحميل/رفض واضحة) زي باقي الصفحات.

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DailyMeetingModal from "@/app/components/DailyMeetingModal";
import {
  Video,
  Plus,
  Loader,
  AlertCircle,
  Calendar,
  Clock,
  ExternalLink,
  PlayCircle,
  Pencil,
  Trash2,
  X,
  BookOpen,
  User,
  ArrowRight,
  Radio,
} from "lucide-react";

function Blocked() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <Video className="text-red-400" size={30} />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">مفيش صلاحية وصول</h2>
      <p className="text-gray-400 mb-4">لازم تسجّل دخولك الأول عشان تشوف المحاضرات اللايف.</p>
      <Link href="/" className="text-blue-600 font-semibold hover:underline">
        الرجوع للرئيسية
      </Link>
    </div>
  );
}

function formatDateTime(dateStr) {
  try {
    return new Date(dateStr).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateStr;
  }
}

// "yyyy-MM-ddTHH:mm" — الصيغة اللي محتاجها <input type="datetime-local">
function toLocalInputValue(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 🆕 مفيش status مخزّن في الداتابيز عن قصد (شوف تعليق Meeting.js) — الحالة
// محسوبة لحظيًا من scheduledAt + durationMinutes مقابل الوقت الحالي.
function getPhase(meeting) {
  const start = new Date(meeting.scheduledAt).getTime();
  const end = start + (meeting.durationMinutes || 60) * 60 * 1000;
  const now = Date.now();
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "ended";
}

const PHASE_META = {
  live: { label: "شغالة دلوقتي", className: "bg-red-100 text-red-700" },
  upcoming: { label: "لسه هتبدأ", className: "bg-blue-100 text-blue-700" },
  ended: { label: "خلصت", className: "bg-gray-100 text-gray-500" },
};

const SAVE_ERROR_MESSAGES = {
  invalid_link: "رابط الاجتماع مش صالح — لازم يبدأ بـ http:// أو https://",
  missing_title: "عنوان المحاضرة مطلوب",
  invalid_scheduled_at: "معاد المحاضرة مش صالح",
  forbidden: "مفيش صلاحية تعدّل/تضيف على الكورس ده",
  daily_meeting_failed: "فشل إنشاء الاجتماع تلقائيًا عبر Daily — ابعت رابط يدوي كبديل.",
};

function MeetingFormModal({ meeting, courses, onClose, onSaved }) {
  const isEdit = Boolean(meeting);
  const [form, setForm] = useState({
    course: meeting?.course || courses[0]?.id || "",
    title: meeting?.title || "",
    description: meeting?.description || "",
    link: meeting?.link || "",
    scheduledAt: meeting ? toLocalInputValue(meeting.scheduledAt) : "",
    durationMinutes: meeting?.durationMinutes ?? 60,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) return setError("عنوان المحاضرة مطلوب");
    // 🆕 اللينك بقى اختياري هنا — لو Daily مفعّل على السيرفر، الرابط
    // هيتولد تلقائيًا. لو مش مفعّل والباك إند رفض الطلب، هيوصلنا خطأ
    // invalid_link واضح (شوف SAVE_ERROR_MESSAGES).
    if (!form.scheduledAt) return setError("معاد المحاضرة مطلوب");
    if (!isEdit && !form.course) return setError("اختر الكورس");

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        link: form.link.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 60,
      };

      const url = isEdit ? `/api/meetings/${meeting.id}` : `/api/courses/${form.course}/meetings`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "save_failed");

      onSaved();
    } catch (err) {
      setError(SAVE_ERROR_MESSAGES[err.message] || "حصل خطأ، حاول تاني");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-lg font-semibold text-gray-800">
            {isEdit ? "تعديل المحاضرة" : "محاضرة لايف جديدة"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {!isEdit && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">الكورس *</label>
              <select
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.course}
                onChange={(e) => update("course", e.target.value)}
                required
              >
                <option value="">اختر كورس...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {courses.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5">لازم يكون عندك كورس واحد على الأقل الأول.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">عنوان المحاضرة *</label>
            <input
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="مثلاً: مراجعة الفصل الثالث"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">وصف مختصر (اختياري)</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">رابط الاجتماع (اختياري)</label>
            <input
              type="url"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400 dir-ltr text-left"
              value={form.link}
              onChange={(e) => update("link", e.target.value)}
              placeholder="https://your-team.daily.co/room-name"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              سيبه فاضي عشان يتولّد رابط اجتماع فيديو عن طريق Daily تلقائيًا، أو الزق رابط اجتماع جاهز بنفسك.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">المعاد *</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.scheduledAt}
                onChange={(e) => update("scheduledAt", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">المدة (دقيقة)</label>
              <input
                type="number"
                min={5}
                max={480}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-400"
                value={form.durationMinutes}
                onChange={(e) => update("durationMinutes", e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader size={18} className="animate-spin" />}
              {isEdit ? "حفظ التعديلات" : "إضافة المحاضرة"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MeetingCard({ meeting, canManage, showTeacher, onEdit, onDelete, onJoinEmbedded, busy }) {
  const phase = getPhase(meeting);
  const meta = PHASE_META[phase];
  const isDaily = meeting.source === "daily";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
          <BookOpen size={12} /> {meeting.courseTitle || "كورس"}
        </div>
        <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${meta.className}`}>
          {phase === "live" && <Radio size={11} className="animate-pulse" />}
          {meta.label}
        </span>
      </div>

      <h3 className="font-bold text-gray-800 mb-1">{meeting.title}</h3>
      {meeting.description && <p className="text-sm text-gray-500 mb-3">{meeting.description}</p>}

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1">
          <Calendar size={13} /> {formatDateTime(meeting.scheduledAt)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={13} /> {meeting.durationMinutes} دقيقة
        </span>
        {showTeacher && meeting.teacherName && (
          <span className="flex items-center gap-1">
            <User size={13} /> {meeting.teacherName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isDaily ? (
          // 🆕 اجتماع Daily — بيتشغّل مضمّن جوه الموقع (شوف DailyMeetingModal)
          // بدل ما يفتح تاب خارجي.
          <button
            type="button"
            onClick={() => onJoinEmbedded(meeting)}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90"
          >
            <PlayCircle size={15} /> انضم للاجتماع
          </button>
        ) : (
          // 🆕 لينك يدوي (منصة تانية غير Daily) — مفيش SDK نضمّنه بيه، فبيفتح
          // في تاب جديد عادي.
          <a
            href={meeting.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90"
          >
            <ExternalLink size={15} /> الدخول على الاجتماع
          </a>
        )}
        {canManage && (
          <>
            <button
              onClick={() => onEdit(meeting)}
              title="تعديل"
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(meeting)}
              disabled={busy}
              title="حذف"
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600 disabled:opacity-60"
            >
              {busy ? <Loader size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MeetingSection({ title, meetings, canManage, showTeacher, onEdit, onDelete, onJoinEmbedded, busyId, emptyText }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
        {title} <span className="text-gray-300">({meetings.length})</span>
      </h2>
      {meetings.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-8 text-center text-sm text-gray-400">
          {emptyText}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              canManage={canManage(m)}
              showTeacher={showTeacher}
              onEdit={onEdit}
              onDelete={onDelete}
              onJoinEmbedded={onJoinEmbedded}
              busy={busyId === m.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MeetPage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const userId = session?.user?.id;

  const [meetings, setMeetings] = useState(null);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  // undefined = مقفول | null = فورم إضافة | object = فورم تعديل
  const [modalMeeting, setModalMeeting] = useState(undefined);
  const [busyId, setBusyId] = useState(null);
  // 🆕 الاجتماع اللي المستخدم داخل عليه دلوقتي (مضمّن جوه الموقع) — null = مفيش.
  const [joinedMeeting, setJoinedMeeting] = useState(null);
  // 🆕 tick بسيط كل 30 ثانية عشان شارة "شغالة دلوقتي/لسه هتبدأ/خلصت" تتحدث
  // لوحدها وهي الصفحة مفتوحة (getPhase بيحسب من Date.now() وقت الـ render،
  // فمن غيره الشارة كانت بتفضل واقفة على أول حالة لحد ما اليوزر يعمل أي
  // حاجة تسبب re-render).
  const [, forceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const loadMeetings = useCallback(() => {
    setError("");
    fetch("/api/meetings")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setMeetings(Array.isArray(data?.meetings) ? data.meetings : []))
      .catch(() => setError("حصل خطأ في تحميل المحاضرات، حاول تاني"));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadMeetings();
  }, [status, loadMeetings]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "teacher" && role !== "admin") return;
    // 🆕 محتاجينها بس لملء dropdown "اختر كورس" في فورم الإضافة — GET
    // /api/courses أصلاً بيرجّع كورسات المدرس نفسه (كل الحالات) أو كل
    // الكورسات لو أدمن (شوف app/api/courses/route.js GET).
    fetch("/api/courses?limit=100")
      .then((r) => r.json())
      .then((data) => setCourses(Array.isArray(data?.courses) ? data.courses : []))
      .catch(() => setCourses([]));
  }, [status, role]);

  async function handleDelete(meeting) {
    if (!confirm(`متأكد إنك عايز تحذف محاضرة "${meeting.title}"؟`)) return;
    setBusyId(meeting.id);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
    } catch {
      alert("حصل خطأ أثناء الحذف، حاول تاني");
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved() {
    setModalMeeting(undefined);
    loadMeetings();
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (status === "unauthenticated") return <Blocked />;

  const dashboardHref = role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";
  const canCreate = role === "teacher" || role === "admin";
  // أدمن يقدر يدير أي اجتماع (isOwnerOrAdmin في الـ API)، مدرس بس اجتماعاته هو.
  const canManage = (meeting) => role === "admin" || (role === "teacher" && meeting.teacher === userId);

  const grouped = { live: [], upcoming: [], ended: [] };
  (meetings || []).forEach((m) => grouped[getPhase(m)].push(m));
  grouped.ended.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href={dashboardHref}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 bg-white"
              title="الرجوع"
            >
              <ArrowRight size={18} />
            </Link>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Video className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">المحاضرات اللايف</h1>
              <p className="text-sm text-gray-400">اجتماعات فيديو الكورسات (Daily)</p>
            </div>
          </div>

          {canCreate && (
            <button
              onClick={() => setModalMeeting(null)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90"
            >
              <Plus size={18} /> محاضرة جديدة
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {meetings === null && !error ? (
          <div className="flex justify-center py-20">
            <Loader className="animate-spin text-blue-500" size={36} />
          </div>
        ) : meetings?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
            <Video className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">
              {role === "student" ? "مفيش محاضرات لايف مجدولة لكورساتك دلوقتي." : "لسه مفيش محاضرات مضافة."}
            </p>
          </div>
        ) : (
          <>
            <MeetingSection
              title="شغالة دلوقتي"
              meetings={grouped.live}
              canManage={canManage}
              showTeacher={role === "admin"}
              onEdit={setModalMeeting}
              onDelete={handleDelete}
              onJoinEmbedded={setJoinedMeeting}
              busyId={busyId}
              emptyText="مفيش محاضرة شغالة دلوقتي."
            />
            <MeetingSection
              title="قادمة"
              meetings={grouped.upcoming}
              canManage={canManage}
              showTeacher={role === "admin"}
              onEdit={setModalMeeting}
              onDelete={handleDelete}
              onJoinEmbedded={setJoinedMeeting}
              busyId={busyId}
              emptyText="مفيش محاضرات قادمة مجدولة."
            />
            {grouped.ended.length > 0 && (
              <MeetingSection
                title="خلصت"
                meetings={grouped.ended}
                canManage={canManage}
                showTeacher={role === "admin"}
                onEdit={setModalMeeting}
                onDelete={handleDelete}
                onJoinEmbedded={setJoinedMeeting}
                busyId={busyId}
                emptyText=""
              />
            )}
          </>
        )}
      </div>

      {modalMeeting !== undefined && (
        <MeetingFormModal
          meeting={modalMeeting}
          courses={courses}
          onClose={() => setModalMeeting(undefined)}
          onSaved={handleSaved}
        />
      )}

      {joinedMeeting && (
        <DailyMeetingModal
          meetingId={joinedMeeting.id}
          title={joinedMeeting.title}
          onClose={() => setJoinedMeeting(null)}
        />
      )}
    </div>
  );
}