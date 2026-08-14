"use client";

// app/teacher/components/MediaUploader.jsx
//
// بيرفع فيديو/صورة/PDF مباشرة من المتصفح لـ Cloudinary (شوف الشرح الكامل
// في app/lib/cloudinary.js). التدفق:
//   1) يطلب توقيع من /api/upload/signature (بيتحقق إنك teacher/admin)
//   2) يرفع الملف مباشرة لـ Cloudinary بالتوقيع ده (progress bar حقيقي)
//   3) يرجّع الرابط النهائي (secure_url) لأي component استدعاه

import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, XCircle, Loader } from "lucide-react";

const ACCEPT_BY_KIND = {
  video: "video/*",
  image: "image/*",
  pdf: "application/pdf",
};

export default function MediaUploader({ kind, label, onUploaded, currentUrl }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(currentUrl ? "done" : "idle"); // idle | uploading | done | error
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(file) {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      const sigRes = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const sig = await sigRes.json();
      if (!sigRes.ok) throw new Error(sig?.error || "signature_failed");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sig.apiKey);
      formData.append("timestamp", sig.timestamp);
      formData.append("signature", sig.signature);
      formData.append("folder", sig.folder);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;

      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new Error(data?.error?.message || "upload_failed"));
          } catch {
            reject(new Error("upload_failed"));
          }
        };
        xhr.onerror = () => reject(new Error("network_error"));
        xhr.send(formData);
      });

      setStatus("done");
      onUploaded?.({
        url: result.secure_url,
        durationSeconds: result.duration ? Math.round(result.duration) : 0,
        bytes: result.bytes,
        format: result.format,
      });
    } catch (err) {
      console.error("upload error:", err);
      setStatus("error");
      setErrorMsg(err.message === "upload_not_configured" ? "الرفع غير مفعّل حاليًا" : "فشل الرفع، حاول تاني");
    }
  }

  return (
    <div>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_BY_KIND[kind]}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl px-4 py-4 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-60"
      >
        {status === "uploading" && <Loader size={18} className="animate-spin text-blue-500" />}
        {status === "done" && <CheckCircle2 size={18} className="text-green-500" />}
        {status === "error" && <XCircle size={18} className="text-red-500" />}
        {status === "idle" && <UploadCloud size={18} />}
        <span>
          {status === "uploading" && `جاري الرفع... ${progress}%`}
          {status === "done" && "تم الرفع بنجاح — اضغط للاستبدال"}
          {status === "error" && errorMsg}
          {status === "idle" && "اضغط لاختيار الملف"}
        </span>
      </button>
      {status === "uploading" && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}