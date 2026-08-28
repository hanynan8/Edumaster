"use client";

import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2, BookOpen, Users, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  // 🆕 pending: الكورس اتبعت للأدمن وبينتظر مراجعة (لسه مش ظاهر للطلاب)
  pending: "bg-[#d9dde4] text-[#0c2547]",
  published: "bg-green-100 text-green-700",
  archived: "bg-amber-100 text-amber-700",
};

// 🆕 كل النصوص كانت عربي ثابت (حالة الكورس، "درس"، "المحتوى"، "تعديل"،
// "حذف"). دلوقتي بتتبع اللغة المختارة من الناف بار عن طريق useLanguage().
const T = {
  en: {
    status: { draft: "Draft", pending: "Under review", published: "Published", archived: "Archived" },
    lessons: (n) => `${n} lessons`,
    content: "Content",
    edit: "Edit",
    delete: "Delete",
  },
  ar: {
    status: { draft: "مسودة", pending: "قيد المراجعة", published: "منشور", archived: "مؤرشف" },
    lessons: (n) => `${n} درس`,
    content: "المحتوى",
    edit: "تعديل",
    delete: "حذف",
  },
  es: {
    status: { draft: "Borrador", pending: "En revisión", published: "Publicado", archived: "Archivado" },
    lessons: (n) => `${n} lecciones`,
    content: "Contenido",
    edit: "Editar",
    delete: "Eliminar",
  },
};

function formatDuration(seconds, language) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (language === "ar") return h > 0 ? `${h}س ${m}د` : `${m}د`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CourseCard({ course, onEdit, onDelete }) {
  const { language } = useLanguage();
  const t = T[language] || T.en;

  // 🩹 FIX: الكارت كان بيعرض course.title / course.shortDescription
  // مباشرة (النسخة الأساسية بس)، فمهما اخترت لغة من الناف بار كان
  // بيفضل ثابت زي ما اتحفظ أول مرة. دلوقتي بياخد النسخة المترجمة من
  // course.i18n[language] لو موجودة، وإلا يرجع لـ en، وإلا للحقول
  // الأساسية — نفس منطق app/(pages)/courses/page.jsx و [id]/page.jsx.
  const i18nEntry = course.i18n?.[language] || course.i18n?.en || null;
  const title = i18nEntry?.title || course.title;
  const shortDescription = i18nEntry?.shortDescription || course.shortDescription;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-36 bg-gray-100">
        {course.thumbnail ? (
          <Image src={course.thumbnail} alt={title} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <BookOpen size={40} />
          </div>
        )}
        <span
          className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[course.status]}`}
        >
          {t.status[course.status]}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-800 line-clamp-1 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[32px]">{shortDescription || "—"}</p>

        <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <BookOpen size={12} /> {t.lessons(course.totalLessonsCount)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {formatDuration(course.totalDurationSeconds, language)}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} /> {course.studentsCount}
          </span>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/teacher/courses/${course.id}`}
            className="flex-1 text-center text-sm font-semibold bg-[#0f2d57] text-white rounded-lg py-2 hover:bg-[#0c2547] transition-colors"
          >
            {t.content}
          </Link>
          <button
            onClick={() => onEdit(course)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            title={t.edit}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(course)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
            title={t.delete}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}