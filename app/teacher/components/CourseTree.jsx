"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Video, FileText, FileType2, ChevronDown, GripVertical } from "lucide-react";

const LESSON_ICONS = { video: Video, pdf: FileType2, text: FileText, quiz: FileText };

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CourseTree({ sections, onAddSection, onEditSection, onDeleteSection, onAddLesson, onEditLesson, onDeleteLesson }) {
  const [openSections, setOpenSections] = useState(() => new Set(sections.map((s) => s.id)));

  function toggle(id) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const isOpen = openSections.has(section.id);
        return (
          <div key={section.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-gray-50/70">
              <button onClick={() => toggle(section.id)} className="text-gray-400">
                <ChevronDown size={18} className={`transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </button>
              <GripVertical size={16} className="text-gray-300" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 truncate">{section.title}</h4>
                {section.description && <p className="text-xs text-gray-400 truncate">{section.description}</p>}
              </div>
              <span className="text-xs text-gray-400">{section.lessons.length} درس</span>
              <button
                onClick={() => onAddLesson(section.id)}
                className="flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100"
              >
                <Plus size={13} /> درس
              </button>
              <button onClick={() => onEditSection(section)} className="text-gray-400 hover:text-gray-700 p-1.5">
                <Pencil size={14} />
              </button>
              <button onClick={() => onDeleteSection(section)} className="text-red-400 hover:text-red-600 p-1.5">
                <Trash2 size={14} />
              </button>
            </div>

            {isOpen && (
              <div className="divide-y divide-gray-100">
                {section.lessons.length === 0 && (
                  <div className="px-5 py-4 text-sm text-gray-400 text-center">مفيش دروس لسه</div>
                )}
                {section.lessons.map((lesson) => {
                  const Icon = LESSON_ICONS[lesson.type] || FileText;
                  return (
                    <div key={lesson.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                      <Icon size={16} className="text-gray-400 shrink-0" />
                      <span className="flex-1 text-sm text-gray-700 truncate">{lesson.title}</span>
                      {lesson.isPreview && (
                        <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                          معاينة
                        </span>
                      )}
                      {lesson.type === "video" && lesson.durationSeconds > 0 && (
                        <span className="text-xs text-gray-400">{formatDuration(lesson.durationSeconds)}</span>
                      )}
                      <button onClick={() => onEditLesson(section.id, lesson)} className="text-gray-400 hover:text-gray-700 p-1">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDeleteLesson(section.id, lesson)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={onAddSection}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-2xl py-4 text-gray-500 hover:text-blue-600 font-semibold transition-colors"
      >
        <Plus size={18} /> إضافة قسم جديد
      </button>
    </div>
  );
}