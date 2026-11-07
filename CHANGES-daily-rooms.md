# حل نهائي لمشكلة "المدرس في غرفة والطلاب في غرفة تانية" (Daily)

## السبب (حصة Nivel A2.2 يوم 6/11)
غرفة الحصة اتعملت من جديد الساعة 17:26:16Z (بعد البداية بـ 26 دقيقة) وكُتبت فوق القديمة في الداتابيز (self-heal).
اللي كان جوه الغرفة القديمة فضل فيها، واللي دخل بعد كده راح للجديدة. كمان لاحظنا دومينين مختلفين
(`edumaster.daily.co` و`edumaster365.daily.co`) في نفس السلسلة = حسابين/مفتاحين لـ Daily على نفس الداتابيز.

## الحل
1. **اسم غرفة ثابت لكل محاضرة**: `edu-<_id>` (`roomNameForMeeting`). الغرفة لو اتمسحت بتتعمل بنفس الاسم = نفس الرابط.
2. **اتشال الاستبدال**: الـ token route والـ PUT مابيكتبوش `dailyRoomName`/`link` أبدًا. الدالة الوحيدة هي
   `ensureDailyRoom` (موجودة → تصحيح المعاد؛ 404 → إنشاء بنفس الاسم؛ أي خطأ تاني → خطأ، مفيش إنشاء بالتخمين).
3. **حارس الحساب**: لو دومين الغرفة اللي رجعت من Daily مختلف عن دومين `meeting.link` (سيرفر بمفتاح تاني)
   → `409 daily_account_mismatch` وسجل خطأ واضح، بدل ما يقسّم الناس.
4. **سكريبت إعادة الضبط**: `app/scripts/reset-daily-rooms.js` (شوف التعليمات في أول الملف).

## تشغيل السكريبت
```
MONGO_URI="..." DAILY_API_KEY="<الحالي>" DAILY_API_KEY_OLD="<القديم>" \
  node app/scripts/reset-daily-rooms.js --domain edumaster365            # تجربة
  node app/scripts/reset-daily-rooms.js --domain edumaster365 --apply    # تنفيذ
  node app/scripts/reset-daily-rooms.js --domain edumaster365 --apply --purge-daily   # + مسح كل الغرف
```
مش بيشتغل لو فيه محاضرة شغالة (إلا بـ `--force`).

## لازم بعد التنفيذ
كل نسخ الموقع على نفس الداتابيز (الإنتاج، Hostinger، localhost/cloudflared...) لازم `DAILY_API_KEY` بتاعها نفس مفتاح الحساب الحالي.

## اختبارات
`dailyRooms.test.js` و`meetingTokenRoute.test.js` و`meetingPutRoom.test.js` و`meetingCreateRooms.test.js`
(اختبار الـ token route بيفشل على الكود القديم وبيعدّي على الجديد).
