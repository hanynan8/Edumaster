// app/lib/daily.js
//
// 🆕 تكامل Daily.co — إنشاء غرف اجتماعات فيديو تلقائيًا لكل محاضرة لايف،
// بديل تكامل Microsoft Teams / Microsoft Graph القديم (شوف app/lib/models/
// Meeting.js للسياق الكامل عن مصادر رابط الاجتماع).
//
// 🔄 الفرق الجوهري عن التكامل القديم: Daily شغال بمفتاح API واحد بتاع
// المنصة كلها (DAILY_API_KEY)، مفيش OAuth ولا "ربط حساب" لكل مدرس على
// حدة — أي مدرس يقدر يستخدم إنشاء الاجتماع التلقائي على طول من غير أي
// إعداد إضافي من ناحيته. ده بيلغي الحاجة لكل مكوّنات Microsoft القديمة:
// MicrosoftAccount model، microsoftGraph.js، وapp/api/integrations/microsoft/*
// (connect/callback/disconnect/status) بالكامل.
//
// env vars مطلوبة (.env.local):
//   DAILY_API_KEY=      مفتاح الـ API بتاع حساب Daily.co بتاع المنصة —
//                        من Daily Dashboard → Developers → API keys.
//
// 📋 خطوات الإعداد (مرة واحدة بس، من حساب أدمن المنصة):
//   1) https://dashboard.daily.co → سجّل/ادخل على حساب المنصة.
//   2) Developers → API keys → Create/Copy key → ده DAILY_API_KEY.
//   3) خلاص — مفيش redirect URIs ولا app registration ولا صلاحيات
//      تُمنح لكل مدرس؛ المفتاح ده كافي لإنشاء/حذف الغرف نيابة عن أي
//      مدرس في المنصة.

const DAILY_BASE = "https://api.daily.co/v1";

