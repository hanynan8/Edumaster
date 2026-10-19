// app/lib/assignmentMedia.test.js
//
// 🆕 فحص روابط فيديو/أوديو الواجبات: لازم تكون Bunny بتاعتنا فعلًا (Stream
// library / Storage pull zone)، وأوديو الطالب لازم تحت فولدره هو.

const LIB = "12345";
const HOST = "my-zone.b-cdn.net";

beforeAll(() => {
  process.env.BUNNY_STREAM_LIBRARY_ID = LIB;
  process.env.BUNNY_STORAGE_PULL_ZONE_HOSTNAME = HOST;
});

const { sanitizeAssignmentMedia, resolveAssignmentMedia } = require("./assignmentMedia");

const VIDEO_ID = "0a1b2c3d-1111-2222-3333-444455556666";
const videoUrl = `https://iframe.mediadelivery.net/embed/${LIB}/${VIDEO_ID}`;

describe("sanitizeAssignmentMedia", () => {
  it("مفيش رابط → null/null (مسح)", () => {
    expect(sanitizeAssignmentMedia("", "video")).toEqual({ ok: true, mediaUrl: null, mediaType: null });
    expect(sanitizeAssignmentMedia(undefined, undefined)).toEqual({ ok: true, mediaUrl: null, mediaType: null });
  });

  it("نوع غير video/audio مرفوض", () => {
    expect(sanitizeAssignmentMedia(videoUrl, "pdf")).toEqual({ ok: false, error: "invalid_media_type" });
  });

  it("فيديو Bunny Stream صالح بيتخزّن بالرابط العادي (من غير token)", () => {
    const r = sanitizeAssignmentMedia(`${videoUrl}?token=abc&expires=1`, "video");
    expect(r).toEqual({ ok: true, mediaUrl: videoUrl, mediaType: "video" });
  });

  it("فيديو من مكتبة تانية أو دومين تاني مرفوض", () => {
    expect(sanitizeAssignmentMedia(`https://iframe.mediadelivery.net/embed/999/${VIDEO_ID}`, "video").ok).toBe(false);
    expect(sanitizeAssignmentMedia(`https://evil.com/embed/${LIB}/${VIDEO_ID}`, "video").ok).toBe(false);
    expect(sanitizeAssignmentMedia("https://www.youtube.com/watch?v=x", "video").ok).toBe(false);
  });

  it("أوديو من Bunny Storage تحت الفولدر المسموح بيتقبل ويتشال منه الـ token", () => {
    const url = `https://${HOST}/edumaster/teachers/t1/audio/1-a.mp3?token=x&expires=2`;
    const r = sanitizeAssignmentMedia(url, "audio", { audioFolderPrefix: "/edumaster/teachers/" });
    expect(r).toEqual({ ok: true, mediaUrl: `https://${HOST}/edumaster/teachers/t1/audio/1-a.mp3`, mediaType: "audio" });
  });

  it("أوديو الطالب لازم تحت فولدره هو", () => {
    const own = `https://${HOST}/edumaster/students/s1/audio/1-a.mp3`;
    const other = `https://${HOST}/edumaster/students/s2/audio/1-a.mp3`;
    const opts = { audioFolderPrefix: "/edumaster/students/s1/" };
    expect(sanitizeAssignmentMedia(own, "audio", opts).ok).toBe(true);
    expect(sanitizeAssignmentMedia(other, "audio", opts)).toEqual({ ok: false, error: "invalid_media_url" });
  });

  it("أوديو خارج Bunny أو فيه .. مرفوض", () => {
    expect(sanitizeAssignmentMedia("https://example.com/a.mp3", "audio").ok).toBe(false);
    expect(sanitizeAssignmentMedia(`https://${HOST}/edumaster/students/s1/../x.mp3`, "audio").ok).toBe(false);
  });
});

describe("resolveAssignmentMedia", () => {
  it("بيرجّع null لو مفيش ميديا، ورابط الـ embed للفيديو، ورابط الأوديو للأوديو", () => {
    expect(resolveAssignmentMedia(null, null)).toBeNull();
    expect(resolveAssignmentMedia(videoUrl, "video")).toBe(videoUrl);
    const a = `https://${HOST}/edumaster/teachers/t1/audio/a.mp3`;
    expect(resolveAssignmentMedia(a, "audio")).toBe(a);
  });
});
