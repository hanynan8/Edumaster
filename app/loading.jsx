// app/loading.jsx — Server Component (من غير "use client" ولا hooks).
//
// ⚡ PERFORMANCE / UX: كان بيعرض سبينر بملء الشاشة + useLanguage في كل تنقل،
// وده بيحس المستخدم إن الموقع بيعمل "reload". دلوقتي: النافبار والفوتر
// بيفضلوا ثابتين (لأنهم في الـ layout)، وبنعرض بس شريط تقدّم رفيع فوق +
// skeleton خفيف في مكان المحتوى بـ CSS صِرف (صفر JavaScript، بيظهر فورًا).
export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="min-h-[70vh]">
      <div className="route-progress" />
      <div className="mx-auto max-w-6xl px-5 sm:px-8 md:px-16 pt-24 space-y-6">
        <div className="skeleton h-9 w-2/3 sm:w-1/3 rounded-lg" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 pt-6">
          <div className="skeleton h-56 rounded-2xl" />
          <div className="skeleton h-56 rounded-2xl hidden sm:block" />
          <div className="skeleton h-56 rounded-2xl hidden lg:block" />
        </div>
      </div>
    </div>
  );
}
