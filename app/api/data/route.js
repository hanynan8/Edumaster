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

// Formspree Form ID المستخدم في الموقع القديم — بيبعت إشعار إيميل لـ hanynan8@gmail.com
// (العنوان نفسه متسجل في إعدادات الفورم على formspree.io، مش في الكود)
const FORMSPREE_FORM_ID = "xkodkano";
async function notifyViaFormspree(data) {
  try {
    const submittedAt = data?.createdAt ? new Date(data.createdAt) : new Date();
    const formattedDate = submittedAt.toLocaleString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const res = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: data?.name || "",
        email: data?.email || "",
        phone: data?.phone || "",
        service: data?.service || "",
        message: data?.message || "",
        date: formattedDate,
        _subject: "New message from Edumaster website",
      }),
    });

    // ✅ نسجل الرد كامل دايمًا، مش بس لما يفشل
    const resBody = await res.text();
    console.log("Formspree response status:", res.status, res.ok);
    console.log("Formspree response body:", resBody);

    if (!res.ok) {
      console.error("Formspree notification failed:", resBody);
    }
  } catch (err) {
    console.error("Formspree notification error:", err);
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
  await notifyViaFormspree(created); // ✅ ضيف await
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