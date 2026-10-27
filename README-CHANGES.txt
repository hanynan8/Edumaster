تعديلات Edumaster
=================

الطريقة 1 (الأسهل): فك الـ zip فوق فولدر المشروع واستبدل الملفات (الهيكل مطابق للمشروع).
الطريقة 2: من جوه المشروع:  git am all-changes.patch

----------------------------------------------------------------
1) الموديريتر يقدر يحوّل كورس منشور (published) إلى مؤرشف (archived)
----------------------------------------------------------------
  app/api/courses/[id]/route.js             -> الأدمن والموديريتر يقدروا يأرشفوا أي كورس حتى لو منشور/فيه طلاب (المدرّس لسه ممنوع: cannot_archive)
  app/teacher/components/CourseFormModal.jsx -> زرار "أرشفة فقط" ظاهر للموديريتر + تأكيد قبل الأرشفة
  app/teacher/components/CourseCard.jsx      -> زرار أرشفة سريع على الكارت (للموديريتر)
  app/teacher/page.jsx                       -> handleArchive + رسائل (ar/en/es)
  app/lib/courseArchiveRoute.test.js         -> اختبارات

----------------------------------------------------------------
2) نوع درس جديد: Audio (جنب الفيديو والنص والـ PDF)
----------------------------------------------------------------
  app/lib/models/Lesson.js                       -> type جديد "audio" (الرابط بيتخزن في fileUrl)
  app/lib/lessonAudio.js                         -> (جديد) تحقق من رابط الأوديو (Bunny Storage بتاعنا بس + شيل توكن التوقيع)
  app/api/sections/[id]/lessons/route.js         -> إنشاء درس audio
  app/api/lessons/[id]/route.js                  -> تعديل درس audio
  app/teacher/components/LessonFormModal.jsx     -> اختيار "صوت" + رفع الملف + المدة تلقائي
  app/teacher/components/MediaUploader.jsx       -> قراءة مدة الملف الصوتي قبل الرفع
  app/teacher/components/CourseTree.jsx          -> أيقونة سماعة + المدة
  app/admin/components/coursesReviewPanel.jsx    -> أيقونة سماعة + المدة
  app/(pages)/courses/[id]/page.jsx              -> مشغّل <audio> للطالب، والتقدّم بيتسجل لما الملف يخلص
  app/lib/lessonAudio.test.js                    -> اختبارات (14)

ملاحظات:
  - مفيش migration ولا مكتبات جديدة. الدروس القديمة ما اتأثرتش.
  - رفع الأوديو بيستخدم نفس إعدادات Bunny Storage الموجودة (BUNNY_STORAGE_* في .env).
  - الحد الأقصى لحجم الملف الصوتي 50MB (نفس حد أوديو الواجبات). على Vercel حد الـ body أقل (~4.5MB) لأن الرفع بيعدي على السيرفر.
