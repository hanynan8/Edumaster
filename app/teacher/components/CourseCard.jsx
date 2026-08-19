"use client";

import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2, BookOpen, Users, Clock } from "lucide-react";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  archived: "bg-amber-100 text-amber-700",
};
const STATUS_LABELS = { draft: "مسودة", published: "منشور", archived: "مؤرشف" };

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د`;
}

export default function CourseCard({ course, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-36 bg-gray-100">
        {course.thumbnail ? (
          <Image src={course.thumbnail} alt={course.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <BookOpen size={40} />
          </div>
        )}
        <span
          className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[course.status]}`}
        >
          {STATUS_LABELS[course.status]}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-800 line-clamp-1 mb-1">{course.title}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[32px]">{course.shortDescription || "—"}</p>

        <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <BookOpen size={12} /> {course.totalLessonsCount} درس
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {formatDuration(course.totalDurationSeconds)}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} /> {course.studentsCount}
          </span>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/teacher/courses/${course.id}`}
            className="flex-1 text-center text-sm font-semibold bg-[#1D6FD8]/10 text-[#1D6FD8] rounded-lg py-2 hover:bg-[#1D6FD8]/20"
          >
            المحتوى
          </Link>
          <button
            onClick={() => onEdit(course)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            title="تعديل"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(course)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
            title="حذف"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}