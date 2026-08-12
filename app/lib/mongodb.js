// lib/mongodb.js
// نقطة اتصال واحدة بالداتابيز ونموذج (Model) واحد لكولكشن الـ auth،
// عشان كل الملفات اللي بتتعامل مع المستخدمين تستخدم نفس المنطق بدل ما يتكرر.

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

if (!globalThis._mongo) globalThis._mongo = { conn: null, promise: null };
if (!globalThis._mongoModels) globalThis._mongoModels = {};

export async function connectToMongo() {
  if (globalThis._mongo.conn) return globalThis._mongo.conn;
  if (!MONGO_URI) throw new Error("MONGO_URI is not defined");

  if (!globalThis._mongo.promise) {
    globalThis._mongo.promise = mongoose
      .connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then((m) => m);
  }

  globalThis._mongo.conn = await globalThis._mongo.promise;
  return globalThis._mongo.conn;
}

const authSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

export function getAuthModel() {
  const modelName = "Model_auth";
  if (globalThis._mongoModels["auth"]) return globalThis._mongoModels["auth"];
  const Model = mongoose.models[modelName] || mongoose.model(modelName, authSchema, "auth");
  globalThis._mongoModels["auth"] = Model;
  return Model;
}
