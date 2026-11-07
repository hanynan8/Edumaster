// app/lib/dailyRooms.test.js
//
// اختبارات "غرفة ثابتة لكل محاضرة": اسم مشتق من الـ _id، إنشاء idempotent، وحارس حساب Daily.
// الهدف: ضمان إن المدرس والطلاب مستحيل يوصلوا لغرفتين مختلفتين لنفس المحاضرة.

import {
  roomNameForMeeting,
  hostOfUrl,
  isSameDailyAccount,
  ensureDailyRoom,
  createDailyRoom,
} from "./daily";

const START = new Date("2026-11-06T17:00:00Z");
const END = new Date(START.getTime() + 130 * 60_000);
const NBF = Math.floor(START.getTime() / 1000) - 15 * 60;
const EXP = Math.floor(END.getTime() / 1000) + 2 * 60 * 60;
const NAME = "edu-6adcafe51c2ca373fd022f40";
const URL_OF = (name, domain = "edumaster365") => `https://${domain}.daily.co/${name}`;

function installFetch(handler) {
  global.fetch = jest.fn(async (url, opts = {}) => {
    const r = handler(String(url), opts.method || "GET", opts.body ? JSON.parse(opts.body) : null);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body ?? {} };
  });
}
const calls = (method) => global.fetch.mock.calls.filter(([, o]) => (o?.method || "GET") === method);

beforeEach(() => {
  process.env.DAILY_API_KEY = "test-key";
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("أسماء الغرف والحساب", () => {
  it("اسم الغرفة مشتق من _id المحاضرة (ثابت)", () => {
    expect(roomNameForMeeting("abc123")).toBe("edu-abc123");
    expect(roomNameForMeeting({ toString: () => "xyz" })).toBe("edu-xyz");
  });

  it("hostOfUrl / isSameDailyAccount", () => {
    expect(hostOfUrl("https://EduMaster365.daily.co/room")).toBe("edumaster365.daily.co");
    expect(isSameDailyAccount(URL_OF("a"), URL_OF("b"))).toBe(true);
    expect(isSameDailyAccount(URL_OF("a"), URL_OF("a", "edumaster"))).toBe(false);
    expect(isSameDailyAccount("not a url", "not a url")).toBe(false);
    expect(isSameDailyAccount("", "")).toBe(false);
  });
});

describe("createDailyRoom بالاسم الثابت", () => {
  it("بيبعت الاسم لـ Daily", async () => {
    installFetch(() => ({ status: 200, body: { name: NAME, url: URL_OF(NAME) } }));
    const r = await createDailyRoom({ name: NAME, startDate: START, endDate: END });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).name).toBe(NAME);
    expect(r).toEqual({ joinUrl: URL_OF(NAME), roomName: NAME });
  });

  it("'already exists' مش خطأ — بيرجّع الغرفة الموجودة بدل ما يفشل", async () => {
    installFetch((url, method) =>
      method === "POST"
        ? { status: 400, body: { error: "invalid-request-error", info: `a room named ${NAME} already exists` } }
        : { status: 200, body: { name: NAME, url: URL_OF(NAME) } }
    );
    const r = await createDailyRoom({ name: NAME, startDate: START, endDate: END });
    expect(r.joinUrl).toBe(URL_OF(NAME));
  });

  it("أي خطأ تاني بيترمي", async () => {
    installFetch(() => ({ status: 500, body: { error: "boom" } }));
    await expect(createDailyRoom({ name: NAME, startDate: START, endDate: END })).rejects.toThrow(/daily_create_room_error/);
  });
});

