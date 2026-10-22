// app/moderator/layout.jsx
//
// 🆕 "موديريتور داشبورد" للأدمن (والموديريتور): نفس غلاف /teacher (فحص الدور +
// RTL + الخلفية)، والحماية الفعلية في middleware.js (/moderator → moderator/admin).
import TeacherLayout from "@/app/teacher/layout";

export default function ModeratorLayout({ children }) {
  return <TeacherLayout>{children}</TeacherLayout>;
}
