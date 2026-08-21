// app/api/integrations/microsoft/disconnect/route.js
//
// 🆕 POST /api/integrations/microsoft/disconnect — بيمسح حساب Microsoft
// المربوط بالمدرس الحالي. بعدها أي اجتماع جديد هيرجع تلقائيًا للمسار
// اليدوي (source: "manual") لحد ما يربط حسابه تاني.
//
// ملحوظة: ده بيمسح السجل من عندنا بس (التوكنات المخزّنة). مش بيلغي
// الصلاحية من ناحية Microsoft نفسها — لو عايز كده فعليًا، المدرس يقدر
// يروح https://myaccount.microsoft.com/ ويسحب صلاحية التطبيق من هناك.

import { requireRole } from "@/app/lib/rbac";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMicrosoftAccountModel } from "@/app/lib/models/MicrosoftAccount";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST() {
  const auth = await requireRole(["teacher", "admin"]);
  if (auth.response) return auth.response;

  await connectToMongo();
  const MicrosoftAccount = getMicrosoftAccountModel();
  await MicrosoftAccount.deleteOne({ teacher: auth.session.user.id });

  return jsonResponse({ ok: true });
}