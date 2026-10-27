// app/lib/placementTestPdfParser.test.js
//
// رفع اختبار تحديد المستوى من PDF/TXT بالصيغة الثابتة:
//   - القالب (نص + PDF حقيقي) بيتقري وبيطلع نفس SAMPLE_TEST (هيكل + مفتاح + أوديو + سكريبتات).
//   - round-trip على A1/A2/B1 المدمجة: تصدير للصيغة ← قراءة ← نفس الأسئلة/الإجابات/أماكن الأوديو.
//   - قاعدة الأوديو: علامة للمهمة كلها / لسؤال وللي بعده / للجزء كله / ترقيم يدوي / [NO AUDIO].
//   - الأخطاء برقم السطر + مقتطف، والاختبار الناتج بيشتغل بنفس منطق التصحيح القديم.

import { parsePlacementTestText, parsePlacementTestPdf, testToPlacementText, cleanPdfText } from "@/app/lib/placementTestPdfParser";
import { buildSampleTemplateText, buildSampleTemplatePdf, textToPdfBuffer } from "@/app/lib/placementTestPdfTemplate";
import { SAMPLE_TEST } from "@/app/lib/placementTestTemplate";
import { PLACEMENT_TESTS, getVisiblePartsFor } from "@/app/lib/placementTests";
import { getAnswerKey } from "@/app/lib/placementTestKeys";
import { getAudioScript } from "@/app/lib/placementAudioScripts";
import { scoreAnswers } from "@/app/lib/placementTest";

jest.mock("@/app/lib/models", () => ({ getCourseModel: jest.fn(), getCategoryModel: jest.fn() }));

const HEAD = "TEST: t1 | LEVEL: B1 | TITLE: My test\n";
const wrap = (body) => `${HEAD}\nPART: Reading | 20\n${body}`;
const en = (r) => r.errors.map((e) => e.en);

// الأوديو/الأسئلة كـ { "Part › Task › n": slot } للمقارنة
function audioMap(test) {
  const out = {};
  for (const p of test.parts)
    for (const t of p.tasks) {
      if (t.audioSlot !== undefined) out[`${p.title}|${t.title}|task`] = t.audioSlot;
      for (const q of t.questions) if (q.audioSlot !== undefined) out[`${p.title}|${t.title}|${q.n}`] = q.audioSlot;
    }
  return out;
}

const stripIds = (parts) => parts.map(({ id, ...p }) => p);
// المفاتيح المدمجة فيها "s" (مستوى فرعي للسؤال)؛ الاختبارات المخصصة بتخزّن الإجابة "a" بس
const onlyA = (key) => Object.fromEntries(Object.entries(key).map(([n, k]) => [n, { a: k.a }]));

describe("القالب", () => {
  it("نص القالب بيتقري وبيطلع نفس SAMPLE_TEST", async () => {
    const r = await parsePlacementTestText(buildSampleTemplateText());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.stats).toEqual({ parts: 3, tasks: 5, questions: 11, matchingTasks: 1, audioSlots: 3 });
    expect(r.test.parts).toEqual(SAMPLE_TEST.parts);
    expect(r.test.answerKey).toEqual(SAMPLE_TEST.answerKey);
    expect(r.test.audioSlots.map(({ slot, label }) => ({ slot, label }))).toEqual(SAMPLE_TEST.audioSlots.map(({ slot, label }) => ({ slot, label })));
    expect(r.test.scripts).toEqual(SAMPLE_TEST.scripts);
    expect(r.test.levels.map((l) => l.code)).toEqual(["Pre-B1", "B1.1", "B1.2", "B1.3"]);
  });

  it("قالب الـ PDF الحقيقي (pdf-lib → pdf-parse) بيتقري بنجاح بنفس النتيجة", async () => {
    const pdf = await buildSampleTemplatePdf();
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    const r = await parsePlacementTestPdf(pdf);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.test.parts).toEqual(SAMPLE_TEST.parts);
    expect(r.test.answerKey).toEqual(SAMPLE_TEST.answerKey);
    expect(r.test.scripts).toEqual(SAMPLE_TEST.scripts);
  });
});

