"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

type AnimatedTextProps = {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
  text: string;
};

export function AnimatedText({ as: Tag = "h2", className, text }: AnimatedTextProps) {
  const ref = useRef<HTMLHeadingElement | HTMLParagraphElement | HTMLSpanElement | null>(null);
  const words = useMemo(() => text.split(" "), [text]);

  useGSAP(
    () => {
      if (!ref.current) {
        return;
      }

      const targets = ref.current.querySelectorAll("[data-word]");
      gsap.fromTo(
        targets,
        { autoAlpha: 0, yPercent: 105 },
        {
          autoAlpha: 1,
          duration: 0.9,
          ease: "power4.out",
          stagger: 0.045,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 84%",
            toggleActions: "play none none reverse",
          },
          yPercent: 0,
        },
      );
    },
    { scope: ref, dependencies: [text] },
  );

  return (
    <Tag ref={ref as any} className={cn("landing-animated-text", className)}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom">
          <span data-word className="inline-block pr-[0.26em]">
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}
