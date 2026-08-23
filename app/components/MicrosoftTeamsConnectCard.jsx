"use client";

// app/components/MicrosoftTeamsConnectCard.jsx
//
// 🆕 المكوّن ده هو "المفتاح" اللي كان ناقص عشان تكامل Microsoft Teams
// (app/api/integrations/microsoft/*) يبقى قابل للاستخدام فعليًا من المدرس.
// الـ backend (connect/callback/disconnect/status + microsoftGraph.js) كان
// كامل وشغال من زمان، لكن مفيش أي زرار في الواجهة كان بيندي عليه.
//
// السلوك:
//   1. عند التحميل: GET /api/integrations/microsoft/status عشان نعرف
//      الحالة (configured / connected / اسم وإيميل الحساب المربوط لو موجود).
//   2. لو الـ backend مش متظبط على السيرفر أصلًا (configured: false) —
//      بنخفي الكارت بالكامل بدل ما نوري زرار هيفشل لو اتضغط (بالظبط
//      زي التعليق الأصلي في route الـ status).
//   3. زرار "اربط حساب Microsoft" = تنقّل كامل للصفحة (مش fetch) لـ
//      GET /api/integrations/microsoft/connect، عشان المتصفح يتبع الـ
//      302 redirect لصفحة تسجيل دخول Microsoft طبيعي.
//   4. بعد الموافقة، الـ callback بيرجّع المستخدم هنا تاني بـ
//      ?ms_connected=1 أو ?ms_error=... — بنقرأهم من الـ URL، نوري
//      رسالة نجاح/فشل مناسبة، ونعمل تنضيف للـ query string بعد كده
//      (history.replaceState) عشان لو عمل refresh ما تتكررش الرسالة.
//   5. زرار "إلغاء الربط" = POST /api/integrations/microsoft/disconnect
//      ثم إعادة تحميل الحالة.
//
// الاستخدام: <MicrosoftTeamsConnectCard locale="ar" /> أو locale="en".

