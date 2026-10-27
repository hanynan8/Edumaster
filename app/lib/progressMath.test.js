// app/lib/progressMath.test.js
//
// بيثبّت قواعد حساب أداء الطلاب: نسبة الإكمال (بدون تقريب بيكمّل كورس ناقص)
// واختيار أفضل نتيجة كويز (من غير ما محاولة معلّقة تتعرض "راسب").

import { computeProgress, pickBestQuizResult, isPendingReview } from "./progressMath.js";

const ids = (n, prefix) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

describe("computeProgress", () => {
  it("returns 0% and not complete for a course with no items", () => {
    expect(computeProgress({})).toMatchObject({ totalItems: 0, progressPercent: 0, isComplete: false });
  });

  it("counts non-quiz lessons plus published quizzes, each once", () => {
    const r = computeProgress({
      nonQuizLessonIds: ["l1", "l2"],
      publishedQuizIds: ["q1"],
      completedLessonIds: ["l1", "q-lesson-should-be-ignored"],
      passedQuizIds: ["q1"],
    });
    expect(r).toMatchObject({ totalItems: 3, completedItems: 2, progressPercent: 67, isComplete: false });
  });

  it("ignores passed quizzes that are not published (not in publishedQuizIds)", () => {
    const r = computeProgress({ publishedQuizIds: ["q1"], passedQuizIds: ["q1", "unpublished"] });
    expect(r).toMatchObject({ totalItems: 1, completedItems: 1, isComplete: true, progressPercent: 100 });
  });

  it("does not double count duplicate completed lesson ids", () => {
    const r = computeProgress({ nonQuizLessonIds: ["l1", "l2"], completedLessonIds: ["l1", "l1", "l1"] });
    expect(r).toMatchObject({ completedItems: 1, progressPercent: 50 });
  });

  it("is complete only when every item is done", () => {
    const r = computeProgress({
      nonQuizLessonIds: ["l1", "l2"],
      publishedQuizIds: ["q1"],
      completedLessonIds: ["l1", "l2"],
      passedQuizIds: ["q1"],
    });
    expect(r).toMatchObject({ progressPercent: 100, isComplete: true });
  });

  it("does NOT mark 199/200 as complete (rounding used to give 100%)", () => {
    const lessons = ids(200, "l");
    const r = computeProgress({ nonQuizLessonIds: lessons, completedLessonIds: lessons.slice(0, 199) });
    expect(r.isComplete).toBe(false);
    expect(r.progressPercent).toBe(99);
  });

  it("does NOT mark 299/300 as complete", () => {
    const lessons = ids(300, "l");
    const r = computeProgress({ nonQuizLessonIds: lessons, completedLessonIds: lessons.slice(0, 299) });
    expect(r).toMatchObject({ isComplete: false, progressPercent: 99 });
  });

  it("accepts ObjectId-like values (compared by string)", () => {
    const oid = (s) => ({ toString: () => s });
    const r = computeProgress({ nonQuizLessonIds: [oid("a")], completedLessonIds: [oid("a")] });
    expect(r.isComplete).toBe(true);
  });
});

describe("pickBestQuizResult", () => {
  it("returns null best for no attempts", () => {
    expect(pickBestQuizResult([])).toEqual({ best: null, hasPendingReview: false, attemptsCount: 0 });
  });

  it("picks the highest score among graded attempts", () => {
    const a = { scorePercent: 40, passed: false };
    const b = { scorePercent: 90, passed: true };
    const c = { scorePercent: 70, passed: true };
    expect(pickBestQuizResult([a, b, c]).best).toBe(b);
  });

  it("treats legacy results without status as graded", () => {
    const a = { scorePercent: 50, passed: false };
    expect(isPendingReview(a)).toBe(false);
    expect(pickBestQuizResult([a]).best).toBe(a);
  });

  it("ignores a pending_review attempt even if its temporary score is higher", () => {
    const graded = { scorePercent: 70, passed: true, status: "graded" };
    const pending = { scorePercent: 80, passed: false, status: "pending_review" };
    const out = pickBestQuizResult([graded, pending]);
    expect(out.best).toBe(graded);
    expect(out.hasPendingReview).toBe(true);
    expect(out.attemptsCount).toBe(2);
  });

  it("returns best=null with hasPendingReview when the only attempt is pending", () => {
    const pending = { scorePercent: 30, passed: false, status: "pending_review" };
    expect(pickBestQuizResult([pending])).toEqual({ best: null, hasPendingReview: true, attemptsCount: 1 });
  });

  it("prefers a passed attempt over a higher-scoring failed one (passing score was raised later)", () => {
    const failedHigh = { scorePercent: 75, passed: false, status: "graded" };
    const passedLow = { scorePercent: 65, passed: true, status: "graded" };
    expect(pickBestQuizResult([failedHigh, passedLow]).best).toBe(passedLow);
    expect(pickBestQuizResult([passedLow, failedHigh]).best).toBe(passedLow);
  });
});
