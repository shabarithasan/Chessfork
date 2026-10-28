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
  const [activeStunt, setActiveStunt] = useState<string | null>(null);
  const [showLaser, setShowLaser] = useState(false);
  const [burstParticles, setBurstParticles] = useState<Array<{ id: number; text: string; x: number; y: number }>>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; rotY: number; rotX: number }>({ x: 0, y: 0, rotY: 0, rotX: 0 });

  // 3D image source based on persona and emotion
  const imageSrc = (() => {
    if (persona === "hikaru") {
      return emotion === "blunder"
        ? "/images/coaches/hikaru_blunder.png"
        : "/images/coaches/hikaru_standing.png";
    }
    return emotion === "blunder"
      ? "/images/coaches/magnus_blunder.png"
      : "/images/coaches/magnus_standing.png";
  })();

  // ── 1. Interactive Mouse Tracking Parallax ──
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Subtle natural head/body turn towards cursor
    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    setRotationY(deltaX * 18); // Max 18 deg horizontal turn
    setRotationX(-deltaY * 12); // Max 12 deg vertical tilt
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setRotationY(0);
      setRotationX(0);
    }
  }, [isDragging]);

  // ── 2. Click & Drag 360° 3D Orbit ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotY: rotationY,
      rotX: rotationX,
    };
  }, [rotationY, rotationX]);

  useEffect(() => {
    function onWindowMouseMove(e: MouseEvent) {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setRotationY(dragStartRef.current.rotY + dx * 0.6);
      setRotationX(Math.max(-30, Math.min(30, dragStartRef.current.rotX - dy * 0.4)));
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
  }, [isDragging]);

  // ── 3. Three.js WebGL Hologram Scene (Orbiting 3D Chess Piece & Aura) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || 450;
    const height = canvas.clientHeight || 550;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const goldPointLight = new THREE.PointLight(0xffd700, 3.5, 10);
    goldPointLight.position.set(2, 1, 3);
    scene.add(goldPointLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 2.5, 8);
    cyanPointLight.position.set(-2, -1, 2);
    scene.add(cyanPointLight);

    // ── Real 3D Golden Chess Piece (Orbiting Mesh) ──
    const pieceGroup = new THREE.Group();

    // Procedural Chess Knight / Pawn Geometry
    const baseGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.25, 24);
    const bodyGeo = new THREE.ConeGeometry(0.45, 1.1, 24);
    const headGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const crownGeo = new THREE.TorusGeometry(0.25, 0.08, 16, 24);

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc33,
      metalness: 0.9,
      roughness: 0.18,
      emissive: 0x443300,
      emissiveIntensity: 0.2,
    });

    const baseMesh = new THREE.Mesh(baseGeo, goldMaterial);
    baseMesh.position.y = -0.5;

    const bodyMesh = new THREE.Mesh(bodyGeo, goldMaterial);
    bodyMesh.position.y = 0.15;

    const headMesh = new THREE.Mesh(headGeo, goldMaterial);
    headMesh.position.y = 0.85;

    const crownMesh = new THREE.Mesh(crownGeo, goldMaterial);
    crownMesh.position.y = 1.15;
    crownMesh.rotation.x = Math.PI / 2;

    pieceGroup.add(baseMesh, bodyMesh, headMesh, crownMesh);
    pieceGroup.scale.set(0.65, 0.65, 0.65);
    scene.add(pieceGroup);

    // ── 3D Holographic Ground Rings ──
    const ringGeo1 = new THREE.RingGeometry(1.6, 1.7, 48);
    const ringGeo2 = new THREE.RingGeometry(2.1, 2.18, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });

    const ring1 = new THREE.Mesh(ringGeo1, ringMat);
    ring1.rotation.x = Math.PI / 2.3;
    ring1.position.y = -2.6;
    scene.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2.3;
    ring2.position.y = -2.65;
    scene.add(ring2);

    // ── 3D Floating Particle Spark System ──
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 6;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xfff077,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── Animation Loop ──
    let animationId: number;
    let clock = new THREE.Clock();

    function animate() {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Orbit 3D chess piece around coach's hand
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

    function onResize() {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      baseGeo.dispose();
      bodyGeo.dispose();
      headGeo.dispose();
      crownGeo.dispose();
      goldMaterial.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      ringMat.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  // ── 4. Out-of-the-Box Stunts & Dynamic Actions ──
  const trigger3DSpin = () => {
    setActiveStunt("spin");
    playSound("achievement");
    let startTime = performance.now();
    const duration = 1000;
    const startRot = rotationY;

    function spinFrame(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setRotationY(startRot + ease * 360);
      if (progress < 1) {
        requestAnimationFrame(spinFrame);
      } else {
        setRotationY(0);
        setActiveStunt(null);
      }
    }
    requestAnimationFrame(spinFrame);
  };

  const triggerTakesBurst = () => {
    playSound("notify");
    setActiveStunt("takes");
    const phrases = persona === "hikaru"
      ? ["TAKES TAKES TAKES!", "200 IQ 🔥", "CHAT?!", "LITERALLY WINNING", "THE JUICE ⚡", "BOOM!"]
      : ["HONESTLY...", "PURE CHESS 👑", "COMPLETELY LOST", "SIMPLE & CLEAN", "ROOK SAC!"];

    const newBursts = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      text: phrases[i % phrases.length],
      x: (Math.random() - 0.5) * 220,
      y: (Math.random() - 0.5) * 180 - 60,
    }));
    setBurstParticles(newBursts);
    setTimeout(() => {
      setBurstParticles([]);
      setActiveStunt(null);
    }, 1800);
  };

  const triggerLaserPointer = () => {
    setShowLaser(true);
    playSound("shoutout");
    onPointToBoard?.();
    setTimeout(() => setShowLaser(false), 2400);
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
      {/* ── Background Three.js WebGL Hologram Scene ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* ── Floating Out-of-the-Box Stunt Particles ── */}
      {burstParticles.map((burst) => (
        <div
          key={burst.id}
          className="absolute z-40 pointer-events-none font-black text-sm sm:text-base px-3 py-1.5 rounded-2xl bg-[#fffc00] text-black shadow-[0_10px_25px_rgba(255,252,0,0.5)] border-2 border-black animate-out zoom-out fade-out duration-1000"
          style={{
            transform: `translate(${burst.x}px, ${burst.y}px) rotate(${(burst.x / 10).toFixed(0)}deg) scale(1.1)`,
            transition: "all 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {burst.text}
        </div>
      ))}

      {/* ── Dynamic Laser Pointer Hologram ── */}
      {showLaser && (
        <div className="absolute top-1/3 -left-32 z-50 pointer-events-none flex items-center">
          <div className="h-2 w-48 bg-gradient-to-l from-red-500 via-amber-400 to-transparent rounded-full blur-[1px] shadow-[0_0_20px_#ef4444] animate-pulse" />
          <div className="size-6 rounded-full bg-red-500 animate-ping border-2 border-white" />
        </div>
      )}

      {/* ── Main 3D Avatar Body with Perspective Tracking ── */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "relative z-10 transition-transform duration-100 ease-out flex flex-col items-center",
          activeStunt === "spin" && "scale-105"
        )}
        style={{
          transform: `rotateY(${rotationY}deg) rotateX(${rotationX}deg) translateZ(40px)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Full-Body 3D Character Cutout */}
        <img
          src={imageSrc}
          alt={persona === "hikaru" ? "3D Hikaru Nakamura" : "3D Magnus Carlsen"}
          draggable={false}
          className="h-[390px] sm:h-[480px] md:h-[540px] lg:h-[580px] w-auto max-w-none object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.85)] filter hover:brightness-105 transition-all"
        />

        {/* 3D Contact Shadow */}
        <div
          className="w-56 h-6 bg-black/75 rounded-[100%] blur-md -mt-5"
          style={{ transform: "rotateX(75deg)" }}
        />

        {/* 3D Floating Nameplate Badge */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border-2 border-[#fffc00] bg-black/80 px-3.5 py-1 backdrop-blur-md shadow-xl text-white font-black text-xs uppercase tracking-wider whitespace-nowrap"
          style={{ transform: "translateZ(60px)" }}
        >
          <span className="size-2 rounded-full bg-[#fffc00] animate-ping" />
          <span>{persona === "hikaru" ? "GM Hikaru ⚡" : "GM Magnus 👑"}</span>
        </div>
      </div>

      {/* ── Out-of-the-Box 3D Interactive Control Bar ── */}
      <div className="relative z-30 mt-3 flex items-center gap-1.5 rounded-2xl bg-black/60 p-1.5 backdrop-blur-md border border-white/10 shadow-2xl">
        <button
          type="button"
          onClick={trigger3DSpin}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 transition-all active:scale-95"
          title="Make Coach Spin 360 in 3D"
        >
          <Rotate3d className="size-3.5 text-[#fffc00]" />
          <span>Spin 360°</span>
        </button>

        <button
          type="button"
          onClick={triggerTakesBurst}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 transition-all active:scale-95"
          title="Streamer Burst Reaction"
        >
          <Zap className="size-3.5 text-amber-400" />
          <span>{persona === "hikaru" ? "Takes Takes!" : "GM Flex!"}</span>
        </button>

        <button
          type="button"
          onClick={triggerLaserPointer}
          className="flex items-center gap-1 rounded-xl bg-red-500/20 border border-red-500/30 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/30 transition-all active:scale-95"
          title="Shoot Laser Beam at Board"
        >
          <Flame className="size-3.5" />
          <span>Laser Point</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRotationY(0);
            setRotationX(0);
          }}
          className="rounded-xl p-1 text-zinc-400 hover:text-white transition"
          title="Reset 3D Rotation"
        >
          <Eye className="size-3.5" />
        </button>
      </div>

      {/* Drag Hint */}
      <span className="text-[10px] font-semibold text-zinc-400 mt-1 flex items-center gap-1">
        <span>✨ Move cursor or drag to turn in 3D</span>
      </span>
    </div>
  );
}
