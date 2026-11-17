// app/lib/fileKind.js
//
// 🆕 تحديد نوع الملف (من امتداد الرابط) عشان FileViewer يعرف يعرضه داخل المنصة
// (PDF / صور / Office) ولا لازم يتحمّل (zip وغيره).

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp"];
const OFFICE_EXT = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];

/** @returns {"pdf"|"image"|"office"|"other"} حسب امتداد الملف في الرابط (من غير الـ query). */
export function detectFileKind(url) {
  if (!url) return "other";
  let path = String(url).split("#")[0].split("?")[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* رابط غير مشفّر بشكل سليم — نكمل بالنص زي ما هو */
  }
  const ext = path.includes(".") ? path.split(".").pop().toLowerCase() : "";
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXT.includes(ext)) return "image";
  if (OFFICE_EXT.includes(ext)) return "office";
  return "other";
}

export function officeViewerUrl(url) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
}
