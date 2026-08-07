"use client";

import { useEffect, useRef } from "react";
import { Globe } from "globe.gl";

interface GlobeGlProps {
  arcsData: ArcData[];
  pointsData: PointData[];
  onPointClick: (point: PointData) => void;
  onArcClick: (arc: ArcData) => void;
  globeRef: React.RefObject<Globe>;
}

interface ArcData {
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

interface PointData {
  lat: number;
  lng: number;
  size: number;
  color: string;
  countryCode: string;
  countryName: string;
  gameCount: number;
}

export function GlobeGl({
  arcsData,
  pointsData,
  onPointClick,
  onArcClick,
  globeRef,
}: GlobeGlProps) {
  const globeInstanceRef = useRef<Globe | null>(null);

  useEffect(() => {
    const globe = Globe()(document.createElement("div"))
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .showAtmosphere(true)
      .atmosphereColor("#ffffff")
      .atmosphereAltitude(0.15)
      .pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 0)
      .arcsData(arcsData)
      .arcColor((d) => d.color)
      .arcAltitude((d) => 0.15)
      .arcStroke((d) => 0.5)
      .arcDashLength(0.4)
      .arcDashGap((d) => 0.3)
      .arcDashAnimateTime((d) => 1000)
      .arcsTransitionDuration(1000)
      .pointsData(pointsData)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lng)
      .pointColor((d) => d.color)
      .pointRadius((d) => d.size)
      .pointAltitude(0.01)
      .onPointClick(onPointClick)
      .onArcClick(onArcClick)
      .enablePointerInteraction(true);

    globeInstanceRef.current = globe;
    globeRef.current = globe;

    const container = document.getElementById("globe-container");
    if (container) {
      container.innerHTML = "";
      container.appendChild(globe.renderer().domElement);
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.3;
    }

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current
        .arcsData(arcsData)
        .pointsData(pointsData);
    }
  }, [arcsData, pointsData]);

  return null;
}

declare global {
  interface Window {
    Globe: typeof Globe;
  }
}