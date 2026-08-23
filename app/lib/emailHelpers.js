// app/lib/emailHelpers.js
//
// Phase 6 — اليوم 52 (اختياري): "إشعارات بالإيميل للأحداث المهمة (نجاح
// دفع، انتهاء اشتراك)". بنستخدم نفس مزوّد الإيميل المستخدم بالفعل في
// app/api/forgot-password/route.js (Resend، عن طريق REST API مباشرة —
// مفيش SDK إضافي) بدل ما نضيف مكتبة جديدة، وبنعمم الدالة هنا عشان أي
// حدث تاني محتاج يبعت إيميل (مش بس كود إعادة تعيين الباسورد) يستخدمها.
//
// 🔒 best-effort ومقصود: فشل إرسال إيميل (Resend down، quota خلصت، إلخ)
// ميبوّظش العملية الأساسية (تفعيل الدفع، إصدار شهادة، إلخ) — بنسجل الخطأ
// في الـ console بس وبنكمل عادي. الإشعار الداخلي (notificationHelpers.js)
// هو مصدر الحقيقة الأساسي؛ الإيميل طبقة إضافية بس.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "notifications@edumaster365.com";

// قالب HTML بسيط موحّد (هيدر EduMaster + محتوى) — بيُستخدم لكل إيميلات
// الأحداث في الدالة دي، عشان كل الإيميلات تحس إنها من نفس المنصة بشكل
// متسق من غير ما نكرر HTML الهيدر/الفوتر في كل مكان بيبعت إيميل.
function wrapEmailTemplate({ heading, bodyHtml }) {
  return `
<!DOCTYPE html>
<html dir="ltr" lang="en">
  <body style="margin:0;padding:0;background-color:#eef2ff;font-family:'DM Sans',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;border:2px solid #dbeafe;">
          <tr><td style="background-color:#1E3561;padding:24px 32px;">
            <span style="font-size:20px;font-weight:900;color:#C9A227;">Edumaster</span>
          </td></tr>
          <tr><td style="height:3px;background-color:#C9A227;line-height:0;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:32px;">
            <p style="font-size:16px;font-weight:800;color:#1e293b;margin:0 0 16px 0;">${heading}</p>
            ${bodyHtml}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(str) {
  return String(str || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * بيبعت إيميل عن طريق Resend. لو RESEND_API_KEY مش متظبط (بيئة تطوير محلية
 * مثلاً)، بيسجّل تحذير ويرجع من غير ما يفشل — نفس سلوك sendResetCodeEmail
 * الموجود في forgot-password/route.js.
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.heading - عنوان بارز داخل جسم الإيميل
 * @param {string} params.bodyHtml - باقي محتوى الإيميل (HTML جاهز)
 */
export async function sendTemplatedEmail({ to, subject, heading, bodyHtml }) {
  if (!RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject,
        html: wrapEmailTemplate({ heading, bodyHtml }),
      }),
    });
    if (!res.ok) {
      console.error(`[sendTemplatedEmail] Resend failed for "${subject}":`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[sendTemplatedEmail] error for "${subject}":`, err);
    return false;
  }
}

/**
 * إيميل "نجاح الدفع" — بيتبعت من markPaymentSucceededAndGrantAccess
 * (paymentHelpers.js) بعد ما الدفعة تتفعّل فعليًا.
 */
export async function sendPaymentSucceededEmail({ toEmail, name, itemLabel, amount, currency, invoiceNumber }) {
  const bodyHtml = `
    <p style="font-size:14px;color:#64748b;margin:0 0 20px 0;">
      Hi ${escapeHtml(name)}, your payment for <strong>${escapeHtml(itemLabel)}</strong> was successful.
    </p>
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <p style="font-size:13px;color:#475569;margin:0 0 6px 0;">Amount: <strong>${(amount / 100).toFixed(2)} ${currency}</strong></p>
      <p style="font-size:13px;color:#475569;margin:0;">Invoice #: <strong>${escapeHtml(invoiceNumber)}</strong></p>
    </div>
    <p style="font-size:12px;color:#94a3b8;margin:0;">You can view your full payment history and receipt anytime from your EduMaster account.</p>
  `;
  return sendTemplatedEmail({ to: toEmail, subject: "Your EduMaster payment was successful", heading: "Payment Confirmed ✓", bodyHtml });
}

