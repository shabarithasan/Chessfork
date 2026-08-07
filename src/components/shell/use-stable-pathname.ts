"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function useStablePathname() {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated ? pathname : null;
}
