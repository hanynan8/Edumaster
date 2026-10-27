// app/lib/loadCoursePage.test.js
// اختبارات "Couldn't load this course": فشل أي طلب اختياري مايوقّعش الصفحة.

import { loadCoursePageData, fetchCourseWithRetry } from "@/app/lib/loadCoursePage";

const json = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const badJson = (status = 200) => ({ ok: status < 300, status, json: async () => { throw new SyntaxError("Unexpected token <"); } });
const COURSE = { id: "c1", title: "Spanish A1" };
const fast = { retries: 3, delayMs: 0 };

function makeFetch(routes) {
  return jest.fn(async (url) => {
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    const r = routes[key];
    if (typeof r === "function") return r();
    return r;
  });
}

describe("loadCoursePageData", () => {
  test("كل حاجة سليمة", async () => {
    const f = makeFetch({
      "/api/courses/c1/sections": json([{ id: "s1", lessons: [] }]),
      "/api/courses/c1": json(COURSE),
      "/api/quizzes": json({ quizzes: [{ id: "q" }] }),
      "/api/assignments": json({ assignments: [{ id: "a" }] }),
    });
    const r = await loadCoursePageData("c1", f, fast);
    expect(r.course).toEqual(COURSE);
    expect(r.sections).toHaveLength(1);
    expect(r.quizzes).toHaveLength(1);
    expect(r.assignments).toHaveLength(1);
  });

  test("الأقسام 500 / الكويزات رد HTML / الواجبات انقطاع شبكة → الصفحة تفتح عادي", async () => {
    const f = makeFetch({
      "/api/courses/c1/sections": json({ error: "internal_error" }, 500),
      "/api/courses/c1": json(COURSE),
      "/api/quizzes": badJson(200),
      "/api/assignments": () => { throw new TypeError("Failed to fetch"); },
    });
    const r = await loadCoursePageData("c1", f, fast);
    expect(r.course).toEqual(COURSE);
    expect(r.sections).toEqual([]);
    expect(r.quizzes).toEqual([]);
    expect(r.assignments).toEqual([]);
  });

  test("رد sections مش array → قايمة فاضية", async () => {
    const f = makeFetch({
      "/api/courses/c1/sections": json({ weird: true }),
      "/api/courses/c1": json(COURSE),
      "/api/quizzes": json({}),
      "/api/assignments": json(null),
    });
    const r = await loadCoursePageData("c1", f, fast);
    expect(r.sections).toEqual([]);
    expect(r.quizzes).toEqual([]);
    expect(r.assignments).toEqual([]);
  });

  test("404 على الكورس → notFound (مش خطأ)", async () => {
    const f = makeFetch({
      "/api/courses/c1/sections": json({ error: "not_found" }, 404),
      "/api/courses/c1": json({ error: "not_found" }, 404),
      "/api/quizzes": json({}, 404),
      "/api/assignments": json({}, 404),
    });
    expect(await loadCoursePageData("c1", f, fast)).toEqual({ notFound: true });
  });
});

describe("fetchCourseWithRetry", () => {
  test("500 مؤقت ثم نجاح → يرجّع الكورس", async () => {
    let n = 0;
    const f = jest.fn(async () => (++n < 3 ? json({ error: "internal_error" }, 500) : json(COURSE)));
    expect(await fetchCourseWithRetry("c1", f, fast)).toEqual({ course: COURSE });
    expect(f).toHaveBeenCalledTimes(3);
  });

  test("انقطاع شبكة ثم نجاح", async () => {
    let n = 0;
    const f = jest.fn(async () => { if (++n < 2) throw new TypeError("Failed to fetch"); return json(COURSE); });
    expect(await fetchCourseWithRetry("c1", f, fast)).toEqual({ course: COURSE });
  });

  test("500 دايم → يرمي خطأ بعد كل المحاولات", async () => {
    const f = jest.fn(async () => json({ error: "internal_error" }, 500));
    await expect(fetchCourseWithRetry("c1", f, fast)).rejects.toThrow("internal_error");
    expect(f).toHaveBeenCalledTimes(3);
  });

  test("رد 200 بس مش JSON → يرمي (مش بيعدّي بيانات بايظة)", async () => {
    const f = jest.fn(async () => badJson(200));
    await expect(fetchCourseWithRetry("c1", f, fast)).rejects.toThrow();
  });

  test("403 مايتعادش", async () => {
    const f = jest.fn(async () => json({ error: "forbidden" }, 403));
    await expect(fetchCourseWithRetry("c1", f, fast)).rejects.toThrow("forbidden");
    expect(f).toHaveBeenCalledTimes(1);
  });
});
