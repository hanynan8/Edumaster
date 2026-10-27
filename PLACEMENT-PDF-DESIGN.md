# رفع التيستات من PDF ثابت + أماكن الأوديو (✅ اتنفّذ — الشرح الكامل في README-PLACEMENT-PDF-AR.md)

## الصيغة (سطر لكل كلمة مفتاحية)
TEST: b2 | LEVEL: B2 | TITLE: ... | LANGUAGE: es (اختياري) | THRESHOLDS: 40,60,80 (اختياري)
PART: Comprensión de lectura | 45
TASK: Tarea 1. Mensajes breves
INSTRUCTIONS: ...          PASSAGE: ...          BANK: (A) ... B) ...) للربط
Q: نص السؤال   CONTEXT: ...   a) b) c) ...   ANSWER: b
[AUDIO] أو [AUDIO 3] أو [AUDIO: اسم]  + SCRIPT: نص التسجيل (للأدمن بس)
# سطر تعليق بيتتجاهل

## قاعدة الأوديو
العلامة [AUDIO] تغطي الأسئلة اللي بعدها لحد العلامة التالية أو نهاية الـ TASK.
- تحت TASK قبل أول سؤال (وعلامة واحدة) = أوديو للمهمة كلها.
- جوه السؤال = أوديو للسؤال ده وللي بعده.
- بعد PART وقبل أول TASK = أوديو للجزء كله.
- أرقام الخانات أوتوماتيك بالترتيب، أو يدوي [AUDIO 5] عشان لما تضيف مكان جديد الأوديو المرفوع ما يتلخبطش.
بعد الحفظ: رفع الملفات بيتم من "Audio & results" بنفس النظام الحالي.

## الشغل المطلوب
1) placementTestPdfParser.js (pdf-parse موجود في المشروع)  2) دعم .pdf في import/route.js
3) قالب PDF/TXT للتحميل  4) تعديل واجهة customPlacementTestsManager.jsx
5) اختبارات jest + round-trip على A2/B1  6) ملف شرح بالعربي
