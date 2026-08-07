"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    const globe = new Globe(document.createElement("div"))
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .showAtmosphere(true)
      .atmosphereColor("#ffffff")
      .atmosphereAltitude(0.15)
      .pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 0)
      .arcsData(arcsData)
      .arcColor((d: any) => d.color)
      .arcAltitude((d: any) => 0.15)
      .arcStroke((d: any) => 0.5)
      .arcDashLength(0.4)
      .arcDashGap((d: any) => 0.3)
      .arcDashAnimateTime((d: any) => 1000)
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