// app/lib/useCollection.js
"use client";

import { useEffect, useState } from "react";
import { fetchCached, peek } from "./clientCache";

export const collectionUrl = (name) => `/api/data?collection=${name}`;
const pickDoc = (res) => (Array.isArray(res) ? res[0] : res);

// يرجّع أول document في الكولكشن (نفس شكل الهوكس القديمة في الصفحات).
// لو الداتا في الكاش → بترجع فورًا في أول render، وبيتعمل revalidate هادي.
export function useCollectionDoc(name) {
  const url = collectionUrl(name);
  const [data, setData] = useState(() => {
    const cached = peek(url);
    return cached ? pickDoc(cached) : null;
  });

  useEffect(() => {
    let alive = true;
    fetchCached(url)
      .then((res) => {
        if (alive) setData((prev) => (prev && JSON.stringify(prev) === JSON.stringify(pickDoc(res)) ? prev : pickDoc(res)));
      })
      .catch(console.error);
    return () => {
      alive = false;
    };
  }, [url]);

  return data;
}

// نسخة عامة لأي endpoint GET (زي /api/membership-plans).
export function useCachedJson(url, { ttl } = {}) {
  const [data, setData] = useState(() => peek(url));
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchCached(url, { ttl })
      .then((res) => alive && setData(res))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [url, ttl]);
  return { data, error };
}
