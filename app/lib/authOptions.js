// app/lib/authOptions.js
// إعدادات NextAuth. الـ role بييجي حصريًا من حقل "role" في الداتابيز —
// مفيش أي fallback بإيميل خالص. أول admin بيتحدد يدويًا عن طريق
// scripts/make-admin.js، وبعد كده أي ترقية بتتم من لوحة الأدمن (role-gated).
//
// 🔒 SECURITY (هذا الملف يحتوي على 3 تحصينات أساسية):
//  1) Rate limiting على تسجيل الدخول: حماية على مستوى IP (Redis/ذاكرة عبر
//     lib/rateLimit.js) + قفل الحساب نفسه بعد محاولات فاشلة متكررة
//     (loginFailedAttempts/loginLockedUntil في الداتابيز).
//  2) MFA (TOTP) إجباري لأي حساب role === "admin" فعّل الخاصية من لوحة
//     الأدمن (شوف app/api/admin/mfa/*).
//  3) إبطال الـ JWT session فورًا عند تغيير الباسورد أو الـ role عن طريق
//     tokenVersion (شوف callbacks.jwt/session تحت).

import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { checkRateLimit } from "@/app/lib/rateLimit";

function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

// req في next-auth v4 مش دايمًا كائن Headers قياسي، فبنتعامل مع الحالتين.
function extractClientIp(req) {
  try {
    const headers = req?.headers;
    if (!headers) return "unknown";
    const forwarded =
      typeof headers.get === "function" ? headers.get("x-forwarded-for") : headers["x-forwarded-for"];
    if (forwarded) return String(forwarded).split(",")[0].trim();
    const real = typeof headers.get === "function" ? headers.get("x-real-ip") : headers["x-real-ip"];
    return real || "unknown";
  } catch {
    return "unknown";
  }
}

// 🔒 SECURITY: نافذة قفل الحساب — 5 محاولات فاشلة خلال 15 دقيقة تؤدي لقفل
// الحساب 15 دقيقة. منفصل عن rate limit الـ IP اللي بيغطي هجوم موزّع على
// حسابات كتير من نفس المصدر.
const ACCOUNT_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_MAX_ATTEMPTS = 5;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;

function ensureLoginWindow(userDoc) {
  const now = Date.now();
  const first = userDoc.loginFirstFailedAt ? new Date(userDoc.loginFirstFailedAt).getTime() : null;
  if (!first || now - first > ACCOUNT_ATTEMPT_WINDOW_MS) {
    userDoc.loginFirstFailedAt = new Date(now);
    userDoc.loginFailedAttempts = 0;
  }
}

function isAccountLocked(userDoc) {
  return !!(userDoc.loginLockedUntil && new Date(userDoc.loginLockedUntil) > new Date());
}

// كام ثانية باقية على فك القفل — بتتحسب من loginLockedUntil نفسه، مش من
// ACCOUNT_LOCK_MS الثابتة، عشان تعكس الوقت الفعلي المتبقي بالظبط.
function lockRemainingSeconds(userDoc) {
  if (!userDoc.loginLockedUntil) return 0;
  const ms = new Date(userDoc.loginLockedUntil).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / 1000));
}

// 🔒 SECURITY: بترجع معلومات كافية بس (مش أي تفاصيل حساسة زي الباسورد أو
// الـ IP) عشان الـ UI يقدر يعرض للمستخدم الشرعي كام محاولة باقيتله قبل
// القفل. ⚠️ ملحوظة: عرض "عدد المحاولات المتبقية" بيتم بس لحسابات موجودة
// فعليًا (بعد ما لقينا userDoc) — ده بيسرّب معلومة بسيطة (إن الاسم/الإيميل
// ده حساب حقيقي) لمهاجم بيجرب أسماء عشوائية، مقارنة بالرسالة العامة اللي
// بتظهر لو الحساب مش موجود أصلاً. قبلناها كـ tradeoff واضح (بنفس المنطق
// المتبع في forgot-password) عشان تجربة المستخدم الحقيقي تبقى مفيدة.
async function registerFailedAttempt(userDoc) {
  ensureLoginWindow(userDoc);
  userDoc.loginFailedAttempts = (userDoc.loginFailedAttempts || 0) + 1;

  const justLocked = userDoc.loginFailedAttempts >= ACCOUNT_MAX_ATTEMPTS;
  if (justLocked) {
    userDoc.loginLockedUntil = new Date(Date.now() + ACCOUNT_LOCK_MS);
  }
  await userDoc.save();

  return {
    locked: justLocked,
    remaining: Math.max(0, ACCOUNT_MAX_ATTEMPTS - userDoc.loginFailedAttempts),
    lockSeconds: Math.ceil(ACCOUNT_LOCK_MS / 1000),
  };
}

function clearLoginLock(userDoc) {
  userDoc.loginFailedAttempts = 0;
  userDoc.loginFirstFailedAt = null;
  userDoc.loginLockedUntil = null;
}

