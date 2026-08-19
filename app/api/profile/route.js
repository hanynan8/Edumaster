// app/api/profile/route.js
//
// 🆕 صفحة "الملف الشخصي" (الطالب بيدخلها من صورته/اسمه في الـ navbar).
//
//   - GET   → بيانات المستخدم الحالي (الاسم، الإيميل، الرقم، الصورة، الدور).
//             الإيميل بيترجع للعرض بس — مفيش endpoint لتغييره هنا (تغيير
//             الإيميل محتاج تدفق تحقق منفصل زي forgot-password، مش جزء من
//             التحديث ده عشان منفتحش ثغرة "غيّر إيميلك من غير أي تحقق").
//   - PATCH → تحديث name/phone/avatar بس. أي حقل تاني في الـ body (email,
//     role, password, membership...) بيتجاهل تمامًا — بنقرا الحقول
//     المسموحة صراحة من الـ body، مش بننسخه كله على المستخدم.
//
// 🔒 SECURITY: أي مستخدم مسجل دخول (student/teacher/admin) يقدر يعدّل
// بروفايله هو بس — مفيش userId بيتقرا من الـ body، دايمًا session.user.id.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { requireSession } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// نفس منطق التحقق من الإيميل المستخدم في /api/register — بنستخدمه هنا بس
// عشان نعرض للمستخدم إن إيميله الحالي بصيغة صحيحة (مفيش تعديل عليه).
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// رقم هاتف مرن (بيقبل + واختياريًا مسافات/شرطات) بين 7 و20 خانة — مش
// مربوط بصيغة دولة واحدة عشان المنصة ممكن يكون ليها طلاب من أكتر من بلد
// (شوف صفحة /countries في المشروع).
function isValidPhone(phone) {
  return /^\+?[0-9\s-]{7,20}$/.test(phone);
}

// 🔒 لازم رابط الصورة يكون من نطاقاتنا المعروفة بس (Bunny CDN اللي بيرجعه
// /api/upload/file، أو placeholder افتراضي) — مش أي URL عشوائي من الـ
// client، منعًا لاستخدام الحقل ده لتخزين/عرض روابط خارجية غير موثوقة.
function isAllowedAvatarUrl(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return /(^|\.)b-cdn\.net$/i.test(u.hostname) || u.hostname === "placehold.co";
  } catch {
    return false;
  }
}

function serializeUser(u) {
  return {
    name: u.name || "",
    email: u.email || "",
    phone: u.phone || "",
    avatar: resolveSecureStoredUrl(u.profile?.avatar) || null,
    role: u.role,
  };
}

export async function GET() {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findById(auth.session.user.id, "name email phone role profile.avatar").lean();
    if (!user) return jsonResponse({ error: "not_found" }, 404);

    return jsonResponse({ user: serializeUser(user) });
  } catch (err) {
    console.error("[/api/profile] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY: تحديث البروفايل مش عملية حساسة زي الرفع، لكن برضو
    // بنحطلها حد معقول (10 محاولات/دقيقة) عشان تمنع أي loop غلط في الـ
    // frontend من إغراق الداتابيز بكتابة متكررة.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "profile:update",
      limit: 10,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "invalid_body" }, 400);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findById(session.user.id);
    if (!user) return jsonResponse({ error: "not_found" }, 404);

    // ─── الاسم (اختياري في الـ body، لو موجود لازم يعدي التحقق) ───
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2 || name.length > 60) {
        return jsonResponse({ error: "invalid_name", message: "الاسم لازم يكون بين 2 و60 حرف" }, 400);
      }
      user.name = name;
    }

    // ─── رقم الهاتف (اختياري تمامًا — ممكن يتمسح بإرسال string فاضية) ───
    if (body.phone !== undefined) {
      const phone = String(body.phone).trim();
      if (phone === "") {
        user.phone = "";
      } else if (!isValidPhone(phone)) {
        return jsonResponse({ error: "invalid_phone", message: "رقم الهاتف مش بصيغة صحيحة" }, 400);
      } else {
        user.phone = phone;
      }
    }

    // ─── صورة البروفايل (لازم تكون رابط من /api/upload/file بالفعل) ───
    if (body.avatar !== undefined) {
      if (body.avatar === null || body.avatar === "") {
        user.profile = { ...(user.profile || {}), avatar: null };
      } else if (!isAllowedAvatarUrl(body.avatar)) {
        return jsonResponse({ error: "invalid_avatar_url" }, 400);
      } else {
        user.profile = { ...(user.profile || {}), avatar: body.avatar };
      }
    }

    await user.save();

    return jsonResponse({ user: serializeUser(user) });
  } catch (err) {
    console.error("[/api/profile] PATCH error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}