export function isDailyConfigured() {
  return Boolean(process.env.DAILY_API_KEY);
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * بينشئ غرفة Daily فعلية لمحاضرة معيّنة، ويرجّع رابط الانضمام (url) الجاهز
 * يتخزن في Meeting.link — بالظبط زي الرابط اللي كان المدرس بيلزقه يدويًا،
 * بس متولّد تلقائيًا ومتكامل بالكامل مع المنصة (بدون أي OAuth).
 *
 * - nbf (not-before): الغرفة تُفتح للدخول قبل المعاد بربع ساعة، عشان
 *   المدرس/الطلاب يقدروا يدخلوا بدري شوية.
 * - exp (expiry): الغرفة بتتقفل تلقائيًا بعد نهاية المحاضرة بساعتين
 *   هامش أمان، فمش محتاجين نمسحها يدويًا في السيناريو العادي.
 */
export async function createDailyRoom({ startDate, endDate }) {
  const nbf = Math.floor(startDate.getTime() / 1000) - 15 * 60;
  const exp = Math.floor(endDate.getTime() / 1000) + 2 * 60 * 60;

  const res = await fetch(`${DAILY_BASE}/rooms`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      // 🔒 SECURITY: "private" بدل "public" — الدخول للغرفة بقى محتاج meeting
      // token صالح (شوف createMeetingToken تحت) بدل ما يكفي مجرد معرفة
      // الرابط. قبل كده أي حد يجيله الرابط (حتى لو مش مسجل دخول أصلًا،
      // أو مش طالب في الكورس) كان يقدر يدخل الاجتماع مباشرة — الفحص بتاعنا
      // كان بيمنع الرابط يظهر في الواجهة بس، مش بيمنع الدخول الفعلي لو
      // الرابط اتسرّب أو اتبعت في جروب واتساب مثلاً.
      privacy: "private",
      properties: {
        nbf,
        exp,
        eject_at_room_exp: true,
        enable_chat: true,
        enable_screenshare: true,
        enable_knocking: false,
        // 🎓 مظبوطة على سيناريو "فصل دراسي" (مدرس + عدد متوسط/كبير من
        // الطلاب، مش مكالمة 1:1) — كل مشارك بيدخل بكاميرا/مايك مقفولين
        // افتراضيًا ويفتحهم بنفسه لو حابب. ده اللي بيخلي المحاضرة تفضل
        // سلسة مع 20-100+ طالب: مفيش استهلاك باندويدث/CPU لعرض عشرات
        // الكاميرات الشغالة من غير داعي، ومفيش فوضى صوتية وقت الدخول.
        // المدرس بيفتح كاميرته/مايكه بضغطة واحدة من شريط الأدوات وقت ما يدخل.
        start_video_off: true,
        start_audio_off: true,
        // مفيش prejoin screen زيادة — التحقق من صلاحية الدخول بيحصل عندنا
        // (route التوكن) قبل ما نوصل للغرفة أصلًا، فمش محتاجين شاشة انتظار
        // إضافية من Daily نفسها.
        enable_prejoin_ui: false,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error || data?.info || `HTTP ${res.status}`;
    throw new Error(`daily_create_room_error: ${reason}`);
  }
  return {
    joinUrl: data.url,
    roomName: data.name,
  };
}

/**
 * بيحدّث nbf/exp لغرفة Daily موجودة — بينده وقت ما المدرس يعدّل معاد أو
 * مدة اجتماع كان اتعمل قبل كده عن طريق createDailyRoom، عشان الغرفة متفضلش
 * حابسة على المعاد القديم (لو ماناديناش دي، تعديل المعاد في الداتابيز بس
 * مش هيغيّر حاجة في Daily نفسها، والغرفة هتفضل ترفض الدخول لحد المعاد
 * الأصلي القديم رغم إن الواجهة بتوري المعاد الجديد).
 */
export async function updateDailyRoom(roomName, { startDate, endDate }) {
  const nbf = Math.floor(startDate.getTime() / 1000) - 15 * 60;
  const exp = Math.floor(endDate.getTime() / 1000) + 2 * 60 * 60;

  const res = await fetch(`${DAILY_BASE}/rooms/${encodeURIComponent(roomName)}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ properties: { nbf, exp } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error || data?.info || `HTTP ${res.status}`;
    throw new Error(`daily_update_room_error: ${reason}`);
  }
  return { joinUrl: data.url, roomName: data.name };
}

/**
 * بيولّد meeting token قصير العمر لشخص معيّن يدخل بيه غرفة private —
 * لازم بعد ما privacy بقت "private" فوق، وإلا الدخول هيترفض (401) حتى لو
 * الرابط صحيح. الفحص الحقيقي لصلاحية الدخول (enrollment/ownership) بيحصل
 * *قبل* ما ننادي الدالة دي، جوه route التوكن نفسه (شوف
 * app/api/meetings/[id]/token/route.js) — التوكن هنا مجرد "تذكرة دخول"
 * بعد ما اتأكدنا إن صاحبه مسموحله فعلًا.
 *
 * - isOwner=true: صلاحيات المدرس في الـ Prebuilt UI (يقدر يكتم/يطرد
 *   مشاركين، يبدأ تسجيل، ...). بتتحدد من isOwnerOrAdmin في السيرفر، مش من
 *   أي حاجة الفرونت إند بيبعتها.
 * - nbf/exp بيتحسبوا بنفس هامش الغرفة نفسها (ربع ساعة قبل/ساعتين بعد)
 *   عشان التوكن ميرفضش الدخول قبل ما الغرفة نفسها تفتح.
 * - enableRecording متاحة بس للمدرس/الأدمن، مش لأي طالب.
 */
export async function createMeetingToken({
  roomName,
  userId,
  userName,
  isOwner,
  startDate,
  endDate,
}) {
  const nbf = Math.floor(startDate.getTime() / 1000) - 15 * 60;
  const exp = Math.floor(endDate.getTime() / 1000) + 2 * 60 * 60;

  const res = await fetch(`${DAILY_BASE}/meeting-tokens`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: String(userId),
        user_name: userName || (isOwner ? "المدرس" : "طالب"),
        is_owner: Boolean(isOwner),
        nbf,
        exp,
        start_video_off: true,
        start_audio_off: true,
        // 🆕 كانت "local" — التسجيل بيتحفظ على جهاز المدرس بس ومحدش تاني
        // يقدر يوصله (مفيش API يرجّعه). "cloud" بيخلّي Daily تسجّل وترفع
        // الفيديو على سيرفرها هي، وتبعتلنا webhook (recording.ready-to-
        // download) لما يخلص عشان نربطه بالمحاضرة ونعرضه للطلاب بعدين
        // (شوف app/api/webhooks/daily/route.js + Meeting.recordings).
        enable_recording: isOwner ? "cloud" : undefined,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error || data?.info || `HTTP ${res.status}`;
    throw new Error(`daily_create_token_error: ${reason}`);
  }
  return data.token;
}

/**
 * 🆕 عدد الحاضرين الفعليين دلوقتي في غرفة معيّنة، عن طريق presence API
 * بتاعة Daily — بيستخدم لتصحيح حالة "خلصت" في واجهة الطالب لو المدرس مدّ
 * المحاضرة فعليًا أكتر من durationMinutes المكتوبة (شوف
 * app/api/meetings/[id]/presence/route.js). best-effort: أي خطأ (مشكلة
 * شبكة، الغرفة اتمسحت...) بيرجع 0 بدل ما يكسر الصفحة.
 */
export async function getDailyRoomPresence(roomName) {
  if (!roomName) return { count: 0 };
  try {
    const res = await fetch(`${DAILY_BASE}/rooms/${encodeURIComponent(roomName)}/presence`, {
      headers: authHeaders(),
    });
    if (!res.ok) return { count: 0 };
    const data = await res.json().catch(() => ({}));
    return { count: Number(data?.total_count) || 0 };
  } catch (err) {
    console.error(`[daily] getDailyRoomPresence(${roomName}) failed:`, err);
    return { count: 0 };
  }
}

/**
 * 🆕 بيولّد رابط تحميل/تشغيل مؤقت (access-link) لتسجيل معيّن عن طريق الـ
 * recording ID المخزّن في Meeting.recordings — الرابط ده بينتهي بعد فترة
 * قصيرة من Daily نفسها، فبنولّده وقت الطلب (لما الطالب يدوس "شاهد
 * التسجيل") بدل ما نخزّنه جاهز في الداتابيز.
 */
export async function getDailyRecordingAccessLink(recordingId) {
  const res = await fetch(`${DAILY_BASE}/recordings/${encodeURIComponent(recordingId)}/access-link`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error || data?.info || `HTTP ${res.status}`;
    throw new Error(`daily_recording_link_error: ${reason}`);
  }
  return data.download_link;
}

/**
 * بيمسح غرفة Daily — best-effort، بينده وقت حذف المحاضرة أو استبدال
 * رابطها بلينك يدوي. فشل الحذف مايوقفش أي عملية تانية (الغرفة أصلًا
 * هتتقفل لوحدها بعد exp حتى لو الحذف اليدوي فشل).
 */
export async function deleteDailyRoom(roomName) {
  if (!roomName) return;
  try {
    const res = await fetch(`${DAILY_BASE}/rooms/${encodeURIComponent(roomName)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      console.error(`[daily] deleteDailyRoom(${roomName}) failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[daily] deleteDailyRoom(${roomName}) failed:`, err);
  }
}