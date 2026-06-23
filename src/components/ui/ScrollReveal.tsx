"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useRef } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  scale?: number;
  y?: number;
};

export function ScrollReveal({ children, className, delay = 0, scale = 0.985, y = 54 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (!ref.current) {
        return;
      }

      gsap.fromTo(
        ref.current,
        { autoAlpha: 0, y, scale },
        {
          autoAlpha: 1,
          delay,
          duration: 1.05,
          ease: "power3.out",
          scale: 1,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
          y: 0,
        },
      );
    },
    { scope: ref, dependencies: [delay, scale, y] },
  );

  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}
