"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Sparkles, Rotate3d, Zap, Flame, Crown, Volume2, VolumeX, Eye } from "lucide-react";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import type { CoachPersona, CoachEmotion } from "@/components/coach/CoachSnapAvatar";

interface Dynamic3DCoachStageProps {
  persona: CoachPersona;
  emotion: CoachEmotion;
  onPersonaChange?: (p: CoachPersona) => void;
  onPointToBoard?: () => void;
  className?: string;
  isBlunder?: boolean;
}

export function Dynamic3DCoachStage({
  persona = "hikaru",
  emotion = "critical",
  onPersonaChange,
  onPointToBoard,
  className,
  isBlunder = false,
}: Dynamic3DCoachStageProps) {
  // ── 3D Interaction States ──
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeStunt, setActiveStunt] = useState<"idle" | "facepalm" | "flex" | "point" | "spin">("idle");
  const [showLaser, setShowLaser] = useState(false);
  const [burstParticles, setBurstParticles] = useState<Array<{ id: number; text: string; x: number; y: number }>>([]);
  const [isSpinning, setIsSpinning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; rotY: number; rotX: number }>({ x: 0, y: 0, rotY: 0, rotX: 0 });

  // High-res accurate 3D image source (Hikaru Nakamura or Magnus Carlsen)
  const currentEmotion = activeStunt === "facepalm" ? "blunder" : emotion;
  const imageSrc = (() => {
    if (persona === "hikaru") {
      return currentEmotion === "blunder"
        ? "/images/coaches/hikaru_blunder.png"
        : "/images/coaches/hikaru_standing.png";
    }
    return currentEmotion === "blunder"
      ? "/images/coaches/magnus_blunder.png"
      : "/images/coaches/magnus_standing.png";
  })();

  // ── 1. Interactive Mouse Tracking Parallax ──
  // Clamped so the character naturally faces the cursor without turning into an edge!
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || isSpinning || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    // Clamp rotation between -35° and +35° so it stays 3D and never flattens out
    setRotationY(Math.max(-35, Math.min(35, deltaX * 28)));
    setRotationX(Math.max(-18, Math.min(18, -deltaY * 16)));
  }, [isDragging, isSpinning]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging && !isSpinning) {
      setRotationY(0);
      setRotationX(0);
    }
  }, [isDragging, isSpinning]);

  // ── 2. Click & Drag Interactive 3D Orbit (Clamped -50° to +50°) ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSpinning) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotY: rotationY,
      rotX: rotationX,
    };
  }, [rotationY, rotationX, isSpinning]);

  useEffect(() => {
    function onWindowMouseMove(e: MouseEvent) {
      if (!isDragging || isSpinning) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // Soft clamp between -50° and +50° so the character maintains full 3D body volume!
      const targetY = dragStartRef.current.rotY + dx * 0.45;
      const targetX = dragStartRef.current.rotX - dy * 0.3;
      setRotationY(Math.max(-50, Math.min(50, targetY)));
      setRotationX(Math.max(-22, Math.min(22, targetX)));
    }

    function onWindowMouseUp() {
      if (isDragging) {
        setIsDragging(false);
      }
    }

    if (isDragging) {
      window.addEventListener("mousemove", onWindowMouseMove);
      window.addEventListener("mouseup", onWindowMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [isDragging, isSpinning]);

  // ── 3. Real-Time WebGL Three.js Hologram Scene (Orbiting 3D Chess Piece & Aura) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 460;
    const height = 580;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const goldPointLight = new THREE.PointLight(0xffcc00, 3.8, 10);
    goldPointLight.position.set(2.2, 1.2, 3);
    scene.add(goldPointLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 2.5, 8);
    cyanPointLight.position.set(-2, -1, 2);
    scene.add(cyanPointLight);

    // ── Real 3D Golden Chess Piece (Orbiting Mesh) ──
    const pieceGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.22, 24);
    const bodyGeo = new THREE.ConeGeometry(0.4, 1.0, 24);
    const headGeo = new THREE.SphereGeometry(0.3, 24, 24);
    const crownGeo = new THREE.TorusGeometry(0.22, 0.07, 16, 24);

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc22,
      metalness: 0.92,
      roughness: 0.16,
      emissive: 0x443300,
      emissiveIntensity: 0.25,
    });

    const baseMesh = new THREE.Mesh(baseGeo, goldMaterial);
    baseMesh.position.y = -0.45;
    const bodyMesh = new THREE.Mesh(bodyGeo, goldMaterial);
    bodyMesh.position.y = 0.15;
    const headMesh = new THREE.Mesh(headGeo, goldMaterial);
    headMesh.position.y = 0.75;
    const crownMesh = new THREE.Mesh(crownGeo, goldMaterial);
    crownMesh.position.y = 1.05;
    crownMesh.rotation.x = Math.PI / 2;

    pieceGroup.add(baseMesh, bodyMesh, headMesh, crownMesh);
    pieceGroup.scale.set(0.68, 0.68, 0.68);
    scene.add(pieceGroup);

    // ── 3D Holographic Ground Rings ──
    const ringGeo1 = new THREE.RingGeometry(1.5, 1.6, 48);
    const ringGeo2 = new THREE.RingGeometry(1.95, 2.02, 48);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });

    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    ring1.position.y = -2.5;
    scene.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2.3;
    ring2.position.y = -2.55;
    scene.add(ring2);

    // ── 3D Floating Particle Sparks ──
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 6;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xfff077, size: 0.08, transparent: true, opacity: 0.85 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Animation Loop
    let animationId: number;
    const clock = new THREE.Clock();

    function animate() {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Orbit 3D chess piece next to character's hand
      pieceGroup.position.x = Math.cos(time * 1.5) * 1.8 + 0.3;
      pieceGroup.position.z = Math.sin(time * 1.5) * 0.9;
      pieceGroup.position.y = Math.sin(time * 3) * 0.25 - 0.2;
      pieceGroup.rotation.y = time * 2;
      pieceGroup.rotation.z = Math.sin(time) * 0.15;

      // Rotate hologram rings
      ring1.rotation.z = time * 0.6;
      ring2.rotation.z = -time * 0.4;

      // Particle drift
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += 0.008;
        if (positions[i * 3 + 1] > 3) positions[i * 3 + 1] = -3;
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      baseGeo.dispose();
      bodyGeo.dispose();
      headGeo.dispose();
      crownGeo.dispose();
      goldMaterial.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      ringMat1.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  // ── 4. Out-of-the-Box Stunts & Dynamic Actions ──
  const trigger3DSpin = () => {
    setIsSpinning(true);
    playSound("achievement");
    let startTime = performance.now();
    const duration = 800;

    function spinFrame(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      // Heroic spin with depth pop
      setRotationY(Math.sin(ease * Math.PI * 2) * 45);
      if (progress < 1) {
        requestAnimationFrame(spinFrame);
      } else {
        setRotationY(0);
        setIsSpinning(false);
      }
    }
    requestAnimationFrame(spinFrame);
  };

  const triggerTakesBurst = () => {
    playSound("notify");
    setActiveStunt("flex");
    const phrases = persona === "hikaru"
      ? ["TAKES TAKES TAKES!", "200 IQ 🔥", "CHAT?!", "THE JUICE ⚡", "BOOM!"]
      : ["HONESTLY...", "PURE CHESS 👑", "COMPLETELY WON", "SIMPLE & CLEAN", "MASTERMIND"];

    const newBursts = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i,
      text: phrases[i % phrases.length],
      x: (Math.random() - 0.5) * 220,
      y: (Math.random() - 0.5) * 160 - 70,
    }));
    setBurstParticles(newBursts);
    setTimeout(() => {
      setBurstParticles([]);
      setActiveStunt("idle");
    }, 1800);
  };

  const triggerLaserPointer = () => {
    setShowLaser(true);
    setActiveStunt("point");
    playSound("shoutout");
    onPointToBoard?.();
    setTimeout(() => {
      setShowLaser(false);
      setActiveStunt("idle");
    }, 2400);
  };

  const triggerFacepalm = () => {
    playSound("incorrect");
    setActiveStunt("facepalm");
    setTimeout(() => {
      setActiveStunt("idle");
    }, 2800);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative flex flex-col items-center justify-center select-none cursor-grab active:cursor-grabbing",
        className
      )}
      style={{ perspective: 1200 }}
    >
      {/* ── Background Three.js WebGL Hologram Scene (Chess piece & rings) ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* ── Floating Stunt Particle Badges ── */}
      {burstParticles.map((burst) => (
        <div
          key={burst.id}
          className="absolute z-40 pointer-events-none font-black text-xs sm:text-sm px-3 py-1.5 rounded-2xl bg-[#fffc00] text-black shadow-[0_10px_25px_rgba(255,252,0,0.6)] border-2 border-black animate-out zoom-out fade-out duration-1000"
          style={{
            transform: `translate(${burst.x}px, ${burst.y}px) scale(1.15)`,
            transition: "all 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {burst.text}
        </div>
      ))}

      {/* ── Glowing Laser Beam Pointing to Chessboard ── */}
      {showLaser && (
        <div className="absolute top-1/3 -left-36 z-50 pointer-events-none flex items-center">
          <div className="h-2 w-52 bg-gradient-to-l from-red-500 via-amber-400 to-transparent rounded-full blur-[1px] shadow-[0_0_20px_#ef4444] animate-pulse" />
          <div className="size-6 rounded-full bg-red-500 animate-ping border-2 border-white" />
        </div>
      )}

      {/* ── True 3D Volumetric Character Figure (Amiibo / Vinyl Collectible Depth) ── */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "relative z-10 transition-transform duration-100 ease-out flex flex-col items-center",
          activeStunt === "facepalm" && "animate-[wiggle_300ms_ease-in-out]"
        )}
        style={{
          transform: `rotateY(${rotationY}deg) rotateX(${rotationX}deg) translateZ(30px)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Layer 1: Rear Depth Extrusion (Gives physical 3D thickness so it never looks flat!) */}
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-[390px] sm:h-[480px] md:h-[540px] lg:h-[580px] w-auto max-w-none object-contain brightness-50 opacity-40 blur-[1px] pointer-events-none"
          style={{ transform: "translateZ(-16px) scale(0.985)" }}
        />

        {/* Layer 2: Mid-Depth Extrusion Rim (Golden rim highlight in 3D space) */}
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-[390px] sm:h-[480px] md:h-[540px] lg:h-[580px] w-auto max-w-none object-contain brightness-75 opacity-60 pointer-events-none"
          style={{ transform: "translateZ(-8px) scale(0.995)" }}
        />

        {/* Layer 3: Front Character Render (Accurate Hikaru Nakamura or Magnus Carlsen) */}
        <img
          src={imageSrc}
          alt={persona === "hikaru" ? "3D Hikaru Nakamura" : "3D Magnus Carlsen"}
          draggable={false}
          className="relative h-[390px] sm:h-[480px] md:h-[540px] lg:h-[580px] w-auto max-w-none object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.85)] filter hover:brightness-105 transition-all"
          style={{ transform: "translateZ(0px)" }}
        />

        {/* 3D Volumetric Ground Contact Shadow */}
        <div
          className="w-56 h-6 bg-black/80 rounded-[100%] blur-md -mt-5"
          style={{ transform: "rotateX(75deg) translateZ(-20px)" }}
        />

        {/* 3D Floating Nameplate Badge */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border-2 border-[#fffc00] bg-black/85 px-3.5 py-1 backdrop-blur-md shadow-2xl text-white font-black text-xs uppercase tracking-wider whitespace-nowrap"
          style={{ transform: "translateZ(50px)" }}
        >
          <span className="size-2 rounded-full bg-[#fffc00] animate-ping" />
          <span>{persona === "hikaru" ? "GM Hikaru ⚡" : "GM Magnus 👑"}</span>
        </div>
      </div>

      {/* ── 3D Interactive Controls Bar ── */}
      <div className="relative z-30 mt-3 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-black/75 p-2 backdrop-blur-xl border border-white/15 shadow-2xl">
        <button
          type="button"
          onClick={trigger3DSpin}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20 transition-all active:scale-95 shadow-sm"
          title="Heroic 3D Spin"
        >
          <Rotate3d className="size-3.5 text-[#fffc00]" />
          <span>Hero Spin 🔄</span>
        </button>

        <button
          type="button"
          onClick={triggerTakesBurst}
          className="flex items-center gap-1 rounded-xl bg-amber-400/20 border border-amber-400/30 px-3 py-1.5 text-xs font-black text-amber-300 hover:bg-amber-400/30 transition-all active:scale-95 shadow-sm"
          title="Trigger Streamer Reaction"
        >
          <Zap className="size-3.5" />
          <span>{persona === "hikaru" ? "Takes Takes! ⚡" : "GM Flex! 👑"}</span>
        </button>

        <button
          type="button"
          onClick={triggerLaserPointer}
          className="flex items-center gap-1 rounded-xl bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/30 transition-all active:scale-95 shadow-sm"
          title="Shoot Laser Beam at Chessboard"
        >
          <Flame className="size-3.5" />
          <span>Laser Point 🎯</span>
        </button>

        <button
          type="button"
          onClick={triggerFacepalm}
          className="flex items-center gap-1 rounded-xl bg-purple-500/20 border border-purple-500/30 px-2.5 py-1.5 text-xs font-black text-purple-300 hover:bg-purple-500/30 transition-all active:scale-95 shadow-sm"
          title="Facepalm Blunder Reaction"
        >
          <span>🤦‍♂️ Facepalm</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRotationY(0);
            setRotationX(0);
          }}
          className="rounded-xl p-1.5 text-zinc-400 hover:text-white transition"
          title="Reset 3D Front View"
        >
          <Eye className="size-3.5" />
        </button>
      </div>

      {/* Drag & Tilt Hint */}
      <span className="text-[11px] font-bold text-zinc-400 mt-2 flex items-center gap-1.5">
        <Sparkles className="size-3 text-[#fffc00]" />
        <span>Move cursor or drag to swivel 3D character</span>
      </span>
    </div>
  );
}
