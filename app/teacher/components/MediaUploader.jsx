"use client";

// app/teacher/components/MediaUploader.jsx
//
// بيرفع فيديو/صورة/PDF لـ Bunny.net (شوف الشرح الكامل في app/lib/bunny.js).
// التدفق مختلف حسب النوع:
//
//   فيديو (Bunny Stream):
//     1) يطلب توقيع من /api/upload/signature (بيتحقق إنك teacher/admin
//        وبيعمل entry جديد للفيديو في Bunny Stream)
//     2) يرفع الملف مباشرة لـ Bunny ببروتوكول TUS بالتوقيع ده (progress
//        bar حقيقي، رفع resumable)
//     3) يرجّع رابط تشغيل الفيديو (iframe embed) لأي component استدعاه
//
//   صورة / PDF (Bunny Storage):
//     1) يرفع الملف كـ FormData لـ /api/upload/file (السيرفر بيتحقق من
//        الصلاحية ويعمل proxy للرفع لـ Bunny Storage، لأن Bunny مش بيدعم
//        signed upload زي الفيديو)
//     2) يرجّع الرابط النهائي

import { useRef, useState } from "react";
import { Upload as tus } from "tus-js-client";
import { UploadCloud, CheckCircle2, XCircle, Loader } from "lucide-react";

const ACCEPT_BY_KIND = {
  video: "video/*",
  image: "image/*",
  pdf: "application/pdf",
  // Phase 4 — اليوم 39-40: تسليم واجب الطالب (PDF/Word/Zip/صورة) — شوف
  // ALLOWED_KINDS.submission في app/api/upload/file/route.js لقايمة الـ
  // mime types الكاملة المسموحة سيرفر-سايد.
  submission: "application/pdf,.doc,.docx,application/zip,image/*",
};

// بيحاول يقرأ مدة الفيديو من الملف نفسه على جهاز المستخدم (بدون رفع)،
// عشان نعرف نعبي durationSeconds فورًا وإحنا لسه بنرفع (Bunny Stream بياخد
// وقت في المعالجة قبل ما يرجّع المدة، فمنستناهوش).
function readVideoDuration(file) {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const seconds = Math.round(video.duration) || 0;
        URL.revokeObjectURL(video.src);
        resolve(seconds);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    } catch {
      resolve(0);
    }
  });
}

export default function MediaUploader({ kind, label, onUploaded, currentUrl }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(currentUrl ? "done" : "idle"); // idle | uploading | done | error
  const [errorMsg, setErrorMsg] = useState("");

  async function uploadVideo(file) {
    const durationSeconds = await readVideoDuration(file);

    const sigRes = await fetch("/api/upload/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "video", title: file.name }),
    });
    const sig = await sigRes.json();
    if (!sigRes.ok) throw new Error(sig?.error || "signature_failed");

    await new Promise((resolve, reject) => {
      const upload = new tus(file, {
        endpoint: sig.uploadEndpoint,
        retryDelays: [0, 1000, 3000, 5000],
        headers: {
          AuthorizationSignature: sig.authorizationSignature,
          AuthorizationExpire: String(sig.authorizationExpire),
          VideoId: sig.videoId,
          LibraryId: String(sig.libraryId),
        },
        metadata: {
          filetype: file.type,
          title: file.name,
        },
        onError: (err) => reject(err),
        onProgress: (bytesUploaded, bytesTotal) => {
          setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        },
        onSuccess: () => resolve(),
      });
      upload.start();
    });

    return {
      url: sig.playbackUrl,
      durationSeconds,
      bytes: file.size,
      format: file.type,
    };
  }

  async function uploadStorageFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload/file");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data?.error || "upload_failed"));
        } catch {
          reject(new Error("upload_failed"));
        }
      };
      xhr.onerror = () => reject(new Error("network_error"));
      xhr.send(formData);
    });

    return { url: result.url, bytes: result.bytes, format: result.format };
  }

  async function handleFile(file) {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      const result = kind === "video" ? await uploadVideo(file) : await uploadStorageFile(file);
      setStatus("done");
      onUploaded?.(result);
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