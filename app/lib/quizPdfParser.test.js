// app/lib/quizPdfParser.test.js
//
// محلل PDF بنك الأسئلة: لازم النص اللي يتخزّن يطلع زي اللي كان هيتكتب يدوي في فورم
// الإضافة (من غير شوائب استخراج PDF، ومن غير قطع في الخيارات الطويلة).

import { parseQuizPdfText, sanitizeExtractedText } from "@/app/lib/quizPdfParser";

describe("sanitizeExtractedText", () => {
  it("بيشيل رموز الاتجاه/العرض الصفري و soft-hyphen و BOM", () => {
    expect(sanitizeExtractedText("\u200Fس1:\u202B نص\u202C\u200B السؤال\uFEFF\u00AD")).toBe("س1: نص السؤال");
  });

  it("بيحوّل NBSP وأشكال المسافات لمسافة عادية", () => {
    expect(sanitizeExtractedText("a\u00A0b\u2003c\u202Fd")).toBe("a b c d");
  });

  it("بيرجّع أشكال الحروف العربية (Presentation Forms) لحروفها الأصلية", () => {
    // ﻣﺼﺮ (أشكال متصلة) → مصر
    expect(sanitizeExtractedText("\uFEE3\uFEBA\uFEAE")).toBe("مصر");
    // ligature لام-ألف
    expect(sanitizeExtractedText("\uFEFB")).toBe("لا");
  });

  it("ligatures اللاتينية → حروف عادية، من غير ما يمسّ x² و ½", () => {
    expect(sanitizeExtractedText("\uFB01nd o\uFB00")).toBe("find off");
    expect(sanitizeExtractedText("x² + ½")).toBe("x² + ½");
  });
});

describe("parseQuizPdfText — اختيار من متعدد", () => {
  it("سؤال عادي بالعربي: نص + خيارات + إجابة + درجة", () => {
    const { questions, errors } = parseQuizPdfText(
      ["س1: ما عاصمة مصر؟", "أ) الإسكندرية", "ب) القاهرة", "ج) الأقصر", "د) أسوان", "الإجابة الصحيحة: ب", "الدرجة: 2"].join("\n")
    );
    expect(errors).toEqual([]);
    expect(questions).toEqual([
      {
        type: "multiple_choice",
        text: "ما عاصمة مصر؟",
        points: 2,
        lang: "ar",
        options: [
          { text: "الإسكندرية", isCorrect: false },
          { text: "القاهرة", isCorrect: true },
          { text: "الأقصر", isCorrect: false },
          { text: "أسوان", isCorrect: false },
        ],
      },
    ]);
  });

  it("خيار طويل اتكسر على سطرين في الـ PDF بيتخزّن كامل (مش مقطوع)", () => {
    const { questions } = parseQuizPdfText(
      [
        "Question 1: Which statement is correct?",
        "A) The Nile flows from south",
        "to north through Egypt",
        "B) The Nile flows west",
        "Answer: A",
      ].join("\n")
    );
    expect(questions[0].options.map((o) => o.text)).toEqual([
      "The Nile flows from south to north through Egypt",
      "The Nile flows west",
    ]);
  });

  it("رقم صفحة تايه بين الخيارات مش بيتلزق في آخر خيار", () => {
    const { questions } = parseQuizPdfText(
      ["Q1: Pick one", "A) first", "B) second", "2", "Page 3", "- 4 -", "Answer: B"].join("\n")
    );
    expect(questions[0].options.map((o) => o.text)).toEqual(["first", "second"]);
  });

  it("سؤال بيمتد لأكتر من سطر بيتجمّع في سطر واحد بمسافات مفردة", () => {
    const { questions } = parseQuizPdfText(["Q1: first line", "second   line", "A) x", "B) y", "Answer: A"].join("\n"));
    expect(questions[0].text).toBe("first line second line");
  });

  it("الرموز الخفية اللي Word بيحطها حوالين العربي مبتتخزنش", () => {
    const { questions } = parseQuizPdfText(
      ["\u200Fس1: \u202Bما لون السماء؟\u202C", "أ) \u200Fأزرق", "ب) أحمر", "الإجابة: أ"].join("\n")
    );
    expect(questions[0].text).toBe("ما لون السماء؟");
    expect(questions[0].options[0].text).toBe("أزرق");
  });

  it("إجابة بأكتر من حرف بتطلع isCorrect لأكتر من خيار (الراوت هو اللي بيرفضها)", () => {
    const { questions } = parseQuizPdfText(["Q1: x", "A) 1", "B) 2", "C) 3", "Answer: A, B"].join("\n"));
    expect(questions[0].options.filter((o) => o.isCorrect)).toHaveLength(2);
  });

  it("الإجابة بنص الخيار بدل الرمز شغالة", () => {
    const { questions } = parseQuizPdfText(["Q1: x", "A) Cairo", "B) Giza", "Answer: Giza"].join("\n"));
    expect(questions[0].options.map((o) => o.isCorrect)).toEqual([false, true]);
  });
});

describe("parseQuizPdfText — صح / خطأ", () => {
  it("عربي: نفس نص الفورم اليدوي بالظبط (صح ثم خطأ)", () => {
    const { questions } = parseQuizPdfText(["نوع الأسئلة: صح وغلط", "س1: القاهرة عاصمة مصر", "الإجابة: صح"].join("\n"));
    expect(questions[0].options).toEqual([
      { text: "صح", isCorrect: true },
      { text: "خطأ", isCorrect: false },
    ]);
  });

  it("إنجليزي: True ثم False", () => {
    const { questions } = parseQuizPdfText(["Q1: The earth is flat.", "Answer: False"].join("\n"));
    expect(questions[0].type).toBe("true_false");
    expect(questions[0].options).toEqual([
      { text: "True", isCorrect: false },
      { text: "False", isCorrect: true },
    ]);
  });
});

describe("parseQuizPdfText — أخطاء", () => {
  it("سؤال من غير إجابة = missing_answer", () => {
    const { questions, errors } = parseQuizPdfText(["Q1: x", "A) 1", "B) 2"].join("\n"));
    expect(questions).toEqual([]);
    expect(errors[0].reason).toBe("missing_answer");
  });

  it("إجابة مش مطابقة لأي خيار = answer_not_matched_to_option", () => {
    const { errors } = parseQuizPdfText(["Q1: x", "A) 1", "B) 2", "Answer: Z"].join("\n"));
    expect(errors[0].reason).toBe("answer_not_matched_to_option");
  });
});
