// app/api/onboarding/route.js
//
// 🆕 خطوات "أول مرة" اللي بتظهر بعد التسجيل مباشرة (زي تدفق Coursera):
// الهدف → الدور الحالي → المهارات المطلوب تطويرها → المستوى التعليمي.
//
//   - GET  → بيرجّع حالة الـ onboarding بتاعة المستخدم الحالي (completed
//     ولا لأ + أي بيانات اتسجلت قبل كده)، عشان صفحة /onboarding تقرر
//     تعرض الخطوات ولا تحوّل المستخدم على طول للداشبورد.
//   - POST → بيسجل بيانات الخطوات الأربعة مرة واحدة (الصفحة بتجمعهم في
//     state وتبعتهم كلهم مع بعض في "Finish")، ويعلّم completed=true.
//
// 🔒 SECURITY: زي /api/profile بالظبط — session.user.id بس هو اللي بيتحدث،
// مفيش userId بيتقرا من الـ body.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { requireSession } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALLOWED_GOALS = [
  "start_career",
  "change_career",
  "grow_current_role",
  "explore_topics",
];

const EDUCATION_LEVELS = [
  "less_than_high_school",
  "high_school",
  "some_college",
  "associate",
  "bachelor",
  "master",
  "professional",
  "doctorate",
];

function serializeOnboarding(u) {
  const o = u?.onboarding || {};
  return {
    completed: !!o.completed,
    goal: o.goal || null,
    currentRole: o.currentRole || null,
    skills: Array.isArray(o.skills) ? o.skills : [],
    educationLevel: o.educationLevel || null,
  };
}

export async function GET() {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findById(auth.session.user.id, "name onboarding").lean();
    if (!user) return jsonResponse({ error: "not_found" }, 404);

    return jsonResponse({ name: user.name || "", onboarding: serializeOnboarding(user) });
  } catch (err) {
    console.error("[/api/onboarding] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const rl = await enforceRateLimit(request, {
      keyPrefix: "onboarding:update",
      limit: 20,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "invalid_body" }, 400);
    }

    const goal = String(body.goal || "").trim();
    const currentRole = String(body.currentRole || "").trim();
    const educationLevel = String(body.educationLevel || "").trim();
    const skills = Array.isArray(body.skills)
      ? body.skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
      : [];

    if (!ALLOWED_GOALS.includes(goal)) {
      return jsonResponse({ error: "invalid_goal" }, 400);
    }
    if (!currentRole || currentRole.length > 80) {
      return jsonResponse({ error: "invalid_role" }, 400);
    }
    if (skills.length === 0) {
      return jsonResponse({ error: "invalid_skills" }, 400);
    }
    if (skills.some((s) => s.length > 60)) {
      return jsonResponse({ error: "invalid_skills" }, 400);
    }
    if (!EDUCATION_LEVELS.includes(educationLevel)) {
      return jsonResponse({ error: "invalid_education" }, 400);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findById(session.user.id);
    if (!user) return jsonResponse({ error: "not_found" }, 404);

    user.onboarding = {
      completed: true,
      completedAt: new Date(),
      goal,
      currentRole,
      skills,
      educationLevel,
    };
    await user.save();

    return jsonResponse({ onboarding: serializeOnboarding(user) });
  } catch (err) {
    console.error("[/api/onboarding] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}