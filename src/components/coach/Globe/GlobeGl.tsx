"use client";

import { useEffect, useRef, useLayoutEffect, useState } from "react";
import Globe from "globe.gl";

export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  gameId: string;
  player1: string;
  player2: string;
  timeControl: string;
  opening: string;
}

export interface PointData {
  lat: number;
  lng: number;
  size: number;
  color: string;
  countryCode: string;
  countryName: string;
  gameCount: number;
}

interface GlobeGlProps {
  arcsData: ArcData[];
  pointsData: PointData[];
  onPointClick: (point: PointData) => void;
  onArcClick: (arc: ArcData) => void;
  globeRef: React.RefObject<any>;
}

export function GlobeGl({
  arcsData,
  pointsData,
  onPointClick,
  onArcClick,
  globeRef,
}: GlobeGlProps) {
  const globeInstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || dimensions.width === 0 || dimensions.height === 0) return;

    const globe = new Globe(container)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .showAtmosphere(true)
      .atmosphereColor("#ffffff")
      .atmosphereAltitude(0.15)
      .pointOfView({ lat: 0, lng: 0, altitude: 2.2 }, 0)
      .arcsData(arcsData)
      .arcColor((d: any) => d.color)
      .arcAltitude((d: any) => 0.12)
      .arcStroke((d: any) => 0.4)
      .arcDashLength(0.4)
      .arcDashGap((d: any) => 0.3)
      .arcDashAnimateTime((d: any) => 1500)
      .arcsTransitionDuration(1000)
      .pointsData(pointsData)
      .pointLat((d: any) => d.lat)
      .pointLng((d: any) => d.lng)
      .pointColor((d: any) => d.color)
      .pointRadius((d: any) => d.size)
      .pointAltitude(0.01)
      .onPointClick((point: any, event: any, coords: any) => onPointClick(point))
      .onArcClick((arc: any, event: any, coords: any) => onArcClick(arc))
      .enablePointerInteraction(true);

    globeInstanceRef.current = globe;
    globeRef.current = globe;

    const renderer = globe.renderer();
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const camera: any = globe.camera();
    if (camera && 'aspect' in camera) {
      camera.aspect = dimensions.width / dimensions.height;
      if (typeof camera.updateProjectionMatrix === "function") {
        camera.updateProjectionMatrix();
      }
    }

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.25;
    globe.controls().minDistance = 1.8;
    globe.controls().maxDistance = 4.5;

    const animate = () => {
      if (globeInstanceRef.current) {
        globeInstanceRef.current.controls().update();
        renderer.render(globeInstanceRef.current.scene(), camera);
        requestAnimationFrame(animate);
      }
    };
    animate();

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      renderer.setSize(rect.width, rect.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const cam: any = globe.camera();
      if (cam && 'aspect' in cam) {
        cam.aspect = rect.width / rect.height;
        if (typeof cam.updateProjectionMatrix === "function") {
          cam.updateProjectionMatrix();
        }
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [arcsData, pointsData, dimensions.width, dimensions.height, onPointClick, onArcClick]);

  return (
    <div
      ref={containerRef}
      id="globe-container"
      className="w-full h-full"
      style={{ width: "100%", height: "100%" }}
    />
  );
}