"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import mapboxgl from "mapbox-gl";
import Map, {
  Layer,
  Source,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GlobeGame, GlobeStats } from "./globe-game-types";
import { fetchGlobeData } from "./globe-mock-api";
import { playerPosition } from "./globe-geo";
import { GlobeLiveFeed } from "./GlobeLiveFeed";
import { GlobeStatsBar } from "./GlobeStatsBar";
import { GlobeInsightBubble } from "./GlobeInsightBubble";
import { GlobeGamePopup } from "./GlobeGamePopup";

const MAPBOX_TOKEN =
  "";

const EMPTY_FC: any = { type: "FeatureCollection", features: [] };

const LAYER_GLOW = {
  id: "player-glow",
  type: "circle",
  source: "dots",
  paint: {
    "circle-color": "#fbbf24",
    "circle-radius": 12,
    "circle-blur": 1,
    "circle-opacity": ["*", ["get", "opacity"], 0.12],
  },
} as const;

const LAYER_DOTS = {
  id: "player-dots",
  type: "circle",
  source: "dots",
  paint: {
    "circle-color": "#fde68a",
    "circle-radius": 3,
    "circle-blur": 0,
    "circle-opacity": ["get", "opacity"],
  },
} as const;

const LAYER_PULSE = {
  id: "player-pulse",
  type: "circle",
  source: "pulse-dots",
  paint: {
    "circle-radius": ["get", "radius"],
    "circle-blur": 1,
    "circle-color": "#fbbf24",
    "circle-opacity": ["get", "opacity"],
  },
} as const;

const LAYER_ARC_GLOW = {
  id: "arc-glow",
  type: "line",
  source: "arcs",
  paint: {
    "line-color": "#fbbf24",
    "line-width": 4,
    "line-blur": 3,
    "line-opacity": ["*", ["get", "opacity"], 0.3],
  },
} as const;

const LAYER_ARC_LINE = {
  id: "arc-line",
  type: "line",
  source: "arcs",
  paint: {
    "line-color": "#fbbf24",
    "line-width": 1,
    "line-opacity": ["get", "opacity"],
  },
} as const;

interface Pulse {
  lng: number;
  lat: number;
  born: number;
}
interface Arc {
  startLng: number;
  startLat: number;
  endLng: number;
  endLat: number;
  born: number;
}

function opacityFor(agoSeconds: number) {
  return +(0.9 - 0.6 * Math.min(agoSeconds / 3600, 1)).toFixed(2);
}

