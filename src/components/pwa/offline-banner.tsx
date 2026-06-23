"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [mounted, setMounted] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    window.queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  if (online) {
    return null;
  }

  return (
    <div className="fixed left-3 right-3 top-3 z-[80] mx-auto flex min-h-11 max-w-xl items-center justify-center gap-2 rounded-xl border border-[#00d4aa]/30 bg-[#111118] px-4 py-3 text-center text-sm font-semibold text-[#d8fff6] shadow-[0_14px_50px_rgba(0,0,0,0.42)]">
      <WifiOff className="size-4 shrink-0 text-[#00d4aa]" />
      You&apos;re offline — cached games still available
    </div>
  );
}
