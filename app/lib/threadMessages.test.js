// app/lib/threadMessages.test.js
//
// 🆕 الرد الصوتي في محادثة الواجب: الرابط لازم يكون أوديو Bunny تحت فولدر
// المرسل نفسه (طالب → students/<id>، مدرّس/موديريتر/أدمن → teachers/<id>).

const HOST = "my-zone.b-cdn.net";

beforeAll(() => {
  process.env.BUNNY_STREAM_LIBRARY_ID = "12345";
  process.env.BUNNY_STORAGE_PULL_ZONE_HOSTNAME = HOST;
});

jest.mock("@/app/lib/rbac", () => ({ canGradeCourse: jest.fn() }));

const { sanitizeThreadAudio, serializeMessages } = require("./threadMessages");

describe("sanitizeThreadAudio", () => {
  it("مفيش رابط → بدون صوت", () => {
    expect(sanitizeThreadAudio("", { userId: "s1", role: "student" })).toEqual({ ok: true, audioUrl: null });
    expect(sanitizeThreadAudio(undefined, { userId: "s1", role: "student" })).toEqual({ ok: true, audioUrl: null });
  });

  it("الطالب يقبل ملفه هو بس (ويتشال الـ token)", () => {
    const own = `https://${HOST}/edumaster/students/s1/audio/1-voice.webm`;
    expect(sanitizeThreadAudio(`${own}?token=x&expires=1`, { userId: "s1", role: "student" })).toEqual({
      ok: true,
      audioUrl: own,
    });
    expect(
      sanitizeThreadAudio(`https://${HOST}/edumaster/students/s2/audio/1-voice.webm`, { userId: "s1", role: "student" })
    ).toEqual({ ok: false, error: "invalid_audio_url" });
  });

  it("الطالب مينفعش يربط ملف من فولدر المدرّسين", () => {
    expect(
      sanitizeThreadAudio(`https://${HOST}/edumaster/teachers/t1/audio/1-a.mp3`, { userId: "s1", role: "student" }).ok
    ).toBe(false);
  });

  it("المدرّس/الموديريتر/الأدمن تحت teachers/<id>", () => {
    const own = `https://${HOST}/edumaster/teachers/t1/audio/1-a.mp3`;
    for (const role of ["teacher", "moderator", "admin"]) {
      expect(sanitizeThreadAudio(own, { userId: "t1", role })).toEqual({ ok: true, audioUrl: own });
    }
    expect(
      sanitizeThreadAudio(`https://${HOST}/edumaster/teachers/t2/audio/1-a.mp3`, { userId: "t1", role: "teacher" }).ok
    ).toBe(false);
  });

  it("رابط خارج Bunny أو فيه .. مرفوض", () => {
    expect(sanitizeThreadAudio("https://evil.com/a.mp3", { userId: "s1", role: "student" }).ok).toBe(false);
    expect(
      sanitizeThreadAudio(`https://${HOST}/edumaster/students/s1/../s2/audio/a.mp3`, { userId: "s1", role: "student" }).ok
    ).toBe(false);
  });
});

describe("serializeMessages", () => {
  it("بيرجّع audioUrl للرسائل الصوتية و null للنصية، والنص فاضي مش undefined", () => {
    const voice = `https://${HOST}/edumaster/students/s1/audio/1-voice.webm`;
    const out = serializeMessages([
      { _id: "m1", sender: "s1", senderRole: "student", text: "", audioUrl: voice, createdAt: new Date(0) },
      { _id: "m2", sender: "t1", senderRole: "teacher", text: "تمام", createdAt: new Date(0) },
    ]);
    expect(out[0]).toMatchObject({ id: "m1", text: "", audioUrl: voice });
    expect(out[1]).toMatchObject({ id: "m2", text: "تمام", audioUrl: null });
  });
});