describe("round-trip على الاختبارات المدمجة", () => {
  for (const id of ["a1", "a2", "b1"]) {
    const def = PLACEMENT_TESTS[id];
    const scripts = {};
    for (const a of def.audioSlots) {
      const s = getAudioScript(id, a.slot);
      if (s) scripts[a.slot] = typeof s === "string" ? s : s.script || s.text || "";
    }
    const source = {
      id: `rt-${id}`,
      label: def.label.toUpperCase(),
      title: def.title,
      subject: "es",
      thresholds: [40, 60, 80],
      parts: def.parts,
      answerKey: getAnswerKey(id),
      audioSlots: def.audioSlots,
      scripts,
    };

    it(`${id}: نص ← قراءة بيرجّع نفس الأسئلة والإجابات وأماكن الأوديو`, async () => {
      const r = await parsePlacementTestText(testToPlacementText(source));
      expect(r.errors).toEqual([]);
      expect(r.ok).toBe(true);
      const flat = (parts) => parts.flatMap((p) => p.tasks.flatMap((t) => t.questions.map((q) => [p.title, t.title, q.n, q.ln, q.q, q.ctx, q.o])));
      expect(flat(r.test.parts)).toEqual(flat(source.parts));
      expect(r.test.answerKey).toEqual(onlyA(source.answerKey));
      expect(audioMap(r.test)).toEqual(audioMap(source));
      expect(r.test.audioSlots.map((a) => a.slot)).toEqual(source.audioSlots.map((a) => a.slot));
      expect(r.test.scripts).toEqual(source.scripts);
      // مهام الربط (bank) + التعليمات + النصوص المشتركة
      const meta = (parts) => parts.flatMap((p) => p.tasks.map((t) => [t.title, t.intro || "", t.passage || "", t.bank]));
      expect(meta(r.test.parts)).toEqual(meta(source.parts));
      expect(stripIds(r.test.parts).map((p) => p.minutes)).toEqual(stripIds(source.parts).map((p) => p.minutes));
    });

    it(`${id}: الاختبار الناتج بيتصحّح بنفس منطق القديم (إجابات صح = 100%)`, async () => {
      const r = await parsePlacementTestText(testToPlacementText(source));
      const audio = Object.fromEntries(r.test.audioSlots.map((a) => [a.slot, "x.mp3"]));
      const answers = Object.fromEntries(Object.entries(r.test.answerKey).map(([n, k]) => [n, k.a]));
      const res = scoreAnswers(answers, audio, r.test);
      expect(res.percent ?? res.score).toBeDefined();
      expect(getVisiblePartsFor(r.test, audio).length).toBe(r.test.parts.length);
    });
  }

  it("a2: round-trip عن طريق PDF حقيقي", async () => {
    const def = PLACEMENT_TESTS.a2;
    const source = { id: "rt-a2", label: "A2", title: def.title, subject: "es", parts: def.parts, answerKey: getAnswerKey("a2"), audioSlots: def.audioSlots, scripts: {} };
    const pdf = await textToPdfBuffer(testToPlacementText(source));
    const r = await parsePlacementTestPdf(pdf);
    expect(r.errors).toEqual([]);
    expect(r.test.answerKey).toEqual(onlyA(source.answerKey));
    expect(audioMap(r.test)).toEqual(audioMap(source));
  });
});

