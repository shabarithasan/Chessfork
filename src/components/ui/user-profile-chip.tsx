import Link from "next/link";

import { cn } from "@/lib/utils";

interface UserProfileChipProps {
  username: string;
  rating?: number;
  avatarUrl?: string | null;
  href?: string;
  className?: string;
}

export function UserProfileChip({ username, rating, avatarUrl, href, className }: UserProfileChipProps) {
  const content = (
    <span
      className={cn(
        "flex h-7 min-w-0 items-center gap-1.5 rounded-[7px] pl-1 pr-[11px] text-[12.5px] font-semibold text-[#171717] transition-colors duration-150",
        href ? "cursor-pointer bg-[#ededed] hover:bg-[#e2e2e2]" : "bg-[#ededed]",
        className,
      )}
    >
      <span
        className="flex flex-none items-center justify-center overflow-hidden rounded-[5px] bg-[#d6d6d6] text-[10px] font-semibold text-[#525252]"
        style={{ width: 20, height: 20 }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="h-full w-full object-cover" draggable={false} />
        ) : (
          username.charAt(0).toUpperCase()
        )}
      </span>
      <span className="min-w-0 truncate">{username}</span>
      {rating != null ? (
        <span className="font-mono text-[11px] tabular-nums opacity-[.62]">{rating}</span>
      ) : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
