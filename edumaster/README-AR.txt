تأكيد الإيميل عند التسجيل (Email verification)
==============================================

ملفات جديدة (انسخها في المشروع):
  app/api/register/verify/route.js
  app/api/register/resend/route.js
  app/lib/registrationHelpers.js
  app/lib/models/PendingRegistration.js

ملفات معدّلة (استبدل القديم):
  app/api/register/route.js
  app/lib/models/index.js
  app/components/auth/LoginRegisterForm.jsx

الحدود:
  - 5 أكواد كحد أقصى في اليوم لكل إيميل ولكل IP (الإرسال الأول وإعادة الإرسال بيتحسبوا سوا)
  - فاصل 60 ثانية بين كل إرسالين
  - الكود صالح 15 دقيقة، و5 محاولات تخمين لكل كود
  - الواجهة بتعرض الحد والمتبقي للمستخدم

متطلبات البيئة (.env):
  RESEND_API_KEY      -> لازم يكون متظبط في production
  RESEND_FROM_EMAIL   -> إيميل من دومين متفعّل في Resend
  UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN -> موصى بيه بشدة: الحد اليومي بيتخزن في Redis،
     ومن غيره بيشتغل في ذاكرة السيرفر بس (مش دقيق على Vercel/serverless)

ملحوظات:
  - الحسابات القديمة ما اتأثرتش، تسجيل الدخول زي ما هو.
  - المشروع مفيهوش مكتبات جديدة.
