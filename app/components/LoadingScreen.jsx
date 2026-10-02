// app/components/LoadingScreen.jsx
//
// ⚡ لا سبينر ولا نص "جاري التحميل" خالص. المكوّن بقى placeholder شفاف بنفس
// الارتفاع (عشان الفوتر ما يقفزش لفوق ويرجع لتحت وقت وصول الداتا) — الصفحات
// الغالب بتتعرض فورًا من الكاش/السيرفر، فالـ placeholder ده بيظهر لأجزاء من
// الثانية في أول زيارة بس.
// الـ props القديمة (label, compact, className, dir) لسه مقبولة للتوافق مع
// كل الأماكن اللي بتستدعيه — بتتجاهل بصمت.

export default function LoadingScreen({ compact = false, className = "", dir }) {
  return (
    <div
      dir={dir}
      aria-hidden="true"
      className={`${compact ? "min-h-[200px]" : "min-h-[70vh]"} ${className}`}
    />
  );
}