/**
 * إيميل "اشتراكك على وشك الانتهاء" — بيُستخدم من
 * app/api/cron/membership-expiry/route.js.
 */
export async function sendMembershipExpiringEmail({ toEmail, name, planName, expiresAt, daysLeft }) {
  const bodyHtml = `
    <p style="font-size:14px;color:#64748b;margin:0 0 20px 0;">
      Hi ${escapeHtml(name)}, your <strong>${escapeHtml(planName)}</strong> membership on EduMaster
      ${daysLeft <= 0 ? "has expired" : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
      (${new Date(expiresAt).toLocaleDateString("en-US")}).
    </p>
    <p style="font-size:13px;color:#475569;margin:0;">Renew now to keep uninterrupted access to your courses.</p>
  `;
  return sendTemplatedEmail({
    to: toEmail,
    subject: daysLeft <= 0 ? "Your EduMaster membership has expired" : "Your EduMaster membership is expiring soon",
    heading: daysLeft <= 0 ? "Membership Expired" : "Membership Expiring Soon",
    bodyHtml,
  });
}
/**
 * 🆕 إيميل "محاضرة لايف جديدة" — بيتبعت لكل طالب مسجّل في الكورس وقت ما
 * المدرس يضيف محاضرة (شوف app/api/courses/[id]/meetings/route.js POST).
 * الهدف: طالب مش فاتح الموقع وقت الإضافة ميفوّتش المحاضرة تمامًا (الإشعار
 * الداخلي في NotificationBell محتاج الموقع يكون مفتوح أو يتفتح لاحقًا).
 */
export async function sendMeetingScheduledEmail({ toEmail, name, courseTitle, meetingTitle, scheduledAt }) {
  const when = new Date(scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const bodyHtml = `
    <p style="font-size:14px;color:#64748b;margin:0 0 20px 0;">
      Hi ${escapeHtml(name)}, a new live lecture was just scheduled for <strong>${escapeHtml(courseTitle)}</strong>.
    </p>
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <p style="font-size:13px;color:#475569;margin:0 0 6px 0;">${escapeHtml(meetingTitle)}</p>
      <p style="font-size:13px;color:#475569;margin:0;">When: <strong>${when}</strong></p>
    </div>
    <p style="font-size:12px;color:#94a3b8;margin:0;">Join from the Live Lectures page in your EduMaster account when it starts.</p>
  `;
  return sendTemplatedEmail({
    to: toEmail,
    subject: `New live lecture: ${meetingTitle}`,
    heading: "New Live Lecture Scheduled",
    bodyHtml,
  });
}

/**
 * 🆕 إيميل "تذكير قريب من الميعاد" (~10 دقايق قبل البداية) — بيُستخدم من
 * app/api/cron/meeting-reminders/route.js. مكمّل للإشعار الداخلي، مش بديل
 * عنه — طالب مش فاتح تاب الموقع أصلًا مش هيشوف جرس الإشعارات.
 */
export async function sendMeetingReminderEmail({ toEmail, name, courseTitle, meetingTitle, scheduledAt, minutesLeft }) {
  const when = new Date(scheduledAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const bodyHtml = `
    <p style="font-size:14px;color:#64748b;margin:0 0 20px 0;">
      Hi ${escapeHtml(name)}, your live lecture <strong>${escapeHtml(meetingTitle)}</strong>
      (${escapeHtml(courseTitle)}) starts in about ${minutesLeft} minutes.
    </p>
    <p style="font-size:13px;color:#475569;margin:0;">Scheduled for: <strong>${when}</strong></p>
  `;
  return sendTemplatedEmail({
    to: toEmail,
    subject: `Starting soon: ${meetingTitle}`,
    heading: "Your Live Lecture Starts Soon",
    bodyHtml,
  });
}