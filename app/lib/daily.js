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
      privacy: "public",
      properties: {
        nbf,
        exp,
        eject_at_room_exp: true,
        enable_chat: true,
        enable_screenshare: true,
        enable_knocking: false,
        start_video_off: false,
        start_audio_off: false,
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