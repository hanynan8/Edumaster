// app/api/meetings/[id]/route.js
//
// PUT/DELETE على اجتماع واحد — صاحب الاجتماع (المدرس اللي أنشأه) أو أدمن
// بس. عكس Announcement (حذف بس، مفيش تعديل)، هنا سمحنا بـ PUT لأن تفاصيل
// المحاضرة (المعاد، اللينك) بتتغيّر فعليًا أكتر من إعلان نصي.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMeetingModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { deleteDailyRoom, updateDailyRoom } from "@/app/lib/daily";

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
    source: m.source || "manual",
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
      // 🆕 لو المدرس عدّل اللينك يدويًا لاجتماع كان متولّد عن طريق Daily،
      // بقى دلوقتي مصدره "manual" — ونمسح غرفة Daily القديمة (best-effort،
      // مش لازم توقف حفظ التعديل لو الحذف فشل).
      if (meeting.source === "daily" && meeting.link !== link) {
        await deleteDailyRoom(meeting.dailyRoomName);
        meeting.dailyRoomName = null;
        meeting.source = "manual";
      }
      meeting.link = link;
    }
    let scheduleChanged = false;
    if (body.scheduledAt !== undefined) {
      const scheduledAt = new Date(body.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) return jsonResponse({ error: "invalid_scheduled_at" }, 400);
      if (meeting.scheduledAt.getTime() !== scheduledAt.getTime()) scheduleChanged = true;
      meeting.scheduledAt = scheduledAt;
    }
    if (body.durationMinutes !== undefined) {
      let durationMinutes = Number(body.durationMinutes);
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) durationMinutes = 60;
      durationMinutes = Math.min(480, Math.max(5, Math.round(durationMinutes)));
      if (meeting.durationMinutes !== durationMinutes) scheduleChanged = true;
      meeting.durationMinutes = durationMinutes;
    }

    await meeting.save();

    // 🆕 لو المعاد أو المدة اتغيّروا لاجتماع مصدره Daily، لازم نحدّث nbf/exp
    // في الغرفة الفعلية على Daily برضه — وإلا الغرفة تفضل حابسة على المعاد
    // القديم وترفض الدخول حتى لو الداتابيز عندنا محدّثة (شوف تعليق
    // updateDailyRoom في app/lib/daily.js). best-effort: فشل التحديث مايمنعش
    // حفظ التعديل نفسه، بس بنرجّع تحذير واضح للواجهة.
    let dailyWarning = null;
    if (scheduleChanged && meeting.source === "daily" && meeting.dailyRoomName) {
      try {
        const endDate = new Date(meeting.scheduledAt.getTime() + meeting.durationMinutes * 60_000);
        await updateDailyRoom(meeting.dailyRoomName, { startDate: meeting.scheduledAt, endDate });
      } catch (err) {
        console.error("[/api/meetings/[id]] Daily room update failed:", err);
        dailyWarning = "اتحفظ التعديل، لكن حصلت مشكلة في تحديث معاد الغرفة على Daily — لو الرابط رفض الدخول، احذف المحاضرة واعملها تاني.";
      }
    }

    return jsonResponse({ ...serializeMeeting(meeting), ...(dailyWarning ? { warning: dailyWarning } : {}) });
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

    // 🆕 best-effort — لو الاجتماع كان متولّد عن طريق Daily، نمسح الغرفة
    // الفعلية معاه بدل ما نسيبها معلّقة لحد exp (شوف app/lib/daily.js).
    if (meeting.source === "daily" && meeting.dailyRoomName) {
      await deleteDailyRoom(meeting.dailyRoomName);
    }

    await meeting.deleteOne();
    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/meetings/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}