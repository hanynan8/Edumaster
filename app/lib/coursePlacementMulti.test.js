// app/lib/coursePlacementMulti.test.js
//
// 🆕 الكورس ممكن يتربط بأكتر من اختبار مخصص، والطالب لما يدوس على زرار الاختبار بيفتحله واحد منهم عشوائي.

import {
  getPlacementTestIdsForCourse,
  getPlacementTestForCourse,
  hasLinkedPlacementTest,
  pickRandomPlacementTestId,
  getPlacementTestPath,
} from "@/app/lib/placementLevels";

const mockUpdateMany = jest.fn();
const mockUpdateOne = jest.fn();
const mockFindOne = jest.fn();
const mockFind = jest.fn();

jest.mock("mongoose", () => {
  const col = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    updateMany: (...a) => mockUpdateMany(...a),
    updateOne: (...a) => mockUpdateOne(...a),
    findOne: (...a) => mockFindOne(...a),
    find: (...a) => mockFind(...a),
  };
  const mongoose = { connection: { db: { collection: () => col } }, Types: { ObjectId: { isValid: (v) => /^[0-9a-f]{24}$/i.test(String(v)) } } };
  return { __esModule: true, default: mongoose, ...mongoose };
});

const C1 = "a".repeat(24);
const C2 = "b".repeat(24);

describe("اختيار الاختبار للكورس (helpers)", () => {
  it("كورس مربوط بأكتر من اختبار → كل الـ ids (من غير تكرار)", () => {
    const course = { title: "Any", placementTest: { id: "t1" }, placementTests: [{ id: "t1" }, { id: "t2" }, { id: "t2" }, { id: "t3" }] };
    expect(getPlacementTestIdsForCourse(course)).toEqual(["t1", "t2", "t3"]);
    expect(hasLinkedPlacementTest(course)).toBe(true);
  });

  it("من غير ربط من الأدمن → الاختبار المدمج حسب كود المستوى، وإلا فاضي", () => {
    expect(getPlacementTestIdsForCourse({ title: "Start A1.1" })).toEqual(["a1"]);
    expect(getPlacementTestIdsForCourse({ title: "Cooking class" })).toEqual([]);
    expect(getPlacementTestIdsForCourse(null)).toEqual([]);
    expect(hasLinkedPlacementTest({ title: "Start A1.1" })).toBe(false);
  });

  it("كورس مربوط باختبار واحد بس (الشكل القديم placementTest بدون placementTests) لسه شغال", () => {
    const course = { title: "X", placementTest: { id: "sample-b1" } };
    expect(getPlacementTestForCourse(course)).toBe("sample-b1");
    expect(getPlacementTestIdsForCourse(course)).toEqual(["sample-b1"]);
  });

  it("الاختيار العشوائي: كل id ممكن يطلع، ومفيش خروج عن القايمة", () => {
    const ids = ["t1", "t2", "t3"];
    expect(pickRandomPlacementTestId(ids, () => 0)).toBe("t1");
    expect(pickRandomPlacementTestId(ids, () => 0.5)).toBe("t2");
    expect(pickRandomPlacementTestId(ids, () => 0.999999)).toBe("t3");
    expect(pickRandomPlacementTestId(ids, () => 1)).toBe("t3"); // حماية لو rand رجّعت 1
    const seen = new Set(Array.from({ length: 300 }, () => pickRandomPlacementTestId(ids)));
    expect(seen).toEqual(new Set(ids));
    expect(pickRandomPlacementTestId([])).toBeNull();
    expect(pickRandomPlacementTestId(undefined)).toBeNull();
  });

  it("الرابط الناتج لاختبار مخصص مختار", () => {
    expect(getPlacementTestPath(pickRandomPlacementTestId(["sample-b1"]))).toBe("/level-test/sample-b1");
  });
});

describe("ربط الكورس بأكتر من اختبار (customPlacementTests)", () => {
  let lib;
  beforeAll(async () => {
    lib = await import("@/app/lib/customPlacementTests");
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockResolvedValue({ testId: "t2" });
    mockUpdateOne.mockResolvedValue({ matchedCount: 1 });
  });

  it("ربط كورس باختبار مبيشيلوش من اختبار تاني (مفيش $pull / updateMany)", async () => {
    const res = await lib.updateCustomTestMeta("t2", { courseIds: [C1, C2] });
    expect(res).toEqual({ ok: true });
    expect(mockUpdateMany).not.toHaveBeenCalled();
    const set = mockUpdateOne.mock.calls[0][1].$set;
    expect(set.courseIds).toEqual([C1, C2]);
  });

  it("courseIds غلط → invalid_courses ومفيش حفظ", async () => {
    expect(await lib.updateCustomTestMeta("t2", { courseIds: ["nope"] })).toEqual({ error: "invalid_courses" });
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it("getPlacementLinksForCourses بيرجّع كل الاختبارات المنشورة لكل كورس + الأول للتوافق", async () => {
    mockFind.mockReturnValue({
      toArray: () =>
        Promise.resolve([
          { testId: "t2", label: "B1", courseIds: [C1, C2] },
          { testId: "t1", label: "B1", courseIds: [C1] },
        ]),
    });
    const links = await lib.getPlacementLinksForCourses([C1, C2]);
    expect(links[C1].tests.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(links[C1].id).toBe("t1");
    expect(links[C1].path).toBe("/level-test/t1");
    expect(links[C2].tests.map((t) => t.id)).toEqual(["t2"]);
    expect(await lib.getPlacementLinksForCourses([])).toEqual({});
  });
});
