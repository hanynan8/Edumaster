"use client";

// app/components/languageCourses/SpanishCurriculum.jsx
//
// جدول تفصيلي لمستويات كورس الإسبانية (منهج Aula Plus) — بيتعرض جوه صفحة
// /services تحت خدمة "Language Courses" بس. مبني على الجدول اللي العميل
// بعته: 4 مستويات CEFR رئيسية (A1 → B2)، كل واحد مقسّم لـ 3-4 مستويات
// فرعية، كل مستوى فرعي = 30 ساعة + نطاق وحدات من كتاب Aula Plus.
//
// نفس فلسفة CORE_LEVELS في EnglishProgramForm.jsx: بيانات ثابتة + نصوص
// مترجمة للتلات لغات، من غير أي اعتماد على الـ CMS/admin.

const HOURS_PER_SUBLEVEL = 30;

// كل عنصر: cefr (المستوى الرئيسي) - sub (رمز الفرعي) - name (اسم الفرعي
// باللغات التلاتة) - book (كتاب ووحدات Aula Plus، نفسه لكل اللغات لأنه اسم
// كتاب ورقم وحدات مش نص يترجم)
export const SPANISH_LEVELS = [
  { cefr: "A1", sub: "A1.1", book: "Aula Plus 1 U0–U3", name: { en: "Start", ar: "البداية", es: "Inicio" } },
  { cefr: "A1", sub: "A1.2", book: "Aula Plus 1 U4–U6", name: { en: "Basic", ar: "الأساسي", es: "Básico" } },
  { cefr: "A1", sub: "A1.3", book: "Aula Plus 1 U7–U9/10", name: { en: "Survival", ar: "البقاء", es: "Supervivencia" } },

  { cefr: "A2", sub: "A2.1", book: "Aula Plus 2 U1–U3", name: { en: "Everyday", ar: "الحياة اليومية", es: "Cotidiano" } },
  { cefr: "A2", sub: "A2.2", book: "Aula Plus 2 U4–U6", name: { en: "Communication", ar: "التواصل", es: "Comunicación" } },
  { cefr: "A2", sub: "A2.3", book: "Aula Plus 2 U7–U10", name: { en: "Confidence", ar: "الثقة", es: "Confianza" } },

  { cefr: "B1", sub: "B1.1", book: "Aula Plus 3 U1–U3", name: { en: "Independent", ar: "الاستقلالية", es: "Independiente" } },
  { cefr: "B1", sub: "B1.2", book: "Aula Plus 3 U4–U6", name: { en: "Fluency", ar: "الطلاقة", es: "Fluidez" } },
  { cefr: "B1", sub: "B1.3", book: "Aula Plus 3 U7–U9", name: { en: "Professional", ar: "الاحترافية", es: "Profesional" } },
  { cefr: "B1", sub: "B1.4", book: "Aula Plus 3 U10–U12", name: { en: "Study & Work", ar: "الدراسة والعمل", es: "Estudio y Trabajo" } },

  { cefr: "B2", sub: "B2.1", book: "Aula Plus 4 U1–U3", name: { en: "Advanced", ar: "متقدم", es: "Avanzado" } },
  { cefr: "B2", sub: "B2.2", book: "Aula Plus 4 U4–U6", name: { en: "Advanced Plus", ar: "متقدم بلس", es: "Avanzado Plus" } },
  { cefr: "B2", sub: "B2.3", book: "Aula Plus 5 U1–U3", name: { en: "Advanced Pro", ar: "متقدم برو", es: "Avanzado Pro" } },
  { cefr: "B2", sub: "B2.4", book: "Aula Plus 5 U4–U6", name: { en: "Advanced Mastery", ar: "إتقان متقدم", es: "Maestría Avanzada" } },
].map((row) => ({ ...row, hours: HOURS_PER_SUBLEVEL }));

const CEFR_BADGE_COLORS = {
  A1: "#10b981",
  A2: "#0ea5e9",
  B1: "#f59e0b",
  B2: "#003A91",
};

const STRINGS = {
  en: {
    title: "Spanish Course Curriculum",
    subtitle: "14 sub-levels across A1 → B2, based on the Aula Plus course books — 30 hours per sub-level.",
    colLevel: "Level",
    colSubLevel: "Sub-level",
    colBook: "Course Book",
    colHours: "Hours",
    toggleShow: "View full curriculum",
    toggleHide: "Hide curriculum",
    totalLabel: (n) => `${n} sub-levels · ${n * HOURS_PER_SUBLEVEL} hours total`,
  },
  ar: {
    title: "منهج كورس اللغة الإسبانية",
    subtitle: "14 مستوى فرعي من A1 لـ B2، مبني على كتب Aula Plus — 30 ساعة لكل مستوى فرعي.",
    colLevel: "المستوى",
    colSubLevel: "المستوى الفرعي",
    colBook: "الكتاب الدراسي",
    colHours: "الساعات",
    toggleShow: "شوف المنهج كامل",
    toggleHide: "إخفاء المنهج",
    totalLabel: (n) => `${n} مستوى فرعي · إجمالي ${n * HOURS_PER_SUBLEVEL} ساعة`,
  },
  es: {
    title: "Plan de Estudios de Español",
    subtitle: "14 subniveles de A1 a B2, basados en los libros Aula Plus — 30 horas por subnivel.",
    colLevel: "Nivel",
    colSubLevel: "Subnivel",
    colBook: "Libro de Curso",
    colHours: "Horas",
    toggleShow: "Ver el plan completo",
    toggleHide: "Ocultar el plan",
    totalLabel: (n) => `${n} subniveles · ${n * HOURS_PER_SUBLEVEL} horas en total`,
  },
};

import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, BookOpen } from "lucide-react";

export default function SpanishCurriculum({ lang = "en" }) {
  const t = STRINGS[lang] ?? STRINGS.en;
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 sm:mt-8 border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 text-start hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="font-bold text-sm sm:text-base text-[#0a0a0a]">{t.title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t.subtitle}</p>
        </div>
        <span className="shrink-0 w-9 h-9 rounded-lg bg-[#003A91]/8 text-[#003A91] flex items-center justify-center">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#f7f7f7] text-gray-500">
                  <th className="text-start font-semibold px-3 sm:px-4 py-2.5">{t.colLevel}</th>
                  <th className="text-start font-semibold px-3 sm:px-4 py-2.5">{t.colSubLevel}</th>
                  <th className="text-start font-semibold px-3 sm:px-4 py-2.5">{t.colBook}</th>
                  <th className="text-start font-semibold px-3 sm:px-4 py-2.5">{t.colHours}</th>
                </tr>
              </thead>
              <tbody>
                {SPANISH_LEVELS.map((row, i) => (
                  <tr key={row.sub} className={`border-t border-gray-100 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                    <td className="px-3 sm:px-4 py-2.5">
                      <span
                        className="inline-flex items-center justify-center text-white font-bold text-[10px] sm:text-[11px] px-2 py-1 rounded-md"
                        style={{ background: CEFR_BADGE_COLORS[row.cefr] }}
                      >
                        {row.cefr}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 font-semibold text-[#0a0a0a]">
                      {row.sub} · {row.name[lang] ?? row.name.en}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-gray-600 flex items-center gap-1.5">
                      <BookOpen size={13} className="text-gray-400 shrink-0" />
                      {row.book}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400" />
                        {row.hours}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 sm:px-5 py-3 bg-[#f7f7f7] text-[11px] sm:text-xs font-semibold text-gray-500">
            {t.totalLabel(SPANISH_LEVELS.length)}
          </div>
        </div>
      )}
    </div>
  );
}