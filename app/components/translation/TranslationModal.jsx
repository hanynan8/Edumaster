"use client";

// app/components/translation/TranslationModal.jsx
//
// نافذة منبثقة (modal) بتلف <TranslationForm /> عشان تتفتح من أي مكان في
// الموقع (صفحة الخدمات، الهوم لوج-إن/لوج-أوت) من غير ما نحتاج صفحة منفصلة.
// نفس نمط ConsultationModal بالظبط.

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { X } from "lucide-react";
import TranslationForm from "./TranslationForm";

export default function TranslationModal({ open, onClose }) {
  const { isRTL } = useLanguage();

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 sm:my-0 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute top-4 ${isRTL ? "left-4" : "right-4"} z-10 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors`}
        >
          <X size={18} />
        </button>
        <div className="p-5 sm:p-8 max-h-[90vh] overflow-y-auto">
          <TranslationForm onSuccess={() => {}} />
        </div>
      </div>
    </div>
  );
}