describe("قاعدة الأوديو", () => {
  const Q = (n, extra = "") => `Q: Question ${n}?\n${extra}a) one\nb) two\nANSWER: a\n`;

  it("علامة واحدة تحت TASK قبل أول سؤال = أوديو للمهمة كلها", async () => {
    const r = await parsePlacementTestText(wrap(`TASK: T1\n[AUDIO]\nSCRIPT: hello\n${Q(1)}${Q(2)}`));
    expect(r.errors).toEqual([]);
    expect(r.test.parts[0].tasks[0].audioSlot).toBe(1);
    expect(r.test.parts[0].tasks[0].questions.every((q) => q.audioSlot === undefined)).toBe(true);
    expect(r.test.scripts).toEqual({ 1: "hello" });
  });

  it("علامات قبل كل سؤال = أوديو لكل سؤال، والعلامة بتغطي اللي بعدها لحد العلامة التالية", async () => {
    const r = await parsePlacementTestText(wrap(`TASK: T1\n[AUDIO]\n${Q(1)}${Q(2)}[AUDIO]\n${Q(3)}`));
    expect(r.errors).toEqual([]);
    const t = r.test.parts[0].tasks[0];
    expect(t.audioSlot).toBeUndefined();
    expect(t.questions.map((q) => q.audioSlot)).toEqual([1, 1, 2]);
    expect(r.test.audioSlots.map((a) => a.slot)).toEqual([1, 2]);
  });

  it("علامة جوه السؤال = للسؤال ده وللي بعده", async () => {
    const r = await parsePlacementTestText(wrap(`TASK: T1\n${Q(1)}Q: Question 2?\n[AUDIO]\na) one\nb) two\nANSWER: b\n${Q(3)}`));
    expect(r.errors).toEqual([]);
    expect(r.test.parts[0].tasks[0].questions.map((q) => q.audioSlot)).toEqual([undefined, 1, 1]);
  });

  it("[NO AUDIO] بتوقف التغطية", async () => {
    const r = await parsePlacementTestText(wrap(`TASK: T1\n${Q(1)}[AUDIO]\n${Q(2)}[NO AUDIO]\n${Q(3)}`));
    expect(r.errors).toEqual([]);
    expect(r.test.parts[0].tasks[0].questions.map((q) => q.audioSlot)).toEqual([undefined, 1, undefined]);
  });

  it("ترقيم يدوي: [AUDIO 5] ثابت، والأوتوماتيك بيعدّي الأرقام المحجوزة + الاسم", async () => {
    const r = await parsePlacementTestText(wrap(`TASK: T1\n[AUDIO]\n${Q(1)}[AUDIO 1: Manual one]\n${Q(2)}[AUDIO]\n${Q(3)}`));
    expect(r.errors).toEqual([]);
    expect(r.test.parts[0].tasks[0].questions.map((q) => q.audioSlot)).toEqual([2, 1, 3]);
    expect(r.test.audioSlots.find((a) => a.slot === 1).label).toBe("Manual one");
  });

  it("علامة بعد PART وقبل أول TASK = أوديو لكل مهام الجزء اللي مفيهاش علامات", async () => {
    const r = await parsePlacementTestText(`${HEAD}\nPART: Listening\n[AUDIO 7]\nTASK: A\n${Q(1)}TASK: B\n${Q(2)}TASK: C\n[AUDIO 8]\n${Q(3)}`);
    expect(r.errors).toEqual([]);
    const [a, b, c] = r.test.parts[0].tasks;
    expect([a.audioSlot, b.audioSlot, c.audioSlot]).toEqual([7, 7, 8]);
  });

  it("علامتين من غير سؤال بينهم = خطأ برقم السطر", async () => {
    const r = await parsePlacementTestText(wrap(`TASK: T1\n[AUDIO]\n[AUDIO]\n${Q(1)}`));
    expect(r.ok).toBe(false);
    expect(r.errors[0].line).toBe(6);
  });
});

