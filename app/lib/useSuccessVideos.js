// PATH: app/lib/useSuccessVideos.js
"use client";

// بيجيب فيديوهات قصص النجاح (موقّعة) من /api/success-video — نفس القايمة
// اللي الأدمن بيتحكم فيها من تاب "Success Videos". بيستخدمه الهوم والصفحة
// المخصصة. loading=true لحد ما الرد يوصل، وlist=[] لو فشل أو مفيش فيديوهات.
import { useEffect, useState } from "react";

export function useSuccessVideos() {
  const [state, setState] = useState({ loading: true, videos: [] });
  useEffect(() => {
    let alive = true;
    fetch("/api/success-video")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive) setState({ loading: false, videos: Array.isArray(data?.videos) ? data.videos : [] });
      })
      .catch(() => alive && setState({ loading: false, videos: [] }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}