// app/api/meetings/[id]/route.js
//
// PUT/DELETE على اجتماع واحد — صاحب الاجتماع (المدرس اللي أنشأه) أو أدمن
// بس. عكس Announcement (حذف بس، مفيش تعديل)، هنا سمحنا بـ PUT لأن تفاصيل
// المحاضرة (المعاد، اللينك) بتتغيّر فعليًا أكتر من إعلان نصي.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMeetingModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeMeeting(m) {
  return {
    id: m._id.toString(),
    course: m.course.toString(),
    teacher: m.teacher.toString(),
    title: m.title,
    description: m.description || "",
    link: m.link,
    scheduledAt: m.scheduledAt,
    durationMinutes: m.durationMinutes,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Meeting = getMeetingModel();
    const meeting = await Meeting.findById(id);
    if (!meeting) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (!isOwnerOrAdmin(session, meeting.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "invalid_body" }, 400);

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonResponse({ error: "missing_title" }, 400);
      meeting.title = title.slice(0, 200);
    }
    if (body.description !== undefined) {
      meeting.description = String(body.description).trim().slice(0, 2000);
    }
    if (body.link !== undefined) {
      const link = String(body.link).trim();
      if (!link || !isValidHttpUrl(link)) return jsonResponse({ error: "invalid_link" }, 400);
      meeting.link = link;
    }
    if (body.scheduledAt !== undefined) {
      const scheduledAt = new Date(body.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) return jsonResponse({ error: "invalid_scheduled_at" }, 400);
      meeting.scheduledAt = scheduledAt;
    }
    if (body.durationMinutes !== undefined) {
      let durationMinutes = Number(body.durationMinutes);
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) durationMinutes = 60;
      meeting.durationMinutes = Math.min(480, Math.max(5, Math.round(durationMinutes)));
    }

    await meeting.save();
    return jsonResponse(serializeMeeting(meeting));
  } catch (err) {
    console.error("[/api/meetings/[id]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Meeting = getMeetingModel();
    const meeting = await Meeting.findById(id);
    if (!meeting) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (!isOwnerOrAdmin(session, meeting.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    await meeting.deleteOne();
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/meetings/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}