export default function ChessGlobe() {
  const mapRef = useRef<MapRef>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const gamesRef = useRef<GlobeGame[]>([]);
  const queueRef = useRef<GlobeGame[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);
  const pulsesRef = useRef<Pulse[]>([]);
  const arcsRef = useRef<Arc[]>([]);
  const rafRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinRef = useRef<() => void>(() => {});
  const pinnedRef = useRef<GlobeGame | null>(null);

  const [games, setGames] = useState<GlobeGame[]>([]);
  const [stats, setStats] = useState<GlobeStats>({
    total_games: 0,
    active_countries: 0,
    avg_rating: 0,
    top_countries: [],
  });
  const [hoverGame, setHoverGame] = useState<GlobeGame | null>(null);
  const [pinnedGame, setPinnedGame] = useState<GlobeGame | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    pinnedRef.current = pinnedGame;
  }, [pinnedGame]);

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(window.innerWidth < 640);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ---------------- player dots ---------------- */
  const dotsData = useMemo(() => {
    const features: any[] = [];
    for (const g of games) {
      const [wLng, wLat] = playerPosition(g, "white");
      const [bLng, bLat] = playerPosition(g, "black");
      const opacity = opacityFor(g.ago_seconds);
      features.push(
        {
          type: "Feature",
          properties: { id: g.id, color: "white", opacity },
          geometry: { type: "Point", coordinates: [wLng, wLat] },
        },
        {
          type: "Feature",
          properties: { id: g.id, color: "black", opacity },
          geometry: { type: "Point", coordinates: [bLng, bLat] },
        }
      );
    }
    return { type: "FeatureCollection", features } as any;
  }, [games]);

  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  /* ---------------- map setup: fog, spin, breathing dots ---------------- */
  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    function spin() {
      if (!pausedRef.current && !pinnedRef.current && mapRef.current && map) {
        map.easeTo({
          center: [map.getCenter().lng + 10, map.getCenter().lat],
          duration: 5000,
          easing: (t: number) => t,
        });
      }
    }
    spinRef.current = spin;
    function pause() {
      pausedRef.current = true;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      map?.stop();
    }
    function resume() {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => {
        pausedRef.current = false;
        spin();
      }, 3000);
    }

    map.setFog({
      color: "rgb(10, 16, 48)",
      "high-color": "rgb(14, 21, 69)",
      "horizon-blend": 0.04,
      "space-color": "#070b34",
      "star-intensity": 0.35,
    } as any);

    map.getStyle().layers?.forEach((layer) => {
      if (layer.type === "symbol") {
        map.setPaintProperty(layer.id, "text-opacity", 0.3);
      }
    });

    map.on("moveend", spin);
    map.on("mousedown", pause);
    map.on("mouseup", resume);
    map.on("wheel", pause);
    map.on("touchstart", pause);
    map.on("touchend", resume);
    map.on("wheel", resume);
    spin();

    const t0 = performance.now();
    spinTimer.current = setInterval(() => {
      if (!map.getLayer("player-dots")) return;
      const breathe = 0.925 + 0.075 * Math.sin(0.8 * ((performance.now() - t0) / 1000));
      try {
        map.setPaintProperty(
          "player-glow",
          "circle-opacity",
          ["*", ["*", ["get", "opacity"], 0.12], breathe]
        );
        map.setPaintProperty(
          "player-dots",
          "circle-opacity",
          ["*", ["get", "opacity"], breathe]
        );
      } catch {
        /* layer not ready yet */
      }
    }, 50);
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      if (spinTimer.current) clearInterval(spinTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!pinnedGame) {
      const id = setTimeout(() => spinRef.current(), 400);
      return () => clearTimeout(id);
    }
  }, [pinnedGame]);

  /* ---------------- simulated /api/globe polling ---------------- */
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const data = fetchGlobeData();
        if (!alive) return;
        setStats(data.stats);
        const incoming = data.games;
        const ids = new Set(incoming.map((g) => g.id));

        if (firstLoadRef.current) {
          firstLoadRef.current = false;
          const seed = Math.min(25, incoming.length);
          setGames(incoming.slice(0, incoming.length - seed));
          queueRef.current.push(...incoming.slice(-seed));
          for (const g of incoming) seenIdsRef.current.add(g.id);
        } else {
          const fresh = incoming.filter((g) => !seenIdsRef.current.has(g.id));
          for (const g of fresh) seenIdsRef.current.add(g.id);
          queueRef.current.push(...fresh);
          setGames((prev) => prev.filter((g) => ids.has(g.id)));
          queueRef.current = queueRef.current.filter((g) => ids.has(g.id));
          for (const id of seenIdsRef.current) {
            if (!ids.has(id)) seenIdsRef.current.delete(id);
          }
        }
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  /* ---------------- trigger a pulse + arc ---------------- */
  const trigger = useCallback((game: GlobeGame) => {
    const [wLng, wLat] = playerPosition(game, "white");
    const [bLng, bLat] = playerPosition(game, "black");
    const t = performance.now();
    pulsesRef.current.push(
      { lng: wLng, lat: wLat, born: t },
      { lng: bLng, lat: bLat, born: t }
    );
    if (game.white_country !== game.black_country) {
      arcsRef.current.push({
        startLng: wLng,
        startLat: wLat,
        endLng: bLng,
        endLat: bLat,
        born: t,
      });
    }
  }, []);

  /* drip-feed queued games into the visible list */
  useEffect(() => {
    const id = setInterval(() => {
      if (queueRef.current.length === 0) return;
      const next = queueRef.current.shift()!;
      setGames((prev) => [next, ...prev]);
      trigger(next);
    }, 1500);
    return () => clearInterval(id);
  }, [trigger]);

  /* ambient pulses from already-visible games */
  useEffect(() => {
    const id = setInterval(() => {
      const list = gamesRef.current;
      if (list.length === 0) return;
      trigger(list[Math.floor(Math.random() * list.length)]);
    }, 400);
    return () => clearInterval(id);
  }, [trigger]);

  /* animation loop for pulses + arcs */
  useEffect(() => {
    rafRef.current = requestAnimationFrame(function frame() {
      const map = mapRef.current?.getMap();
      if (map) {
        const now = performance.now();

        const pulseSource = map.getSource("pulse-dots") as any;
        if (pulseSource?.setData) {
          const features: any[] = [];
          pulsesRef.current = pulsesRef.current.filter((p) => {
            const age = now - p.born;
            if (age > 1500) return false;
            const t = age / 1500;
            features.push({
              type: "Feature",
              properties: { radius: 4 + 26 * t, opacity: 0.35 * (1 - t) },
              geometry: { type: "Point", coordinates: [p.lng, p.lat] },
            });
            return true;
          });
          pulseSource.setData({ type: "FeatureCollection", features });
        }

        const arcSource = map.getSource("arcs") as any;
        if (arcSource?.setData) {
          const features: any[] = [];
          arcsRef.current = arcsRef.current.filter((a) => {
            const age = now - a.born;
            if (age > 5000) return false;
            let headLng: number, headLat: number, opacity: number;
            if (age < 1000) {
              const t = age / 1000;
              const eased = 1 - (1 - t) * (1 - t);
              headLng = a.startLng + (a.endLng - a.startLng) * eased;
              headLat = a.startLat + (a.endLat - a.startLat) * eased;
              opacity = 0.6;
            } else {
              headLng = a.endLng;
              headLat = a.endLat;
              opacity = 0.6 * (1 - (age - 1000) / 4000);
            }
            features.push({
              type: "Feature",
              properties: { opacity },
              geometry: {
                type: "LineString",
                coordinates: [
                  [a.startLng, a.startLat],
                  [headLng, headLat],
                ],
              },
            });
            return true;
          });
          arcSource.setData({ type: "FeatureCollection", features });
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ---------------- interaction ---------------- */
  const containerOffset = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : { x: 0, y: 0 };
  };

  const handleClick = useCallback((e: MapMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const id = (e.features[0] as any).properties?.id;
      if (id) {
        const game = gamesRef.current.find((g) => g.id === id);
        if (game) {
          const off = containerOffset();
          setPinnedGame(game);
          setAnchor({ x: e.point.x + off.x, y: e.point.y + off.y });
          setHoverGame(null);
          return;
        }
      }
    }
    setPinnedGame(null);
  }, []);

  const handleMouseMove = useCallback((e: MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (e.features && e.features.length > 0) {
      map.getCanvas().style.cursor = "pointer";
      if (!pinnedRef.current) {
        const id = (e.features[0] as any).properties?.id;
        const game = gamesRef.current.find((g) => g.id === id);
        if (game) setHoverGame(game);
      }
    } else {
      map.getCanvas().style.cursor = "";
      setHoverGame(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "";
    setHoverGame(null);
  }, []);

  const getScreenPos = useCallback((game: GlobeGame) => {
    const map = mapRef.current?.getMap();
    if (!map) return null;
    const [lng, lat] = playerPosition(game, "white");
    const p = map.project([lng, lat]);
    const rect = wrapperRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 0;
    const h = rect?.height ?? 0;
    if (p.x < 100 || p.x > w - 100 || p.y < 100 || p.y > h - 100) return null;
    const off = containerOffset();
    return { x: p.x + off.x, y: p.y + off.y };
  }, []);

  const flyToGame = useCallback((game: GlobeGame) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const [lng, lat] = playerPosition(game, "white");
    setPinnedGame(null);
    setHoverGame(null);
    pausedRef.current = true;
    map.stop();
    map.flyTo({ center: [lng, lat], zoom: 3, duration: 1500 });
    setTimeout(() => {
      pausedRef.current = false;
      const p = map.project([lng, lat]);
      const off = containerOffset();
      setPinnedGame(game);
      setAnchor({ x: p.x + off.x, y: p.y + off.y });
    }, 1600);
  }, []);

  /* popup placement clamping */
  const hoverPosition = useMemo(
    () => ({
      x: Math.min(mouse.x + 16, viewport.width - 260 - 16),
      y: Math.max(Math.min(mouse.y - 8, viewport.height - 180 - 16), 16),
    }),
    [mouse, viewport]
  );

  const pinnedPosition = useMemo(
    () => ({
      x: Math.max(12, Math.min(anchor.x + 16, viewport.width - 290 - 12)),
      y: Math.max(12, Math.min(anchor.y - 16, viewport.height - 280 - 12)),
    }),
    [anchor, viewport]
  );

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black"
      onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
    >
      <div
        ref={wrapperRef}
        className="absolute inset-0"
        style={{ transform: isMobile ? "translateY(-12%)" : "none" }}
      >
        <Map
          ref={mapRef}
          mapLib={mapboxgl}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          projection="globe"
          initialViewState={{
            longitude: 10,
            latitude: 25,
            zoom: isMobile ? 0.8 : 1.5,
          }}
          minZoom={0.5}
          maxZoom={12}
          attributionControl={false}
          onLoad={handleLoad}
          interactiveLayerIds={["player-glow"]}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ width: "100%", height: "100%" }}
        >
          <Source id="dots" type="geojson" data={dotsData}>
            <Layer {...(LAYER_GLOW as any)} />
            <Layer {...(LAYER_DOTS as any)} />
          </Source>
          <Source id="pulse-dots" type="geojson" data={EMPTY_FC as any}>
            <Layer {...(LAYER_PULSE as any)} />
          </Source>
          <Source id="arcs" type="geojson" data={EMPTY_FC as any}>
            <Layer {...(LAYER_ARC_GLOW as any)} />
            <Layer {...(LAYER_ARC_LINE as any)} />
          </Source>
        </Map>
      </div>

      {/* Logo */}
      <div className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-40">
        <span className="text-[13px] tracking-[0.25em] font-medium text-zinc-400/80 uppercase">
          CHESSFORK · Live
        </span>
      </div>

      <GlobeLiveFeed games={games} />
      <GlobeStatsBar stats={stats} />
      <GlobeInsightBubble games={games} getScreenPos={getScreenPos} onInsightClick={flyToGame} />

      {hoverGame && !pinnedGame && (
        <GlobeGamePopup game={hoverGame} position={hoverPosition} />
      )}
      {pinnedGame && (
        <GlobeGamePopup
          game={pinnedGame}
          position={pinnedPosition}
          pinned
          onClose={() => setPinnedGame(null)}
        />
      )}
    </div>
  );
}
