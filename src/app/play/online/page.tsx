"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

export default function PlayOnlineLandingPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/play/online", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create game");
      const { id } = await res.json();
      router.push(`/play/online/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create game. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#1A1918] p-8 shadow-2xl border border-white/5 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
          <Users size={32} />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">Play Online</h1>
        <p className="mb-8 text-slate-400">
          Create a live game and share the link with a friend to play instantly.
        </p>

        <button
          onClick={handleCreateGame}
          disabled={isCreating}
          className="w-full rounded-xl bg-amber-500 py-4 text-lg font-bold text-black transition-all hover:bg-amber-400 disabled:opacity-50"
        >
          {isCreating ? "Creating Game..." : "Create Game Room"}
        </button>
      </div>
    </div>
  );
}
