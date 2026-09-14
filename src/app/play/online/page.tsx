"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, LogIn } from "lucide-react";

export default function PlayOnlineLandingPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/play/online", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create game");
      const { id } = await res.json();
      localStorage.setItem(`match_${id}_color`, "white");
      router.push(`/play/online/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create game. Please try again.");
      setIsCreating(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || joinCode.length !== 6) return;
    
    setIsJoining(true);
    try {
      const res = await fetch(`/api/play/online/join?code=${joinCode}`);
      if (!res.ok) throw new Error("Match not found");
      const { id } = await res.json();
      localStorage.setItem(`match_${id}_color`, "black");
      router.push(`/play/online/${id}`);
    } catch (err) {
      console.error(err);
      alert("Invalid or expired match code.");
      setIsJoining(false);
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
          Create a live game or join a friend using their 6-letter match code.
        </p>

        <button
          onClick={handleCreateGame}
          disabled={isCreating}
          className="w-full rounded-xl bg-amber-500 py-4 text-lg font-bold text-black transition-all hover:bg-amber-400 disabled:opacity-50 mb-8"
        >
          {isCreating ? "Creating Game..." : "Create New Room"}
        </button>

        <div className="relative mb-8 flex items-center py-2">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="mx-4 flex-shrink-0 text-sm text-slate-500">or join existing</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <form onSubmit={handleJoinGame} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Code (e.g. A4K9PQ)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-lg font-mono font-bold text-white outline-none focus:border-amber-500/50"
          />
          <button
            type="submit"
            disabled={isJoining || joinCode.length !== 6}
            className="flex items-center justify-center rounded-xl bg-white/10 px-6 font-bold text-white hover:bg-white/20 disabled:opacity-50"
          >
            {isJoining ? "..." : <LogIn size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