describe("ensureDailyRoom", () => {
  it("الغرفة موجودة ومعادها سليم → مفيش إنشاء ولا تحديث", async () => {
    installFetch(() => ({ status: 200, body: { name: NAME, url: URL_OF(NAME), config: { nbf: NBF, exp: EXP } } }));
    const r = await ensureDailyRoom({ name: NAME, startDate: START, endDate: END });
    expect(r).toMatchObject({ joinUrl: URL_OF(NAME), roomName: NAME, created: false, scheduleSyncError: null });
    expect(calls("POST")).toHaveLength(0);
  });

  it("404 صريحة → بتتعمل بنفس الاسم", async () => {
    installFetch((url, method) =>
      method === "GET" ? { status: 404 } : { status: 200, body: { name: NAME, url: URL_OF(NAME) } }
    );
    const r = await ensureDailyRoom({ name: NAME, startDate: START, endDate: END });
    expect(r).toMatchObject({ created: true, roomName: NAME, joinUrl: URL_OF(NAME) });
    expect(JSON.parse(calls("POST")[0][1].body).name).toBe(NAME);
  });

  it("خطأ مش 404 (5xx) → بيترمي ومفيش غرفة بتتعمل بالتخمين", async () => {
    installFetch(() => ({ status: 503, body: { error: "unavailable" } }));
    await expect(ensureDailyRoom({ name: NAME, startDate: START, endDate: END })).rejects.toThrow(/daily_get_room_error/);
    expect(calls("POST")).toHaveLength(0);
  });

  it("معاد الغرفة قديم → بيتصحّح بنفس الاسم", async () => {
    installFetch((url, method) =>
      method === "GET"
        ? { status: 200, body: { name: NAME, url: URL_OF(NAME), config: { nbf: NBF - 99999, exp: EXP - 99999 } } }
        : { status: 200, body: { name: NAME, url: URL_OF(NAME) } }
    );
    const r = await ensureDailyRoom({ name: NAME, startDate: START, endDate: END });
    expect(r.scheduleSyncError).toBeNull();
    const [updateUrl, opts] = calls("POST")[0];
    expect(updateUrl).toContain(`/rooms/${NAME}`);
    expect(JSON.parse(opts.body).properties).toEqual({ nbf: NBF, exp: EXP });
  });

  it("فشل تصحيح المعاد مايكسرش الدخول — بيرجّع scheduleSyncError", async () => {
    installFetch((url, method) =>
      method === "GET"
        ? { status: 200, body: { name: NAME, url: URL_OF(NAME), config: { nbf: 1, exp: 2 } } }
        : { status: 500, body: { error: "boom" } }
    );
    const r = await ensureDailyRoom({ name: NAME, startDate: START, endDate: END });
    expect(r.joinUrl).toBe(URL_OF(NAME));
    expect(r.scheduleSyncError).toMatch(/daily_update_room_error/);
  });

  it("سيرفرين بيعملوا الغرفة في نفس اللحظة → الاتنين بيوصلوا لنفس الغرفة بالظبط", async () => {
    // Daily وهمية فيها حالة: الغرفة مش موجودة لحد ما أول POST ينجح، والتاني بياخد 'already exists'.
    const rooms = new Map();
    installFetch((url, method, body) => {
      if (method === "GET") {
        const n = decodeURIComponent(url.split("/rooms/")[1]);
        return rooms.has(n) ? { status: 200, body: rooms.get(n) } : { status: 404 };
      }
      if (rooms.has(body.name)) {
        return { status: 400, body: { info: `a room named ${body.name} already exists` } };
      }
      rooms.set(body.name, { name: body.name, url: URL_OF(body.name) });
      return { status: 200, body: rooms.get(body.name) };
    });
    // GET بتاع الاتنين يتنفّذ قبل أي POST (أسوأ توقيت).
    const [a, b] = await Promise.all([
      ensureDailyRoom({ name: NAME, startDate: START, endDate: END }),
      ensureDailyRoom({ name: NAME, startDate: START, endDate: END }),
    ]);
    expect(a.joinUrl).toBe(b.joinUrl);
    expect(a.roomName).toBe(b.roomName);
    expect(rooms.size).toBe(1);
  });
});