describe("قراءة الصيغة", () => {
  it("مهمة ربط (BANK) + نص مشترك متعدد الأسطر + تعليق + أرقام صفحات", async () => {
    const r = await parsePlacementTestText(
      wrap(
        [
          "TASK: Match",
          "# a comment",
          "INSTRUCTIONS: Match each person",
          "with a notice.",
          "PASSAGE: First paragraph line one",
          "line two.",
          "",
          "Second paragraph.",
          "BANK:",
          "(A) Pool notice",
          "continues here",
          "(B) Piano lessons",
          "Q: Anna plays music.",
          "ANSWER: B",
          "2",
          "Q: Tom swims.",
          "ANSWER: (A)",
        ].join("\n")
      )
    );
    expect(r.errors).toEqual([]);
    const t = r.test.parts[0].tasks[0];
    expect(t.intro).toBe("Match each person with a notice.");
    expect(t.passage).toBe("First paragraph line one line two.\n\nSecond paragraph.");
    expect(t.bank).toEqual([{ l: "A", t: "Pool notice continues here" }, { l: "B", t: "Piano lessons" }]);
    expect(r.test.answerKey).toEqual({ 1: { a: 1 }, 2: { a: 0 } });
    expect(r.stats.matchingTasks).toBe(1);
  });

  it("السؤال ممكن ياخد CONTEXT قبله أو بعده، وإجابة بنص الخيار نفسه", async () => {
    const r = await parsePlacementTestText(wrap("TASK: T\nCONTEXT: before ctx\nQ: One?\na) red\nb) blue\nANSWER: blue\nQ: Two?\nCONTEXT: after ctx\na) x\nb) y\nANSWER: a\n"));
    expect(r.errors).toEqual([]);
    const qs = r.test.parts[0].tasks[0].questions;
    expect(qs.map((q) => q.ctx)).toEqual(["before ctx", "after ctx"]);
    expect(r.test.answerKey[1].a).toBe(1);
  });

  it("الإعدادات: LANGUAGE و THRESHOLDS وعنوان فيه | وسطر جديد", async () => {
    const r = await parsePlacementTestText("TEST: b2 | LEVEL: B2 | TITLE: Prueba | de nivel | LANGUAGE: es | THRESHOLDS: 30,50,70\nPART: P | 12\nTASK: T\nQ: x?\na) 1\nb) 2\nANSWER: b\n");
    expect(r.errors).toEqual([]);
    expect(r.test.id).toBe("b2");
    expect(r.test.title).toBe("Prueba | de nivel");
    expect(r.test.thresholds).toEqual([30, 50, 70]);
    expect(r.test.parts[0].minutes).toBe(12);
  });

  it("cleanPdfText: ligatures و bidi marks و NBSP", () => {
    expect(cleanPdfText("\uFEFFof\ufb01ce\u200f\u00a0x\r\ny")).toBe("office x\ny");
  });
});

describe("الأخطاء", () => {
  it("مفيش سطر TEST", async () => {
    const r = await parsePlacementTestText("PART: P\nTASK: T\nQ: x?\na) 1\nb) 2\nANSWER: a\n");
    expect(r.ok).toBe(false);
    expect(en(r)[0]).toMatch(/TEST/);
  });

  it("PDF من غير نص (صورة) = رسالة واضحة", async () => {
    const r = await parsePlacementTestText("   \n ");
    expect(r.ok).toBe(false);
    expect(r.errors[0].ar).toMatch(/نص/);
  });

  it("أخطاء الـ importer بترجع برقم سطر الـ PDF + مقتطف", async () => {
    const r = await parsePlacementTestText(wrap("TASK: T\nQ: Fine?\na) 1\nb) 2\nANSWER: a\nQ: Bad answer?\na) 1\nb) 2\nANSWER: z\n"));
    expect(r.ok).toBe(false);
    const e = r.errors.find((x) => /Correct Answer/.test(x.en));
    expect(e.line).toBe(9); // سطر السؤال اللي فيه المشكلة
    expect(e.excerpt).toMatch(/Bad answer/);
  });

  it("سؤال من غير إجابة، وخيارات مش بالترتيب، ونص مش مفهوم", async () => {
    const r1 = await parsePlacementTestText(wrap("TASK: T\nQ: x?\na) 1\nb) 2\n"));
    expect(en(r1).some((m) => /Correct Answer is empty/.test(m))).toBe(true);
    const r2 = await parsePlacementTestText(wrap("TASK: T\nQ: x?\na) 1\nc) 2\nANSWER: a\n"));
    expect(en(r2)[0]).toMatch(/in order/);
    const r3 = await parsePlacementTestText(wrap("TASK: T\nQ: x?\na) 1\nb) 2\nANSWER: a\nstray text\n"));
    expect(en(r3)[0]).toMatch(/Unexpected text/);
    expect(r3.errors[0].line).toBe(9);
  });

  it("مهمة بلا أسئلة بتتجاهل بتحذير، و ID محجوز بيتمنع (قاعدة الـ importer)", async () => {
    const r = await parsePlacementTestText(`${HEAD}\nPART: P\nTASK: Empty\nTASK: T\nQ: x?\na) 1\nb) 2\nANSWER: a\n`);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /no questions/.test(w.en))).toBe(true);
    const reserved = await parsePlacementTestText("TEST: a2 | LEVEL: A2 | TITLE: x\nPART: P\nTASK: T\nQ: x?\na) 1\nb) 2\nANSWER: a\n");
    expect(reserved.ok).toBe(false);
    expect(reserved.errors[0].line).toBe(1);
  });
});
