// app/lib/dailyWebhook.test.js
//
// صيغة توقيع Daily: base64(HMAC-SHA256(base64Decode(secret), `${timestamp}.${body}`)).

import crypto from "crypto";
import { isValidDailySignature } from "./dailyWebhook";

const secret = Buffer.from("super-secret-key-bytes-1234567890").toString("base64");
const body = JSON.stringify({ type: "recording.ready-to-download", payload: { room_name: "r1", recording_id: "rec1" } });
const ts = "1760000000000";
const sign = (b, t = ts, s = secret) =>
  crypto.createHmac("sha256", Buffer.from(s, "base64")).update(`${t}.${b}`).digest("base64");

describe("isValidDailySignature", () => {
  it("بيقبل توقيع صحيح", () => {
    expect(isValidDailySignature(body, sign(body), ts, secret)).toBe(true);
  });
  it("بيقبل توقيع محسوب على JSON.stringify(event) حتى لو الـ raw body فيه مسافات", () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    expect(isValidDailySignature(pretty, sign(body), ts, secret)).toBe(true);
  });
  it("بيرفض body متعدّل", () => {
    expect(isValidDailySignature(body.replace("rec1", "rec2"), sign(body), ts, secret)).toBe(false);
  });
  it("بيرفض timestamp مختلف أو secret غلط", () => {
    expect(isValidDailySignature(body, sign(body), "1", secret)).toBe(false);
    const other = Buffer.from("another-secret").toString("base64");
    expect(isValidDailySignature(body, sign(body, ts, other), ts, secret)).toBe(false);
  });
  it("بيرفض لو أي هيدر أو secret ناقص", () => {
    expect(isValidDailySignature(body, null, ts, secret)).toBe(false);
    expect(isValidDailySignature(body, sign(body), null, secret)).toBe(false);
    expect(isValidDailySignature(body, sign(body), ts, "")).toBe(false);
  });
  it("صيغة Stripe القديمة (t=..,v1=hex) مش مقبولة", () => {
    const hex = crypto.createHmac("sha256", secret).update(`t=${ts}.${body}`).digest("hex");
    expect(isValidDailySignature(body, `t=${ts},v1=${hex}`, ts, secret)).toBe(false);
  });
});