import { useEffect, useState, useCallback } from "react";
import {
  Video,
  Link2,
  Unlink,
  Loader,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

const STRINGS = {
  ar: {
    title: "اجتماعات Microsoft Teams",
    subtitle:
      "اربط حساب Microsoft بتاعك عشان روابط اجتماعات المحاضرات تتولّد تلقائيًا بدل ما تلزقها يدويًا.",
    loading: "جارِ التحقق من حالة الربط...",
    connectBtn: "اربط حساب Microsoft",
    disconnectBtn: "إلغاء الربط",
    disconnecting: "جارِ إلغاء الربط...",
    connectedLabel: "الحساب المربوط",
    connectedSince: "متربط من",
    manualFallbackNote:
      "من غير ربط، لسه تقدر تنشئ اجتماعات عن طريق ما تلزق رابط Teams يدويًا زي الأول.",
    successMsg: "تم ربط حساب Microsoft بنجاح ✓",
    errUnauthorized: "الجلسة انتهت، سجّل دخول تاني وحاول من جديد.",
    errInvalidState: "فشل التحقق من العملية لأسباب أمنية، حاول تاني.",
    errTokenExchange: "حصلت مشكلة أثناء إتمام الربط مع Microsoft، حاول تاني.",
    errMissing: "الرابط اللي رجع من Microsoft ناقص بيانات، حاول تاني.",
    errGeneric: "حصل خطأ أثناء الربط، حاول تاني.",
    disconnectErr: "تعذّر إلغاء الربط، حاول تاني.",
  },
  en: {
    title: "Microsoft Teams Meetings",
    subtitle:
      "Connect your Microsoft account so lecture meeting links are generated automatically instead of pasting them manually.",
    loading: "Checking connection status...",
    connectBtn: "Connect Microsoft Account",
    disconnectBtn: "Disconnect",
    disconnecting: "Disconnecting...",
    connectedLabel: "Connected account",
    connectedSince: "Connected since",
    manualFallbackNote:
      "Without connecting, you can still create meetings by pasting a Teams link manually as before.",
    successMsg: "Microsoft account connected successfully ✓",
    errUnauthorized: "Your session expired, please sign in again and retry.",
    errInvalidState: "Security check failed, please try again.",
    errTokenExchange: "Something went wrong finishing the connection with Microsoft, please retry.",
    errMissing: "Missing data returned from Microsoft, please retry.",
    errGeneric: "Something went wrong connecting your account, please retry.",
    disconnectErr: "Couldn't disconnect the account, please retry.",
  },
};

const ERROR_MAP = {
  unauthorized: "errUnauthorized",
  invalid_state: "errInvalidState",
  token_exchange_failed: "errTokenExchange",
  missing_code_or_state: "errMissing",
};

function formatDate(iso, locale) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function MicrosoftTeamsConnectCard({ locale = "ar", isRTL = true }) {
  const t = STRINGS[locale] || STRINGS.ar;

  const [status, setStatus] = useState(null); // { configured, connected, displayName, email, connectedAt }
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', message }

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/integrations/microsoft/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
    } catch {
      // لو فشل الفحص، نسيب configured=false بدل ما نوري كارت معلّق —
      // أهم حاجة إن المستخدم ميشوفش زرار هيفشل لو ضغط عليه.
      setStatus({ configured: false, connected: false });
    }
    setLoadingStatus(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // قراءة ?ms_connected=1 أو ?ms_error=... من الـ URL بعد الرجوع من الـ
  // callback، وتنضيف الـ query string بعد كده عشان الرسالة ما تتكررش
  // لو المستخدم عمل refresh.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("ms_connected");
    const error = params.get("ms_error");

    if (connected === "1") {
      setBanner({ type: "success", message: t.successMsg });
    } else if (error) {
      const key = ERROR_MAP[error] || "errGeneric";
      setBanner({ type: "error", message: t[key] });
    }

    if (connected || error) {
      params.delete("ms_connected");
      params.delete("ms_error");
      const newSearch = params.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(timer);
  }, [banner]);

  const handleConnect = () => {
    // تنقّل صفحة كامل (مش fetch) عشان المتصفح يتبع الـ redirect لـ
    // Microsoft طبيعي ويبعت الكوكيز الصح.
    window.location.href = "/api/integrations/microsoft/connect";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/microsoft/disconnect", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchStatus();
    } catch {
      setBanner({ type: "error", message: t.disconnectErr });
    }
    setDisconnecting(false);
  };

  // مش متظبط على السيرفر أصلًا → نخفي الكارت بالكامل (زي ما التعليق
  // الأصلي في route الـ status بيقول).
  if (!loadingStatus && status && status.configured === false) {
    return null;
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
          <Video className="text-white" size={20} />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">{t.title}</h3>
          <p className="text-sm text-gray-400">{t.subtitle}</p>
        </div>
      </div>

      {banner && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm font-medium ${
            banner.type === "success"
              ? "bg-green-50 text-green-700 border border-green-100"
              : "bg-red-50 text-red-700 border border-red-100"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

      {loadingStatus ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
          <Loader size={16} className="animate-spin" />
          {t.loading}
        </div>
      ) : status?.connected ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">{t.connectedLabel}</p>
            <p className="text-sm font-semibold text-gray-800">
              {status.displayName || status.email || "—"}
            </p>
            {status.email && status.displayName && (
              <p className="text-xs text-gray-400">{status.email}</p>
            )}
            {status.connectedAt && (
              <p className="text-xs text-gray-400 mt-1">
                {t.connectedSince} {formatDate(status.connectedAt, locale)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            {disconnecting ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Unlink size={16} />
            )}
            {disconnecting ? t.disconnecting : t.disconnectBtn}
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={handleConnect}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Link2 size={16} />
            {t.connectBtn}
            <ExternalLink size={14} className="opacity-70" />
          </button>
          <p className="text-xs text-gray-400 mt-3">{t.manualFallbackNote}</p>
        </div>
      )}
    </div>
  );
}