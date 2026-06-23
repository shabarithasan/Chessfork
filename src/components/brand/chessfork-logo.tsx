import Image from "next/image";

import { cn } from "@/lib/utils";

type ChessforkLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
};

export function ChessforkLogo({ alt = "", className, imageClassName }: ChessforkLogoProps) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-lg border border-white/15 bg-white shadow-[0_16px_45px_rgba(247,213,105,0.18)]",
        className,
      )}
    >
      <Image
        alt={alt}
        aria-hidden={alt ? undefined : true}
        className={cn("h-full w-full object-contain p-1", imageClassName)}
        height={256}
        priority
        src="/chessfork-logo.svg"
        unoptimized
        width={256}
      />
    </span>
  );
}
