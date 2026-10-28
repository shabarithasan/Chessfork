"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Sparkles, Rotate3d, Zap, Flame, Crown, Volume2, VolumeX, Eye, Loader2 } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeStunt, setActiveStunt] = useState<"idle" | "facepalm" | "flex" | "point" | "spin">("idle");
  const [burstParticles, setBurstParticles] = useState<Array<{ id: number; text: string; x: number; y: number }>>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References for live 3D controls inside Three.js loop
  const mouseTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const modelRotationYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; rotY: number }>({ x: 0, rotY: 0 });
  const stuntRef = useRef<"idle" | "facepalm" | "flex" | "point" | "spin">("idle");
  const emotionRef = useRef<CoachEmotion>(emotion);
  const personaRef = useRef<CoachPersona>(persona);

  stuntRef.current = activeStunt;
  emotionRef.current = emotion;
  personaRef.current = persona;

  // ── 1. Mouse Tracking for 3D Head Look-At ──
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mouseTargetRef.current = { x: nx, y: ny };
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!isDraggingRef.current) {
      mouseTargetRef.current = { x: 0, y: 0 };
    }
  }, []);

  // ── 2. Click & Drag 360° 3D Orbit ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      rotY: modelRotationYRef.current,
    };
  }, []);

  useEffect(() => {
    function onWindowMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      modelRotationYRef.current = dragStartRef.current.rotY + dx * 0.015;
    }

    function onWindowMouseUp() {
      isDraggingRef.current = false;
    }

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, []);

  // ── 3. Three.js Full 3D Character & Stage Setup ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 480;
    const height = 620;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 5.2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // ── Vibrant Brawl Stars Style Studio Lights ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xfff5e6, 3.2);
    mainKeyLight.position.set(2.5, 4.5, 3.5);
    scene.add(mainKeyLight);

    const goldRimLight = new THREE.PointLight(0xffcc00, 4.0, 10);
    goldRimLight.position.set(-2.5, 2.5, -2);
    scene.add(goldRimLight);

    const cyanFillLight = new THREE.PointLight(0x38bdf8, 2.8, 8);
    cyanFillLight.position.set(2, -1.5, 2);
    scene.add(cyanFillLight);

    // ── Real 3D Golden Chess Piece Orbiting ──
    const pieceGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.2, 24);
    const bodyGeo = new THREE.ConeGeometry(0.3, 0.8, 24);
    const headGeo = new THREE.SphereGeometry(0.24, 24, 24);
    const crownGeo = new THREE.TorusGeometry(0.18, 0.05, 16, 24);

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc22,
      metalness: 0.92,
      roughness: 0.16,
      emissive: 0x553300,
      emissiveIntensity: 0.25,
    });

    const baseMesh = new THREE.Mesh(baseGeo, goldMaterial);
    baseMesh.position.y = -0.4;
    const bodyMesh = new THREE.Mesh(bodyGeo, goldMaterial);
    bodyMesh.position.y = 0.1;
    const headMesh = new THREE.Mesh(headGeo, goldMaterial);
    headMesh.position.y = 0.65;
    const crownMesh = new THREE.Mesh(crownGeo, goldMaterial);
    crownMesh.position.y = 0.88;
    crownMesh.rotation.x = Math.PI / 2;

    pieceGroup.add(baseMesh, bodyMesh, headMesh, crownMesh);
    pieceGroup.scale.set(0.7, 0.7, 0.7);
    scene.add(pieceGroup);

    // ── 3D Ground Holographic Arena Rings ──
    const ringGeo1 = new THREE.RingGeometry(1.2, 1.3, 48);
    const ringGeo2 = new THREE.RingGeometry(1.6, 1.66, 48);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });

    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    ring1.position.y = -2.1;
    scene.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2.3;
    ring2.position.y = -2.15;
    scene.add(ring2);

    // ── Glowing Laser Beam ──
    const laserGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.5, 16);
    laserGeo.rotateZ(Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0 });
    const laserMesh = new THREE.Mesh(laserGeo, laserMat);
    laserMesh.position.set(-2.5, 0.2, 0);
    scene.add(laserMesh);

    // ── 3D Floating Particle Sparks ──
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 5;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xfff077, size: 0.07, transparent: true, opacity: 0.8 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── Load 3D Character Model (ReadyPlayerMe GLB) ──
    let characterModel: THREE.Group | null = null;
    let headBone: THREE.Bone | null = null;
    let neckBone: THREE.Bone | null = null;
    let spineBone: THREE.Bone | null = null;
    let rightArmBone: THREE.Bone | null = null;
    let rightForeArmBone: THREE.Bone | null = null;
    let leftArmBone: THREE.Bone | null = null;
    let leftForeArmBone: THREE.Bone | null = null;

    const loader = new GLTFLoader();
    loader.load(
      "/models/readyplayer.me.glb",
      (gltf) => {
        const model = gltf.scene;
        characterModel = model;

        // Position & Scale character like Brawl Stars hero
        model.scale.set(1.95, 1.95, 1.95);
        model.position.set(0, -2.1, 0);

        // Find and store key bones for dynamic animation
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Tailor clothing colors for Hikaru vs Magnus
            if (child.material) {
              const mat = child.material as THREE.MeshStandardMaterial;
              mat.roughness = 0.35;
              mat.metalness = 0.1;

              if (child.name.includes("Outfit_Top")) {
                if (personaRef.current === "hikaru") {
                  mat.color.setHex(0x181a24); // Dark streamer hoodie
                } else {
                  mat.color.setHex(0x1e3a5f); // Magnus navy jacket
                }
              }
              if (child.name.includes("Headwear")) {
                child.visible = personaRef.current === "hikaru"; // Glasses on Hikaru
              }
              if (child.name.includes("Beard")) {
                child.visible = personaRef.current === "hikaru"; // Beard on Hikaru
              }
            }
          }

          if (child instanceof THREE.Bone) {
            const name = child.name.toLowerCase();
            if (name === "head") headBone = child;
            if (name === "neck") neckBone = child;
            if (name === "spine2" || name === "spine1" || name === "spine") spineBone = child;
            if (name === "rightarm") rightArmBone = child;
            if (name === "rightforearm") rightForeArmBone = child;
            if (name === "leftarm") leftArmBone = child;
            if (name === "leftforearm") leftForeArmBone = child;
          }
        });

        scene.add(model);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.error("Failed to load 3D character:", err);
        setIsLoading(false);
      }
    );

    // ── Real-Time 60/120 FPS Animation Loop ──
    let animationId: number;
    const clock = new THREE.Clock();

    function renderLoop() {
      animationId = requestAnimationFrame(renderLoop);
      const time = clock.getElapsedTime();

      // 1. Orbit Golden 3D Chess Piece
      pieceGroup.position.x = Math.cos(time * 1.6) * 1.4 + 0.4;
      pieceGroup.position.z = Math.sin(time * 1.6) * 0.7;
      pieceGroup.position.y = Math.sin(time * 3.2) * 0.18 + 0.3;
      pieceGroup.rotation.y = time * 2.2;
      pieceGroup.rotation.z = Math.sin(time) * 0.15;

      // 2. Holographic Ground Rings
      ring1.rotation.z = time * 0.8;
      ring2.rotation.z = -time * 0.5;

      // 3. Floating Dust Particles
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += 0.007;
        if (positions[i * 3 + 1] > 2.5) positions[i * 3 + 1] = -2.5;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // 4. Animate 3D Rigged Character
      if (characterModel) {
        // Continuous smooth rotation (mouse drag or auto idle)
        characterModel.rotation.y = THREE.MathUtils.lerp(
          characterModel.rotation.y,
          modelRotationYRef.current,
          0.12
        );

        // Idle bounce & breathing (Brawl Stars style bouncy idle)
        const breathe = Math.sin(time * 2.8) * 0.035;
        characterModel.position.y = -2.1 + breathe;

        if (spineBone) {
          spineBone.rotation.x = Math.sin(time * 2.8) * 0.04;
          spineBone.rotation.z = Math.cos(time * 1.4) * 0.02;
        }

        // Head tracking mouse cursor
        if (headBone && neckBone) {
          const targetRotY = mouseTargetRef.current.x * 0.65;
          const targetRotX = -mouseTargetRef.current.y * 0.45;
          headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetRotY, 0.1);
          headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, targetRotX, 0.1);
          neckBone.rotation.y = THREE.MathUtils.lerp(neckBone.rotation.y, targetRotY * 0.4, 0.1);
        }

        // Dynamic Stunts & Poses
        const currentStunt = stuntRef.current;
        const currentEmotion = emotionRef.current;

        if (currentStunt === "facepalm" || currentEmotion === "blunder") {
          // Hand-to-forehead facepalm pose!
          if (rightArmBone && rightForeArmBone) {
            rightArmBone.rotation.x = THREE.MathUtils.lerp(rightArmBone.rotation.x, -1.8, 0.15);
            rightArmBone.rotation.z = THREE.MathUtils.lerp(rightArmBone.rotation.z, 0.4, 0.15);
            rightForeArmBone.rotation.x = THREE.MathUtils.lerp(rightForeArmBone.rotation.x, -1.3, 0.15);
          }
          if (headBone) {
            headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, 0.35, 0.1);
          }
        } else if (currentStunt === "flex" || currentEmotion === "brilliant") {
          // Triumphant fist pump / victory flex!
          if (rightArmBone && rightForeArmBone) {
            rightArmBone.rotation.x = THREE.MathUtils.lerp(rightArmBone.rotation.x, -2.6, 0.15);
            rightArmBone.rotation.z = THREE.MathUtils.lerp(rightArmBone.rotation.z, -0.4, 0.15);
            rightForeArmBone.rotation.x = THREE.MathUtils.lerp(rightForeArmBone.rotation.x, -0.6, 0.15);
          }
          if (leftArmBone) {
            leftArmBone.rotation.z = THREE.MathUtils.lerp(leftArmBone.rotation.z, 0.8, 0.15);
          }
        } else if (currentStunt === "point") {
          // Arm straight pointing horizontally towards the chessboard
          if (rightArmBone && rightForeArmBone) {
            rightArmBone.rotation.x = THREE.MathUtils.lerp(rightArmBone.rotation.x, -1.3, 0.2);
            rightArmBone.rotation.z = THREE.MathUtils.lerp(rightArmBone.rotation.z, -1.5, 0.2);
            rightArmBone.rotation.y = THREE.MathUtils.lerp(rightArmBone.rotation.y, 0.4, 0.2);
          }
          // Laser beam animation
          laserMat.opacity = Math.min(1, laserMat.opacity + 0.1);
        } else {
          // Normal natural idle posture with relaxed arms
          if (rightArmBone && rightForeArmBone) {
            rightArmBone.rotation.x = THREE.MathUtils.lerp(rightArmBone.rotation.x, 0.2 + Math.sin(time * 2.8) * 0.05, 0.1);
            rightArmBone.rotation.z = THREE.MathUtils.lerp(rightArmBone.rotation.z, 0.2, 0.1);
            rightForeArmBone.rotation.x = THREE.MathUtils.lerp(rightForeArmBone.rotation.x, 0.4, 0.1);
          }
          if (leftArmBone && leftForeArmBone) {
            leftArmBone.rotation.x = THREE.MathUtils.lerp(leftArmBone.rotation.x, 0.2 - Math.sin(time * 2.8) * 0.05, 0.1);
            leftArmBone.rotation.z = THREE.MathUtils.lerp(leftArmBone.rotation.z, -0.2, 0.1);
            leftForeArmBone.rotation.x = THREE.MathUtils.lerp(leftForeArmBone.rotation.x, 0.4, 0.1);
          }
          laserMat.opacity = Math.max(0, laserMat.opacity - 0.1);
        }
      }

      renderer.render(scene, camera);
    }
    renderLoop();

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
      laserGeo.dispose();
      laserMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  // ── 4. Interactive Stunt Triggers ──
  const trigger3DSpin = () => {
    playSound("achievement");
    setActiveStunt("spin");
    let startTime = performance.now();
    const startRot = modelRotationYRef.current;
    const duration = 900;

    function spinFrame(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      modelRotationYRef.current = startRot + ease * (Math.PI * 2);
      if (progress < 1) {
        requestAnimationFrame(spinFrame);
      } else {
        modelRotationYRef.current = 0;
        setActiveStunt("idle");
      }
    }
    requestAnimationFrame(spinFrame);
  };

  const triggerTakesBurst = () => {
    playSound("notify");
    setActiveStunt("flex");
    const phrases = persona === "hikaru"
      ? ["TAKES TAKES TAKES!", "200 IQ 🔥", "CHAT?!", "THE JUICE ⚡", "BOOM!"]
      : ["PURE CHESS 👑", "COMPLETELY WON", "SIMPLE & CLEAN", "MASTERMIND"];

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
    playSound("shoutout");
    setActiveStunt("point");
    onPointToBoard?.();
    setTimeout(() => {
      setActiveStunt("idle");
    }, 2200);
  };

  const triggerFacepalm = () => {
    playSound("incorrect");
    setActiveStunt("facepalm");
    setTimeout(() => {
      setActiveStunt("idle");
    }, 2500);
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
    >
      {/* ── Loading Spinner ── */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#fffc00]">
          <Loader2 className="size-10 animate-spin" />
          <span className="text-xs font-black uppercase tracking-wider">Loading 3D Coach...</span>
        </div>
      )}

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

      {/* ── Real WebGL 3D Canvas (Full 3D Character) ── */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        className="w-[340px] sm:w-[420px] md:w-[460px] h-[480px] sm:h-[560px] md:h-[620px] object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.8)] filter hover:brightness-105 transition-all"
      />

      {/* ── 3D Interactive Controls Bar (Brawl Stars Style) ── */}
      <div className="relative z-30 -mt-6 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-black/75 p-2 backdrop-blur-xl border border-white/15 shadow-2xl">
        <button
          type="button"
          onClick={trigger3DSpin}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20 transition-all active:scale-95 shadow-sm"
          title="Make 3D Coach Spin 360°"
        >
          <Rotate3d className="size-3.5 text-[#fffc00]" />
          <span>Spin 360°</span>
        </button>

        <button
          type="button"
          onClick={triggerTakesBurst}
          className="flex items-center gap-1 rounded-xl bg-amber-400/20 border border-amber-400/30 px-3 py-1.5 text-xs font-black text-amber-300 hover:bg-amber-400/30 transition-all active:scale-95 shadow-sm"
          title="Trigger Streamer Reaction"
        >
          <Zap className="size-3.5" />
          <span>{persona === "hikaru" ? "Takes Takes!" : "GM Flex!"}</span>
        </button>

        <button
          type="button"
          onClick={triggerLaserPointer}
          className="flex items-center gap-1 rounded-xl bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/30 transition-all active:scale-95 shadow-sm"
          title="Shoot Laser Beam at Chessboard"
        >
          <Flame className="size-3.5" />
          <span>Laser Point</span>
        </button>

        <button
          type="button"
          onClick={triggerFacepalm}
          className="flex items-center gap-1 rounded-xl bg-purple-500/20 border border-purple-500/30 px-2.5 py-1.5 text-xs font-black text-purple-300 hover:bg-purple-500/30 transition-all active:scale-95 shadow-sm"
          title="Facepalm Reaction"
        >
          <span>🤦‍♂️ Facepalm</span>
        </button>

        <button
          type="button"
          onClick={() => {
            modelRotationYRef.current = 0;
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
        <span>Click & drag to rotate 3D character in 360°</span>
      </span>
    </div>
  );
}
