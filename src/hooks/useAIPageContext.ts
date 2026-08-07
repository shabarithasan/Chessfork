"use client";

import { useEffect } from "react";
import { useAI, type PageContext } from "@/contexts/AIProvider";

export function useAIPageContext(ctx: PageContext | null) {
  const { setPageContext } = useAI();

  useEffect(() => {
    setPageContext(ctx);
    return () => setPageContext(null);
  }, [ctx, setPageContext]);
}
