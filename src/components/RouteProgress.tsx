"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Barra de progresso no topo entre o clique num link e a página nova
// terminar de renderizar. Sem isso, navegação com dados no servidor
// (Server Component buscando do Supabase) fica "morta" na tela por um
// instante — parece que não aconteceu nada.
function RouteProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const key = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(key);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;

      if (intervalRef.current) clearInterval(intervalRef.current);
      setVisible(true);
      setProgress(15);
      intervalRef.current = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.15));
      }, 200);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (prevKey.current === key) return;
    prevKey.current = key;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);
    const t = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(t);
  }, [key]);

  if (!visible) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[900] h-[3px] pointer-events-none">
        <div
          className="h-full transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%`, background: "var(--accent)" }}
        />
      </div>
      <div
        className="fixed top-3 right-3 z-[900] w-7 h-7 rounded-full bg-paper flex items-center justify-center pointer-events-none"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div
          className="w-4 h-4 rounded-full animate-spin"
          style={{ border: "2px solid var(--line)", borderTopColor: "var(--accent)" }}
        />
      </div>
    </>
  );
}

export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressInner />
    </Suspense>
  );
}
