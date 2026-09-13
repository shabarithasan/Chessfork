"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import gsap from "gsap";

interface SlideData {
  videoUrl: string;
  videoPoster?: string;
  hasDarkOverlay?: boolean;
}

interface HomepageCanvasSliderProps {
  slides: SlideData[];
  onSlideChange?: (index: number) => void;
  startIndex?: number;
}

// ── Constants matching Rimac's exact values ──
const CYLINDER_RADIUS = 150;
const PLANE_HEIGHT = 90;
// PLANE_WIDTH is calculated dynamically to match viewport aspect ratio
const CAMERA_Z_REST = 245;
const CAMERA_Z_ZOOM_OUT = 285;
const ROTATION_DURATION = 0.9;
const ZOOM_OUT_DURATION = 0.8;
const ZOOM_IN_DURATION = 0.6;

export function HomepageCanvasSlider({
  slides,
  onSlideChange,
  startIndex = 0,
}: HomepageCanvasSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const slidesGroupRef = useRef<THREE.Object3D | null>(null);
  const videoPlayersRef = useRef<HTMLVideoElement[]>([]);
  const videoTexturesRef = useRef<THREE.VideoTexture[]>([]);
  const rafIdRef = useRef<number>(0);

  // State refs (avoid re-renders during animation)
  const activeIndexRef = useRef(startIndex);
  const isInitedRef = useRef(false);
  const progressRef = useRef(0);
  const swiperProgressRef = useRef(0);
  const rotationOffsetRef = useRef(0);
  const progressChangedRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const lastWheelTimeRef = useRef(0);
  const videoLoadedRef = useRef<boolean[]>([]); // Tracks which videos have decoded a frame

  // ── Slide opacity falloff ──
  const updateSlideOpacity = useCallback((activeIdx: number) => {
    const group = slidesGroupRef.current;
    if (!group) return;

    const count = slides.length;
    group.children.forEach((child, i) => {
      const distance = Math.abs(i - activeIdx);
      const wrappedDist = Math.min(distance, count - distance);
      
      // If the video hasn't loaded its first frame yet, hold it fully transparent
      const baseOpacity = Math.max(0, 1 - wrappedDist * 0.4);
      const targetOpacity = videoLoadedRef.current[i] ? baseOpacity : 0;

      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshBasicMaterial) {
          const isOverlay = obj.material.name === "overlay";
          const finalOpacity = isOverlay ? targetOpacity * 0.3 : targetOpacity;
          gsap.to(obj.material, {
            opacity: finalOpacity,
            duration: 0.5,
          });
        }
      });
    });
  }, [slides.length]);

  // ── Update all planes to face camera ──
  const updatePlaneLookAt = useCallback(() => {
    const group = slidesGroupRef.current;
    const camera = cameraRef.current;
    if (!group || !camera) return;

    group.children.forEach((child) => {
      child.lookAt(camera.position);
    });
  }, []);

  // ── Camera zoom ──
  const zoomOut = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    gsap.to(camera.position, {
      z: CAMERA_Z_ZOOM_OUT,
      duration: ZOOM_OUT_DURATION,
      ease: "power2.out",
    });
  }, []);

  const zoomIn = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    gsap.to(camera.position, {
      z: CAMERA_Z_REST,
      duration: ZOOM_IN_DURATION,
      ease: "power3.out",
    });
  }, []);

  // ── Video controller (Pre-warming) ──
  const videoController = useCallback((activeIdx: number) => {
    const count = slides.length;
    let nextIdx = activeIdx + 1;
    if (nextIdx >= count) nextIdx = 0;
    let prevIdx = activeIdx - 1;
    if (prevIdx < 0) prevIdx = count - 1;

    videoPlayersRef.current.forEach((video, i) => {
      if (i === activeIdx || i === nextIdx || i === prevIdx) {
        // Pre-warm active, next, and previous
        video.preload = "auto";
        // .load() forces the browser to re-evaluate preload and start fetching if it hasn't
        if (video.readyState === 0) video.load();
        video.play().catch(() => {});
      } else {
        // Demote distant videos to save bandwidth/memory
        video.preload = "metadata";
        // Delay pause slightly to ensure smooth transitions if the user quickly reverses
        setTimeout(() => {
          if (activeIndexRef.current !== i) {
            video.pause();
          }
        }, 300);
      }
    });
  }, [slides.length]);

  // ── Navigate to slide ──
  const goToSlide = useCallback((direction: 1 | -1) => {
    if (isAnimatingRef.current) return;

    const count = slides.length;
    const fromIdx = activeIndexRef.current;
    let toIdx = fromIdx + direction;

    if (toIdx >= count) toIdx = 0;
    if (toIdx < 0) toIdx = count - 1;
    if (fromIdx === toIdx) return;

    isAnimatingRef.current = true;
    activeIndexRef.current = toIdx; // Update active index immediately so delayed callbacks see it

    if (process.env.NODE_ENV === "development" && !videoLoadedRef.current[toIdx]) {
      console.warn(`[Video Readiness] Slide ${toIdx} video has not fired 'loadeddata' yet. Transitioning anyway, plane will stay black until decoded.`);
    }

    // Trigger state change immediately so HTML text transitions start
    onSlideChange?.(toIdx);
    
    // Start pre-warming videos and update opacities immediately as rotation starts
    videoController(toIdx);
    updateSlideOpacity(toIdx);

    const group = slidesGroupRef.current;
    if (!group) {
      isAnimatingRef.current = false;
      return;
    }

    const anglePerSlide = (2 * Math.PI) / count;
    const targetRotation = -toIdx * anglePerSlide;
    let currentRotation = group.rotation.x;
    let diff = targetRotation - currentRotation;

    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    const finalRotation = currentRotation + diff;

    zoomOut();

    gsap.to(group.rotation, {
      x: finalRotation,
      duration: ROTATION_DURATION,
      ease: "power1.out",
      onUpdate: () => {
        updatePlaneLookAt();
      },
      onComplete: () => {
        zoomIn();
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, ZOOM_IN_DURATION * 1000);
      },
    });
  }, [slides.length, onSlideChange, zoomOut, zoomIn, updatePlaneLookAt, updateSlideOpacity, videoController]);

  // ── Three.js Scene Initialization ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check for mobile — skip WebGL
    if (window.innerWidth < 1024) return;

    const slideCount = slides.length;

    // ── Renderer — full viewport ──
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    renderer.setSize(winWidth, winHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // ── Camera ──
    // Calculate FOV so a plane of PLANE_HEIGHT at the active slide's distance exactly fills the viewport height
    const distToPlane = CAMERA_Z_REST - CYLINDER_RADIUS; // 245 - 150 = 95
    const fov = 2 * Math.atan(PLANE_HEIGHT / 2 / distToPlane) * (180 / Math.PI);
    const camera = new THREE.PerspectiveCamera(
      fov,
      winWidth / winHeight,
      1,
      800
    );
    camera.position.set(0, 0, CAMERA_Z_REST);
    cameraRef.current = camera;

    // ── Slides Group (this is what rotates) ──
    const slidesGroup = new THREE.Object3D();
    scene.add(slidesGroup);
    slidesGroupRef.current = slidesGroup;

    // ── Create video elements and 3D planes ──
    // Calculate plane width to match viewport aspect ratio
    const viewportAspect = winWidth / winHeight;
    const planeWidth = PLANE_HEIGHT * viewportAspect;
    const planeGeo = new THREE.PlaneGeometry(planeWidth, PLANE_HEIGHT, 1, 1);
    const videos: HTMLVideoElement[] = [];
    const textures: THREE.VideoTexture[] = [];
    (window as any)._threeScene = scene;
    (window as any)._threeCamera = camera;
    (window as any)._threeGroup = slidesGroup;

    for (let i = 0; i < slideCount; i++) {
      const slideObj = new THREE.Object3D();

      // Create hidden video element
      const video = document.createElement("video");
      video.src = slides[i].videoUrl;
      video.crossOrigin = "anonymous";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.style.display = "none";
      document.body.appendChild(video);
      videos.push(video);

      // Listen for first frame decoded to unlock opacity
      videoLoadedRef.current[i] = false;
      const handleLoadedData = () => {
        videoLoadedRef.current[i] = true;
        updateSlideOpacity(activeIndexRef.current);
      };
      if (video.readyState >= 2) {
        handleLoadedData();
      } else {
        video.addEventListener("loadeddata", handleLoadedData);
      }

      // Create video texture
      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBAFormat;
      videoTexture.colorSpace = THREE.SRGBColorSpace;
      textures.push(videoTexture);

      // Video mesh
      const videoMat = new THREE.MeshBasicMaterial({
        name: "video",
        map: videoTexture,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const videoMesh = new THREE.Mesh(planeGeo, videoMat);
      videoMesh.position.z = 0.1;
      slideObj.add(videoMesh);

      // Optional dark overlay (50% black)
      if (slides[i].hasDarkOverlay !== false) {
        const overlayMat = new THREE.MeshBasicMaterial({
          name: "overlay",
          color: 0x000000,
          opacity: 0.3,
          transparent: true,
          side: THREE.DoubleSide,
        });
        const overlayMesh = new THREE.Mesh(planeGeo, overlayMat);
        overlayMesh.position.z = 0.2;
        slideObj.add(overlayMesh);
      }

      // ── Radial positioning on vertical cylinder ──
      const angle = ((2 * Math.PI) / slideCount) * i + Math.PI / 2;
      slideObj.position.set(
        0,
        CYLINDER_RADIUS * Math.cos(angle),
        CYLINDER_RADIUS * Math.sin(angle)
      );
      slideObj.lookAt(camera.position);

      slidesGroup.add(slideObj);
    }

    videoPlayersRef.current = videos;
    videoTexturesRef.current = textures;

    // Set initial rotation to show startIndex
    const initialAngle = -startIndex * ((2 * Math.PI) / slideCount);
    slidesGroup.rotation.x = initialAngle;
    updatePlaneLookAt();

    // Start the first video
    videos[startIndex]?.play().catch(() => {});

    // Set initial opacity
    updateSlideOpacity(startIndex);

    // ── Render loop ──
    const animate = () => {
      rafIdRef.current = requestAnimationFrame(animate);
      // Update video textures
      textures.forEach((tex) => {
        const video = tex.source.data;
        // WebGL will throw INVALID_VALUE if we try to upload a video without decoded frames (readyState < 2)
        if (video && video.readyState >= 2 && !video.paused) {
          tex.needsUpdate = true;
        }
      });
      renderer.render(scene, camera);
    };
    rafIdRef.current = requestAnimationFrame(animate);

    // ── Resize handler ──
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      camera.aspect = newWidth / newHeight;
      const distToPlane = CAMERA_Z_REST - CYLINDER_RADIUS; // 95
      camera.fov = 2 * Math.atan(PLANE_HEIGHT / 2 / distToPlane) * (180 / Math.PI);
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // Mark as initialized after a short delay (matching Rimac's 1s delay)
    setTimeout(() => {
      isInitedRef.current = true;
    }, 1000);

    // ── Cleanup ──
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafIdRef.current);

      // Kill all GSAP tweens on our objects
      if (slidesGroupRef.current) {
        gsap.killTweensOf(slidesGroupRef.current.rotation);
      }
      if (cameraRef.current) {
        gsap.killTweensOf(cameraRef.current.position);
      }

      // Dispose Three.js resources
      textures.forEach((tex) => tex.dispose());
      planeGeo.dispose();
      slidesGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();

      // Remove video elements from DOM
      videos.forEach((v) => {
        v.pause();
        v.removeAttribute("src");
        v.load();
        v.remove();
      });

      // Remove canvas from container
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // Intentionally empty — we don't want to re-init on prop changes

  // ── Wheel / Keyboard / Touch input ──
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimatingRef.current) return;

      const now = Date.now();
      if (now - lastWheelTimeRef.current < 1200) return;
      lastWheelTimeRef.current = now;

      if (e.deltaY > 0) goToSlide(1);
      else if (e.deltaY < 0) goToSlide(-1);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        goToSlide(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToSlide(-1);
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const dy = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 50) {
        goToSlide(dy > 0 ? 1 : -1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [goToSlide]);

  // ── Lock body scroll ──
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen bg-black overflow-hidden"
      style={{ zIndex: 1 }}
    />
  );
}