// 🔒 SECURITY: التحقق من كود TOTP بتاع الأدمن. window: 1 بيسمح بفارق ±30
// ثانية بسيط لفروق الساعة بين السيرفر والموبايل، من غير ما يوسّع نافذة
// التخمين بشكل خطير.
function verifyTotpCode(base32Secret, code) {
  if (!base32Secret || !code) return false;
  try {
    const totp = new TOTP({
      secret: Secret.fromBase32(base32Secret),
      digits: 6,
      period: 30,
      algorithm: "SHA1",
    });
    const delta = totp.validate({ token: String(code).trim(), window: 1 });
    return delta !== null;
  } catch (err) {
    console.error("TOTP verification error:", err);
    return false;
  }
}

async function verifyBackupCode(userDoc, code) {
  if (!code || !Array.isArray(userDoc.mfaBackupCodeHashes) || userDoc.mfaBackupCodeHashes.length === 0) {
    return false;
  }
  const normalized = String(code).trim();
  for (let i = 0; i < userDoc.mfaBackupCodeHashes.length; i++) {
    const match = await bcrypt.compare(normalized, userDoc.mfaBackupCodeHashes[i]);
    if (match) {
      // 🔒 SECURITY: الكود الاحتياطي يُستهلك بعد الاستخدام مرة واحدة (one-time use)
      userDoc.mfaBackupCodeHashes.splice(i, 1);
      return true;
    }
  }
  return false;
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        nameOrEmail: { label: "Name or Email", type: "text" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" },
      },

      async authorize(credentials, req) {
        if (!credentials?.nameOrEmail || !credentials?.password) return null;

        const ip = extractClientIp(req);

        // 🔒 SECURITY: rate limit عام على مستوى الـ IP — أول خط دفاع، بيتفحص
        // قبل أي استعلام للداتابيز عشان يوقف هجوم credential-stuffing بسرعة
        // ويقلل الحمل على الداتابيز. 20 محاولة كل 15 دقيقة لكل IP.
        const ipCheck = await checkRateLimit(`login:ip:${ip}`, {
          limit: 20,
          windowSeconds: 15 * 60,
        });
        if (!ipCheck.allowed) {
          // 🔒 SECURITY: بنبعت للـ UI بس عدد الثواني الباقية — مش أي تفاصيل
          // تانية زي الـ IP نفسه أو عدد المحاولات الفعلي على مستوى الشبكة.
          throw new Error(`rate_limited:${ipCheck.retryAfterSeconds}`);
        }

        try {
          await connectToMongo();
          const AuthModel = getAuthModel();

          const identifier = credentials.nameOrEmail.toLowerCase().trim();

          // مش .lean() هنا عن قصد — محتاجين .save() لو لقينا حساب قديم
          // بباسورد plain text عشان نشفّره فورًا (self-healing migration)،
          // وكمان عشان نحدّث عدّادات القفل.
          const users = await AuthModel.find({});
          const userDoc = users.find(
            (u) =>
              u.name?.toLowerCase().trim() === identifier ||
              u.email?.toLowerCase().trim() === identifier
          );

          if (!userDoc) return null;

          // 🔒 SECURITY: الحساب موقوف يدويًا من الأدمن (status === "suspended")
          // — نرفض فورًا من غير ما نتحقق من الباسورد، وبدون كشف تفاصيل زيادة
          // (مش هنقول "موقوف ليه" هنا، ده يظهر للمستخدم عن طريق دعم العملاء
          // مش رسالة الخطأ). منفصل تمامًا عن قفل المحاولات الفاشلة تحت.
          if (userDoc.status === "suspended") {
            throw new Error("account_suspended");
          }

          // 🔒 SECURITY: الحساب مقفول مؤقتًا بسبب محاولات فاشلة كتير — نرفض
          // من غير ما نتحقق من الباسورد أصلاً (يمنع استمرار التخمين وقت القفل).
          if (isAccountLocked(userDoc)) {
            throw new Error(`account_locked:${lockRemainingSeconds(userDoc)}`);
          }

          const storedPassword = userDoc.password || "";
          let valid = false;

          if (isBcryptHash(storedPassword)) {
            valid = await bcrypt.compare(credentials.password, storedPassword);
          } else {
            valid = storedPassword === credentials.password;
            if (valid) {
              userDoc.password = await bcrypt.hash(credentials.password, 12);
            }
          }

          if (!valid) {
            const attempt = await registerFailedAttempt(userDoc);
            if (attempt.locked) {
              throw new Error(`account_locked:${attempt.lockSeconds}`);
            }
            throw new Error(`invalid_credentials:${attempt.remaining}`);
          }

          // 🔒 SECURITY: الـ role حصريًا من الداتابيز. مفيش أي مقارنة إيميل هنا خالص —
          // لو الحقل مش موجود، المستخدم "student" افتراضيًا، ونقطة.
          const role = userDoc.role || "student";

          // 🔒 SECURITY: MFA إجباري لأي حساب admin فعّل الخاصية. الباسورد
          // كان صح، لكن مش هنسمح بالدخول من غير كود صحيح.
          if (role === "admin" && userDoc.mfaEnabled) {
            const code = credentials.mfaCode ? String(credentials.mfaCode).trim() : "";

            if (!code) {
              // الباسورد صح لكن محتاجين كود — منعتبروش محاولة فاشلة على
              // الباسورد نفسه، لكن نفضل جوه نفس rate limit بتاع الـ IP.
              throw new Error("mfa_required");
            }

            const totpValid = verifyTotpCode(userDoc.mfaSecret, code);
            const backupValid = !totpValid && (await verifyBackupCode(userDoc, code));

            if (!totpValid && !backupValid) {
              const attempt = await registerFailedAttempt(userDoc);
              if (attempt.locked) {
                throw new Error(`account_locked:${attempt.lockSeconds}`);
              }
              throw new Error(`mfa_invalid:${attempt.remaining}`);
            }

            if (backupValid) {
              await userDoc.save(); // نحفظ استهلاك الكود الاحتياطي
            }
          }

          // ✅ نجح الدخول فعليًا — نصفّر عدّاد القفل ونحفظ أي تعديلات معلّقة
          // (تشفير الباسورد القديم، استهلاك كود احتياطي، إلخ) في save واحدة.
          clearLoginLock(userDoc);
          await userDoc.save();

          return {
            id: userDoc._id?.toString(),
            name: userDoc.name || null,
            email: userDoc.email || null,
            phone: userDoc.phone || null,
            address: userDoc.address || null,
            paymentMethod: userDoc.paymentMethod || "cash",
            role,
            tokenVersion: userDoc.tokenVersion || 0,
          };
        } catch (error) {
          // 🔒 SECURITY: الأخطاء المتعمّدة (rate_limited:N / account_locked:N /
          // invalid_credentials:N / mfa_required / mfa_invalid:N) لازم تتنشر
          // للعميل زي ما هي عشان الواجهة تتصرف صح وتعرض عدد المحاولات/الوقت
          // المتبقي. الفحص هنا بـ startsWith لأن الرسايل بقت شايلة قيمة رقمية
          // بعد ":" (مثال: "invalid_credentials:3").
          const KNOWN_ERROR_PREFIXES = [
            "rate_limited:",
            "account_locked:",
            "account_suspended",
            "invalid_credentials:",
            "mfa_required",
            "mfa_invalid:",
          ];
          if (
            typeof error?.message === "string" &&
            KNOWN_ERROR_PREFIXES.some((prefix) => error.message.startsWith(prefix))
          ) {
            throw error;
          }
          console.error("Auth Error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,

  pages: {
    signIn: "/",
    error: "/",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.phone = user.phone;
        token.address = user.address;
        token.paymentMethod = user.paymentMethod;
        token.role = user.role;
        token.tokenVersion = user.tokenVersion ?? 0;
        token.lastValidated = Date.now();
        token.invalid = false;
        return token;
      }

      // 🔒 SECURITY: إبطال الجلسة عند تغيير الباسورد أو الـ role — بدل ما
      // نستنى انتهاء الـ 7 أيام بتاعة الـ JWT. بنقارن tokenVersion المخزّن
      // في التوكن مع القيمة الحالية في الداتابيز. لتقليل الحمل على
      // الداتابيز بنعمل الفحص ده مرة كل 60 ثانية بس (throttled)، مش على كل
      // request — يعني أقصى نافذة تعرّض لجلسة مسروقة بعد تغيير الباسورد
      // بقت ~60 ثانية بدل 7 أيام.
      const now = Date.now();
      const shouldRevalidate = !token.lastValidated || now - token.lastValidated > 60 * 1000;

      if (shouldRevalidate && token.id) {
        try {
          await connectToMongo();
          const AuthModel = getAuthModel();
          const dbUser = await AuthModel.findById(token.id, "tokenVersion role status").lean();

          // 🔒 SECURITY: لو الأدمن أوقف الحساب وهو شغّال بجلسة مفتوحة فعلاً،
          // بنبطّل الجلسة هنا كمان (مش بس وقت تسجيل دخول جديد) — أقصى نافذة
          // تعرّض بعد الإيقاف تبقى ~60 ثانية زي باقي حالات إبطال الجلسة.
          if (!dbUser || dbUser.status === "suspended" || (dbUser.tokenVersion ?? 0) !== (token.tokenVersion ?? 0)) {
            token.invalid = true;
          } else {
            token.invalid = false;
            token.role = dbUser.role || token.role; // تغيير الـ role ينعكس فورًا كمان
            token.lastValidated = now;
          }
        } catch (err) {
          // 🔒 SECURITY: عطل مؤقت في الاتصال بالداتابيز مايسجّلش خروج كل
          // المستخدمين فجأة (fail-open على الأعطال العابرة)، لكن يتسجل.
          console.error("[authOptions] JWT revalidation error:", err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      // 🔒 SECURITY: الجلسة اتبطلت (تغيير باسورد/role أو حذف الحساب) —
      // برجع null عشان useSession/getServerSession يعتبروا المستخدم
      // مسجّل خروج فورًا.
      if (token?.invalid) {
        return null;
      }

      if (token && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.phone = token.phone;
        session.user.address = token.address;
        session.user.paymentMethod = token.paymentMethod;
        session.user.role = token.role;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },

  debug: process.env.NODE_ENV === "development",
};