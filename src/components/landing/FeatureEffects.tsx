"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";

gsap.registerPlugin(ScrollTrigger);

type FeatureEffectsProps = {
  featureId: string;
  mirrored?: boolean;
  sectionRef: RefObject<HTMLElement | null>;
  visualRef: RefObject<HTMLDivElement | null>;
};

export function FeatureEffects({ featureId, mirrored, sectionRef, visualRef }: FeatureEffectsProps) {
  useGSAP(
    () => {
      if (!sectionRef.current) {
        return;
      }

      const words = sectionRef.current.querySelectorAll(".knightowl-feature-word");
      gsap.fromTo(
        words,
        { opacity: 0, y: 60 },
        {
          duration: 0.8,
          ease: "power3.out",
          opacity: 1,
          scrollTrigger: {
            start: "top 75%",
            trigger: sectionRef.current,
          },
          stagger: 0.08,
          y: 0,
        },
      );

      if (visualRef.current) {
        gsap.fromTo(
          visualRef.current,
          { opacity: 0, x: mirrored ? -100 : 100 },
          {
            duration: 1,
            ease: "power3.out",
            opacity: 1,
            scrollTrigger: {
              start: "top 72%",
              trigger: sectionRef.current,
            },
            x: 0,
          },
        );

        const coachCards = visualRef.current.querySelectorAll(".knightowl-coach-card");
        if (coachCards.length > 0) {
          gsap.fromTo(
            coachCards,
            { opacity: 0, y: 48 },
            {
              duration: 0.75,
              ease: "power3.out",
              opacity: 1,
              scrollTrigger: {
                start: "top 68%",
                trigger: sectionRef.current,
              },
              stagger: 0.2,
              y: 0,
            },
          );
        }
      }
    },
    { dependencies: [featureId, mirrored], scope: sectionRef },
  );

  return null;
}
