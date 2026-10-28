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
  const [activeStunt, setActiveStunt] = useState<"idle" | "facepalm" | "flex" | "point" | "spin">("idle");
  const [burstParticles, setBurstParticles] = useState<Array<{ id: number; text: string; x: number; y: number }>>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References for live 3D controls inside Three.js animation loop
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
      // Full 360-degree rotation in true 3D space!
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

  // ── 3. Three.js Volumetric 3D Character & Arena Scene ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 480;
    const height = 620;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 5.4);

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

    // ── Brawl Stars Stylized Studio Lights ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 3.2);
    keyLight.position.set(2.5, 4.5, 3.5);
    scene.add(keyLight);

    const goldRimLight = new THREE.PointLight(0xffcc00, 3.8, 10);
    goldRimLight.position.set(-2.5, 2.5, -2);
    scene.add(goldRimLight);

    const cyanFillLight = new THREE.PointLight(0x38bdf8, 2.6, 8);
    cyanFillLight.position.set(2, -1.5, 2);
    scene.add(cyanFillLight);

    // ── 3D Ground Arena Rings & Shadow ──
    const shadowGeo = new THREE.CircleGeometry(1.4, 32);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -2.1;
    scene.add(shadowMesh);

    const ringGeo1 = new THREE.RingGeometry(1.2, 1.3, 48);
    const ringGeo2 = new THREE.RingGeometry(1.65, 1.72, 48);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });

    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    ring1.position.y = -2.08;
    scene.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2.3;
    ring2.position.y = -2.12;
    scene.add(ring2);

    // ── Real 3D Golden Chess Piece (Orbiting Mesh) ──
    const pieceGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.2, 24);
    const bodyGeo = new THREE.ConeGeometry(0.3, 0.8, 24);
    const pieceHeadGeo = new THREE.SphereGeometry(0.24, 24, 24);
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
    const headMesh = new THREE.Mesh(pieceHeadGeo, goldMaterial);
    headMesh.position.y = 0.65;
    const crownMesh = new THREE.Mesh(crownGeo, goldMaterial);
    crownMesh.position.y = 0.88;
    crownMesh.rotation.x = Math.PI / 2;

    pieceGroup.add(baseMesh, bodyMesh, headMesh, crownMesh);
    pieceGroup.scale.set(0.68, 0.68, 0.68);
    scene.add(pieceGroup);

    // ── Glowing Laser Beam ──
    const laserGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.5, 16);
    laserGeo.rotateZ(Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0 });
    const laserMesh = new THREE.Mesh(laserGeo, laserMat);
    laserMesh.position.set(-2.5, 0.2, 0);
    scene.add(laserMesh);

    // ── Floating 3D Sparkle Particles ──
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

    // ── Constructing the Volumetric 3D Character (Brawl Stars Hero Geometry) ──
    const characterGroup = new THREE.Group();
    characterGroup.position.set(0, -2.0, 0);

    const isHikaru = persona === "hikaru";

    // 1. Torso / Jacket (Volumetric 3D Cylinder with Lapels)
    const jacketMat = new THREE.MeshStandardMaterial({
      color: isHikaru ? 0x252830 : 0x162238, // Charcoal suit for Hikaru, Navy suit for Magnus
      roughness: 0.55,
      metalness: 0.1,
    });
    const torsoGeo = new THREE.CylinderGeometry(0.54, 0.44, 1.25, 24);
    const torsoMesh = new THREE.Mesh(torsoGeo, jacketMat);
    torsoMesh.position.y = 1.35;
    characterGroup.add(torsoMesh);

    // Inner Shirt Collar (Vibrant Orange Polo for Hikaru matching Pinterest photo, Blue for Magnus)
    const poloMat = new THREE.MeshStandardMaterial({
      color: isHikaru ? 0xea580c : 0x93c5fd,
      roughness: 0.6,
    });
    const poloGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.35, 16);
    const poloMesh = new THREE.Mesh(poloGeo, poloMat);
    poloMesh.position.set(0, 1.9, 0.08);
    characterGroup.add(poloMesh);

    // 2. Legs & Chunky Brawler Sneakers
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x161820, roughness: 0.6 });
    const legGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.95, 16);

    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.25, 0.48, 0);
    characterGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.25, 0.48, 0);
    characterGroup.add(rightLeg);

    // Chunky Sneakers
    const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const sneakerGeo = new THREE.BoxGeometry(0.26, 0.22, 0.52);

    const leftShoe = new THREE.Mesh(sneakerGeo, sneakerMat);
    leftShoe.position.set(-0.25, 0.1, 0.08);
    characterGroup.add(leftShoe);

    const rightShoe = new THREE.Mesh(sneakerGeo, sneakerMat);
    rightShoe.position.set(0.25, 0.1, 0.08);
    characterGroup.add(rightShoe);

    // 3. Arms & Hands (Jointed Shoulder & Elbow System)
    const skinMat = new THREE.MeshStandardMaterial({
      color: isHikaru ? 0xe2ad8a : 0xedd0be,
      roughness: 0.45,
    });
    const sleeveMat = jacketMat;

    // Left Arm (Shoulder -> Upper Arm -> Forearm -> Hand)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.64, 1.85, 0);

    const leftUpperArmGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.55, 16);
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeo, sleeveMat);
    leftUpperArm.position.y = -0.25;
    leftArmGroup.add(leftUpperArm);

    const leftForearmGroup = new THREE.Group();
    leftForearmGroup.position.set(0, -0.5, 0);

    const leftForearmGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.45, 16);
    const leftForearm = new THREE.Mesh(leftForearmGeo, skinMat);
    leftForearm.position.y = -0.2;
    leftForearmGroup.add(leftForearm);

    const leftHandGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const leftHand = new THREE.Mesh(leftHandGeo, skinMat);
    leftHand.position.y = -0.45;
    leftForearmGroup.add(leftHand);

    leftArmGroup.add(leftForearmGroup);
    leftArmGroup.rotation.z = 0.2;
    leftForearmGroup.rotation.x = 0.25; // Natural relaxed elbow bend
    characterGroup.add(leftArmGroup);

    // Right Arm (Animated for Facepalm, Flex, Laser Point)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.64, 1.85, 0);

    const rightUpperArmGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.55, 16);
    const rightUpperArm = new THREE.Mesh(rightUpperArmGeo, sleeveMat);
    rightUpperArm.position.y = -0.25;
    rightArmGroup.add(rightUpperArm);

    const rightForearmGroup = new THREE.Group();
    rightForearmGroup.position.set(0, -0.5, 0);

    const rightForearmGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.45, 16);
    const rightForearm = new THREE.Mesh(rightForearmGeo, skinMat);
    rightForearm.position.y = -0.2;
    rightForearmGroup.add(rightForearm);

    const rightHandGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const rightHand = new THREE.Mesh(rightHandGeo, skinMat);
    rightHand.position.y = -0.45;
    rightForearmGroup.add(rightHand);

    rightArmGroup.add(rightForearmGroup);
    rightArmGroup.rotation.z = -0.2;
    rightForearmGroup.rotation.x = 0.25; // Natural relaxed elbow bend
    characterGroup.add(rightArmGroup);

    // 4. Head Group (Full Volumetric 3D Head with Curving Face Decal)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.45, 0);

    // 3D Skull Base Sphere
    const characterHeadGeo = new THREE.SphereGeometry(0.5, 32, 32);
    characterHeadGeo.scale(1.0, 1.05, 0.98);
    const headBase = new THREE.Mesh(characterHeadGeo, skinMat);
    headGroup.add(headBase);

    // True 3D Curved Face Decal Geometry (curved around head, NOT a flat paper plane!)
    // phiStart/phiLength covers front ~110 degrees, thetaStart/thetaLength covers forehead to beard
    const faceCurvedGeo = new THREE.SphereGeometry(
      0.505, // slightly larger radius so it wraps snugly over the head sphere without z-fighting
      32,
      24,
      Math.PI / 2 - Math.PI / 3.4, // phiStart (centered front)
      Math.PI / 1.7,               // phiLength (covers cheeks)
      Math.PI * 0.16,              // thetaStart (just under hair)
      Math.PI * 0.64               // thetaLength (covers eyes, nose, teeth, beard)
    );

    const faceTexturePath = isHikaru
      ? "/images/coaches/hikaru_face_clean.png"
      : "/images/coaches/magnus_face_clean.png";

    const textureLoader = new THREE.TextureLoader();
    let faceMat: THREE.MeshBasicMaterial | null = null;
    textureLoader.load(faceTexturePath, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      faceMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const faceMesh = new THREE.Mesh(faceCurvedGeo, faceMat);
      headGroup.add(faceMesh);
    });

    // 3D Sculpted Hair (matching Hikaru's black wavy hair / Magnus's brown messy curls)
    const hairMat = new THREE.MeshStandardMaterial({
      color: isHikaru ? 0x121316 : 0x3d2b1f,
      roughness: 0.75,
    });
    const hairGeo = new THREE.SphereGeometry(0.52, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.56);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 0.14, -0.04);
    headGroup.add(hairMesh);

    // 3D Streamer Headset
    const headsetBandGeo = new THREE.TorusGeometry(0.54, 0.05, 12, 32, Math.PI);
    const headsetMat = new THREE.MeshStandardMaterial({
      color: isHikaru ? 0x1a1c24 : 0x242834,
      roughness: 0.3,
    });
    const headsetBand = new THREE.Mesh(headsetBandGeo, headsetMat);
    headsetBand.rotation.z = Math.PI;
    headsetBand.rotation.x = -0.1;
    headsetBand.position.y = 0.22;
    headGroup.add(headsetBand);

    // Glowing LED Ear Cushions
    const earPadGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 24);
    const earPadMat = new THREE.MeshStandardMaterial({
      color: 0x222530,
      emissive: isHikaru ? 0xffcc00 : 0x38bdf8,
      emissiveIntensity: 0.4,
    });
    const leftEarPad = new THREE.Mesh(earPadGeo, earPadMat);
    leftEarPad.rotation.z = Math.PI / 2;
    leftEarPad.position.set(-0.53, 0, 0);
    headGroup.add(leftEarPad);

    const rightEarPad = new THREE.Mesh(earPadGeo, earPadMat);
    rightEarPad.rotation.z = Math.PI / 2;
    rightEarPad.position.set(0.53, 0, 0);
    headGroup.add(rightEarPad);

    characterGroup.add(headGroup);
    scene.add(characterGroup);

    // ── Real-Time 60/120 FPS Animation Loop ──
    let animationId: number;
    const clock = new THREE.Clock();

    function renderLoop() {
      animationId = requestAnimationFrame(renderLoop);
      const time = clock.getElapsedTime();

      // 1. Orbit Golden 3D Chess Piece
      pieceGroup.position.x = Math.cos(time * 1.6) * 1.5 + 0.4;
      pieceGroup.position.z = Math.sin(time * 1.6) * 0.8;
      pieceGroup.position.y = Math.sin(time * 3.2) * 0.2 + 0.25;
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

      // 4. Smooth Volumetric 360° Drag & Inertia
      characterGroup.rotation.y = THREE.MathUtils.lerp(
        characterGroup.rotation.y,
        modelRotationYRef.current,
        0.12
      );

      // Bouncy Idle Breathing (Brawl Stars Hero Idle)
      const bounce = Math.sin(time * 2.8) * 0.04;
      characterGroup.position.y = -2.0 + bounce;
      torsoMesh.scale.y = 1.0 + Math.sin(time * 2.8) * 0.02;

      // Real-Time Head Look-At Cursor
      const targetHeadY = mouseTargetRef.current.x * 0.6;
      const targetHeadX = -mouseTargetRef.current.y * 0.4;
      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, targetHeadY, 0.12);
      headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, targetHeadX, 0.12);

      // 5. Stunts & Pose Animations
      const currentStunt = stuntRef.current;
      const currentEmotion = emotionRef.current;

      if (currentStunt === "facepalm" || currentEmotion === "blunder") {
        // Dramatic Blunder Facepalm: upper arm lifts, forearm bends to forehead
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, -1.8, 0.18);
        rightArmGroup.rotation.z = THREE.MathUtils.lerp(rightArmGroup.rotation.z, -0.4, 0.18);
        rightForearmGroup.rotation.x = THREE.MathUtils.lerp(rightForearmGroup.rotation.x, 1.6, 0.2);
        headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, 0.35, 0.12);
        laserMat.opacity = Math.max(0, laserMat.opacity - 0.1);
      } else if (currentStunt === "flex" || currentEmotion === "brilliant") {
        // Champion Victory Fist Pump
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, -2.6, 0.18);
        rightArmGroup.rotation.z = THREE.MathUtils.lerp(rightArmGroup.rotation.z, -0.3, 0.18);
        rightForearmGroup.rotation.x = THREE.MathUtils.lerp(rightForearmGroup.rotation.x, 1.2, 0.2);
        leftArmGroup.rotation.z = THREE.MathUtils.lerp(leftArmGroup.rotation.z, 0.8, 0.18);
        laserMat.opacity = Math.max(0, laserMat.opacity - 0.1);
      } else if (currentStunt === "point") {
        // Laser Point Stance towards Board
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, -1.5, 0.2);
        rightArmGroup.rotation.z = THREE.MathUtils.lerp(rightArmGroup.rotation.z, -1.4, 0.2);
        rightForearmGroup.rotation.x = THREE.MathUtils.lerp(rightForearmGroup.rotation.x, 0.1, 0.2);
        laserMat.opacity = Math.min(1, laserMat.opacity + 0.1);
      } else {
        // Natural Relaxed Idle Arms
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, Math.sin(time * 2.8) * 0.08, 0.1);
        rightArmGroup.rotation.z = THREE.MathUtils.lerp(rightArmGroup.rotation.z, -0.2, 0.1);
        rightForearmGroup.rotation.x = THREE.MathUtils.lerp(rightForearmGroup.rotation.x, 0.25, 0.1);
        leftArmGroup.rotation.x = THREE.MathUtils.lerp(leftArmGroup.rotation.x, -Math.sin(time * 2.8) * 0.08, 0.1);
        leftArmGroup.rotation.z = THREE.MathUtils.lerp(leftArmGroup.rotation.z, 0.2, 0.1);
        laserMat.opacity = Math.max(0, laserMat.opacity - 0.1);
      }

      renderer.render(scene, camera);
    }
    renderLoop();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      baseGeo.dispose();
      bodyGeo.dispose();
      pieceHeadGeo.dispose();
      crownGeo.dispose();
      characterHeadGeo.dispose();
      faceCurvedGeo.dispose();
      faceMat?.dispose();
      goldMaterial.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      ringMat1.dispose();
      ringMat2.dispose();
      laserGeo.dispose();
      laserMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      torsoGeo.dispose();
      poloGeo.dispose();
      legGeo.dispose();
      sneakerGeo.dispose();
      leftUpperArmGeo.dispose();
      leftForearmGeo.dispose();
      leftHandGeo.dispose();
      rightUpperArmGeo.dispose();
      rightForearmGeo.dispose();
      rightHandGeo.dispose();
      hairGeo.dispose();
      headsetBandGeo.dispose();
      earPadGeo.dispose();
    };
  }, [persona]);

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
    >
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

      {/* ── Volumetric 3D WebGL Canvas (Full 3D Character) ── */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        className="w-[340px] sm:w-[420px] md:w-[460px] h-[480px] sm:h-[560px] md:h-[620px] object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.85)] filter hover:brightness-105 transition-all"
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
