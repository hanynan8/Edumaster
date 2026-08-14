// app/lib/cloudinary.js
//
// قرار اليوم 9: الفيديوهات والملفات الكبيرة (PDF) بتتخزن على Cloudinary، مش
// جوه MongoDB ولا بتعدي على سيرفر Next.js نفسه. السبب: فيديوهات الكورسات
// ممكن توصل لمئات الـ MB، ورفعها على سيرفرنا هيستهلك RAM/bandwidth وهيصطدم
// بحدود body size بتاعة Vercel/Next API routes (عادة 4-5MB للـ serverless
// functions).
//
// الحل: "Signed direct upload" — الـ client (متصفح المدرس) بيرفع الملف
// *مباشرة* لـ Cloudinary من غير ما يعدي على سيرفرنا خالص. السيرفر دوره الوحيد
// إنه يولّد "توقيع" (signature) صالح لمدة قصيرة، عشان نضمن إن اللي بيرفع
// فعلاً مدرس/أدمن مسجل دخول (requireRole في route التوقيع)، ومنمنعش أي حد
// يرفع أي حاجة بأي اسم فولدر يحب من غير تحقق.
//
// env vars مطلوبة (.env.local):
//   CLOUDINARY_CLOUD_NAME=
//   CLOUDINARY_API_KEY=
//   CLOUDINARY_API_SECRET=

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * بيولّد التوقيع اللي الـ client هيبعته مع رفع الملف مباشرة لـ Cloudinary.
 * 🔒 SECURITY: بنوقّع بس على القيم اللي احنا حددناها هنا (folder + timestamp
 * + أي قيود زودناها)، مش على أي حاجة الـ client بيبعتها — فمينفعش حد يغيّر
 * الفولدر أو يتحايل على القيود بعد ما ياخد التوقيع.
 *
 * @param {object} params
 * @param {string} params.folder - مسار الفولدر جوه Cloudinary، مثلاً
 *   "edumaster/courses/<courseId>/videos"
 * @param {object} [params.extraParams] - باراميترات إضافية تتوقّع (نادر الاستخدام)
 */
export function generateUploadSignature({ folder, extraParams = {} }) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder, ...extraParams };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    ...extraParams,
  };
}

export default cloudinary;