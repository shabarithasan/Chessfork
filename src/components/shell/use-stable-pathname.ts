"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

function subscribeToHydrationStore() {
  return () => {};
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

export function useStablePathname() {
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(
    subscribeToHydrationStore,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  return hydrated ? pathname : null;
}
