// app/api/data/route.js

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.warn("Warning: MONGO_URI not defined in environment");
}

if (!globalThis._mongo) globalThis._mongo = { conn: null, promise: null };
if (!globalThis._mongoModels) globalThis._mongoModels = {};

async function connectToMongo() {
  if (globalThis._mongo.conn) return globalThis._mongo.conn;
  if (!MONGO_URI) throw new Error("Please set MONGO_URI environment variable");

  if (!globalThis._mongo.promise) {
    globalThis._mongo.promise = mongoose
      .connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  globalThis._mongo.conn = await globalThis._mongo.promise;
  return globalThis._mongo.conn;
}
const schema = new mongoose.Schema({}, { strict: false, timestamps: true });


function normalizeModelName(name) {
  return `Model_${String(name).replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function getModelForCollection(collectionName) {
  const name = String(collectionName);
  if (globalThis._mongoModels[name]) return globalThis._mongoModels[name];

  const modelName = normalizeModelName(name);

  // ✅ لو الموديل ده كان متسجل قبل كده بسكيمة قديمة (قبل إضافة timestamps)، امسحه وسجله تاني بالسكيمة الجديدة
  const existing = mongoose.models[modelName];
  if (existing && !existing.schema.options.timestamps) {
    delete mongoose.models[modelName];
    if (mongoose.modelSchemas) delete mongoose.modelSchemas[modelName];
  }

  const Model = mongoose.models[modelName] || mongoose.model(modelName, schema, name);
  globalThis._mongoModels[name] = Model;
  return Model;
}

async function listCollections() {
  await connectToMongo();
  const cols = await mongoose.connection.db.listCollections().toArray();
  return cols
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."));
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function parseBody(request) {
  try {
    return await request.json();
  } catch (err) {
    return null;
  }
}

function getSearchParams(request) {
  const url = new URL(request.url);
  return {
    collection: url.searchParams.get("collection"),
    id: url.searchParams.get("id"),
  };
}

// ===== Resend Email Notification =====
// لازم تضيف المتغيرات دي في .env:
// RESEND_API_KEY=your_resend_api_key
// RESEND_FROM_EMAIL=onboarding@resend.dev  (أو دومين متحقق منه في Resend)
// RESEND_TO_EMAIL=hanynan8@gmail.com
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// ⚠️ لازم دومين edumaster365 يكون متوثق (verified) في لوحة Resend عشان الإرسال من notifications@ يشتغل
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "notifications@edumaster365.com";
const RESEND_TO_EMAIL = process.env.RESEND_TO_EMAIL || "info@edumaster365.com";
// 🖼️ حط رابط اللوجو هنا مباشرة (لازم يكون رابط عام/مباشر للصورة، مش رابط صفحة)
const RESEND_LOGO_URL = "https://raw.githubusercontent.com/hanynan8/e-commerce/refs/heads/main/WhatsApp%20Image%202026-04-04%20at%2012.54.46%20PM.jpeg";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function notifyViaResend(data) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  try {
    const submittedAt = data?.createdAt ? new Date(data.createdAt) : new Date();
    const formattedDate = submittedAt.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const name = escapeHtml(data?.name);
    const email = escapeHtml(data?.email);
    const phone = escapeHtml(data?.phone);
    const service = escapeHtml(data?.service);
    const message = escapeHtml(data?.message);
    const logoUrl = RESEND_LOGO_URL;

    const row = (label, value) => `
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #dbeafe;" dir="ltr" align="left">
                      <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#C9A227;margin-bottom:4px;">
                        ${label}
                      </div>
                      <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;font-weight:600;line-height:1.5;">
                        ${value || "—"}
                      </div>
                    </td>
                  </tr>`;

    const mailtoRow = (label, value) => `
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #dbeafe;" dir="ltr" align="left">
                      <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#C9A227;margin-bottom:4px;">
                        ${label}
                      </div>
                      <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;">
                        ${value ? `<a href="mailto:${value}" style="color:#2563eb;font-weight:600;text-decoration:none;">${value}</a>` : "—"}
                      </div>
                    </td>
                  </tr>`;

    const html = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;900&family=Tajawal:wght@400;700;800&family=Great+Vibes&display=swap');
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#eef2ff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #dbeafe;">

            <!-- Header -->
            <tr>
              <td style="background-color:#1E3561;padding:24px 32px;" dir="ltr" align="left">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    ${logoUrl ? `
                    <td valign="middle" style="padding-right:16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="border-radius:50%;width:56px;height:56px;">
                        <tr>
                          <td align="center" valign="middle" style="width:56px;height:56px;border-radius:50%;overflow:hidden;border:2px solid rgba(201,162,39,0.3);">
                            <img src="${logoUrl}" alt="Edumaster" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:50%;object-fit:cover;border:0;" />
                          </td>
                        </tr>
                      </table>
                    </td>` : ""}
                    <td valign="middle" align="left">
                      <span style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;color:#C9A227;letter-spacing:0.5px;">
                        Edumaster
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="height:3px;background-color:#C9A227;line-height:0;font-size:0;">&nbsp;</td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding:28px 32px 4px 32px;" dir="ltr" align="left">
                <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C9A227;margin-bottom:8px;">
                  New Message
                </div>
                <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;color:#1e293b;">
                  You've received a new message from the Edumaster website
                </div>
              </td>
            </tr>

            <!-- Details -->
            <tr>
              <td style="padding:12px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row("Name", name)}
                  ${mailtoRow("Email", email)}
                  ${row("Phone", phone)}
                  ${row("Requested Service", service)}
                  ${row("Message", message)}
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px 24px 32px;" dir="ltr" align="left">
                <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;">
                  Submitted on ${formattedDate}
                </div>
              </td>
            </tr>

            <tr>
              <td style="background-color:#0a0a0a;padding:22px 32px;" dir="ltr" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td valign="middle" style="padding-right:6px;">
                      <span style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:12px;color:#b3b3b3;letter-spacing:0.2px;">
                        Edumaster Website system. Developed by
                      </span>
                    </td>
                    <td valign="middle">
                      <span style="font-family:'Great Vibes',cursive;font-size:22px;color:#C9A227;line-height:1;">
                        ENG: Hany Younan
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [RESEND_TO_EMAIL],
        subject: "New Contact Form Submission — Edumaster",
        html,
        reply_to: data?.email || undefined,
      }),
    });

    // ✅ نسجل الرد كامل دايمًا، مش بس لما يفشل
    const resBody = await res.text();
    console.log("Resend response status:", res.status, res.ok);
    console.log("Resend response body:", resBody);

    if (!res.ok) {
      console.error("Resend notification failed:", resBody);
    }
  } catch (err) {
    console.error("Resend notification error:", err);
  }
}
export async function GET(request) {
  try {
    await connectToMongo();
    const { collection, id } = getSearchParams(request);

    if (!collection) {
      const colNames = await listCollections();
      const results = await Promise.all(
        colNames.map(async (name) => {
          const Model = getModelForCollection(name);
          return Model.find({});
        })
      );

      const payload = colNames.reduce((acc, name, idx) => {
        acc[name] = results[idx];
        return acc;
      }, {});

      return jsonResponse(payload, 200);
    }

    const colName = String(collection);
    const existingCols = await listCollections();
    if (!existingCols.includes(colName)) {
      return jsonResponse({ error: `Collection '${colName}' not found` }, 404);
    }

    const Model = getModelForCollection(colName);

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "Invalid id format" }, 400);
      const doc = await Model.findById(id);
      if (!doc) return jsonResponse({ error: "Document not found" }, 404);
      return jsonResponse(doc, 200);
    }

    const docs = await Model.find({});
    return jsonResponse(docs, 200);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
}

export async function POST(request) {
  try {
    await connectToMongo();
    const { collection } = getSearchParams(request);
    if (!collection) return jsonResponse({ error: "Collection is required" }, 400);

    const colName = String(collection);
    const Model = getModelForCollection(colName);

    const body = await parseBody(request);
    const now = new Date();

    if (Array.isArray(body)) {
      const withDates = body.map((item) => ({
        ...item,
        createdAt: now,
        updatedAt: now,
      }));
      const created = await Model.insertMany(withDates);
      return jsonResponse(created, 201);
    } else {
      const dataWithDate = { ...body, createdAt: now, updatedAt: now };
      const created = await Model.create(dataWithDate);

if (colName === "form") {
  await notifyViaResend(created); // ✅ Resend بدل Formspree
}

      return jsonResponse(created, 201);
    }
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
}
export async function PUT(request) {
  try {
    await connectToMongo();
    const { collection, id } = getSearchParams(request);
    if (!collection) return jsonResponse({ error: "Collection is required" }, 400);
    if (!id) return jsonResponse({ error: "ID is required for PUT" }, 400);
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "Invalid id format" }, 400);

    const colName = String(collection);
    const existingCols = await listCollections();
    if (!existingCols.includes(colName)) return jsonResponse({ error: "Collection not found" }, 404);

    const Model = getModelForCollection(colName);

    const body = await parseBody(request);
    const updated = await Model.findByIdAndUpdate(id, body, { new: true, runValidators: false });
    if (!updated) return jsonResponse({ error: "Document not found" }, 404);
    return jsonResponse(updated, 200);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
}

export async function DELETE(request) {
  try {
    await connectToMongo();
    const { collection, id } = getSearchParams(request);
    if (!collection) return jsonResponse({ error: "Collection is required" }, 400);
    if (!id) return jsonResponse({ error: "ID is required for DELETE" }, 400);
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "Invalid id format" }, 400);

    const colName = String(collection);
    const existingCols = await listCollections();
    if (!existingCols.includes(colName)) return jsonResponse({ error: "Collection not found" }, 404);

    const Model = getModelForCollection(colName);

    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted) return jsonResponse({ error: "Document not found" }, 404);
    return jsonResponse(deleted, 200);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err.message || "Internal server error" }, 500);
  }
}