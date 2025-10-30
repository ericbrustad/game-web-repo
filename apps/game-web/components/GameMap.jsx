import React, { useEffect, useRef, useState } from "react";
import { OVERLAYS } from "../lib/overlays";
import { startGeofenceWatcher } from "../lib/geofence";
import { emit, on, Events } from "../lib/eventBus";
import { showBanner } from "./ui/Banner";

const MAPBOX_VERSION = "v2.15.0";
const MAPLIBRE_VERSION = "3.6.1";
const DEFAULT_CENTER = [-93.265, 44.9778];
const DEFAULT_ZOOM = 12;
const EARTH_RADIUS = 6371000;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.src = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadCssOnce(href) {
  if (document.querySelector(`link[data-href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.href = href;
  document.head.appendChild(link);
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function destPoint(lng, lat, bearingDeg, distMeters) {
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const θ = toRad(bearingDeg);
  const δ = distMeters / EARTH_RADIUS;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return [(((λ2 * 180) / Math.PI + 540) % 360) - 180, (φ2 * 180) / Math.PI];
}

function circleFeature(coords, radiusMeters, steps = 80) {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  const ring = [];
  for (let i = 0; i <= steps; i += 1) {
    ring.push(destPoint(lng, lat, (i / steps) * 360, radiusMeters));
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {}
  };
}

function distanceMeters(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default function GameMap({ overlays: overlaysProp }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const engineRef = useRef("maplibre");
  const recordsRef = useRef(new Map());
  const stopFenceRef = useRef(null);
  const debugRef = useRef(false);
  const simulateRef = useRef(false);
  const audioGateRef = useRef({ all: false, music: false, fx: false });
  const mapReadyRef = useRef(false);
  const insideIdsRef = useRef(new Set());
  const clickOverlayRef = useRef(null);

  const [engine, setEngine] = useState(null);
  const [engineNote, setEngineNote] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [simulateActive, setSimulateActive] = useState(false);
  const debugUi =
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_DEBUG_UI === "1" || process.env.DEBUG_UI === "1")) ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug_ui") === "1");

  function clearRecords() {
    for (const rec of recordsRef.current.values()) {
      try { rec.marker.remove(); } catch {}
      if (rec.media) {
        try { rec.media.pause(); } catch {}
      }
    }
    recordsRef.current.clear();
  }

  function renderRings() {
    if (!mapReadyRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    const srcId = "__rings_src";
    const layerId = "__rings_line";
    if (!debugRef.current) {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      } catch {}
      return;
    }
    const features = [];
    for (const rec of recordsRef.current.values()) {
      const feat = rec.feature;
      const radius = Math.max(10, Number(feat?.radius || 100));
      const circle = circleFeature(feat?.coordinates, radius, 80);
      if (circle) features.push(circle);
    }
    const data = { type: "FeatureCollection", features };
    try {
      if (map.getSource(srcId)) {
        map.getSource(srcId).setData(data);
      } else {
        map.addSource(srcId, { type: "geojson", data });
        map.addLayer({
          id: layerId,
          type: "line",
          source: srcId,
          paint: {
            "line-color": "rgba(255,0,0,0.75)",
            "line-width": 2,
            "line-dasharray": [2, 2]
          }
        });
      }
    } catch {}
  }

  useEffect(() => {
    mapReadyRef.current = mapReady;
  }, [mapReady]);

  useEffect(() => {
    let destroyed = false;
    let offSettings = null;

    (async () => {
      try {
        const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const forcedEngine = qs?.get("engine")?.toLowerCase();
        const overrideToken = qs?.get("mb") || qs?.get("mapbox") || null;
        const envToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN || "";
        const token = overrideToken || envToken;

        let map;
        let mode = "mapbox";

        async function bootMapbox() {
          if (!token) throw new Error("Missing Mapbox token");
          loadCssOnce(`https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.css`);
          await loadScript(`https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.js`);
          if (!window.mapboxgl) throw new Error("Mapbox GL not available");
          window.mapboxgl.accessToken = token;
          const mapbox = window.mapboxgl;
          const mapboxMap = new mapbox.Map({
            container: containerRef.current,
            style: process.env.NEXT_PUBLIC_MAPBOX_STYLE || "mapbox://styles/mapbox/streets-v12",
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            pitch: 45,
            bearing: -17,
            attributionControl: true
          });
          mapboxMap.addControl(new mapbox.NavigationControl({ visualizePitch: true }), "top-left");
          if (mapbox.GeolocateControl) {
            mapboxMap.addControl(new mapbox.GeolocateControl({
              positionOptions: { enableHighAccuracy: true },
              trackUserLocation: true,
              showUserHeading: true
            }), "top-left");
          }
          return { map: mapboxMap, mode: "mapbox" };
        }

        async function bootMapLibre(note) {
          loadCssOnce(`https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`);
          await loadScript(`https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`);
          const maplibre = window.maplibregl;
          const maplibreMap = new maplibre.Map({
            container: containerRef.current,
            style: "https://demotiles.maplibre.org/style.json",
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM
          });
          maplibreMap.addControl(new maplibre.NavigationControl({ visualizePitch: true }), "top-left");
          if (note) setEngineNote(note);
          return { map: maplibreMap, mode: "maplibre" };
        }

        if (forcedEngine === "maplibre") {
          ({ map, mode } = await bootMapLibre("Forced MapLibre via URL"));
        } else {
          try {
            ({ map, mode } = await bootMapbox());
          } catch (err) {
            ({ map, mode } = await bootMapLibre(token ? `Mapbox init failed: ${err?.message || err}` : "Missing token; using MapLibre"));
          }
        }

        if (destroyed) {
          try { map?.remove?.(); } catch {}
          return;
        }

        mapRef.current = map;
        engineRef.current = mode;
        setEngine(mode);

        const markReady = () => {
          if (destroyed) return;
          setMapReady(true);
        };
        if (map.loaded && map.loaded()) {
          markReady();
        } else if (typeof map.once === "function") {
          map.once("load", markReady);
        }

        const setInteractions = () => {
          try {
            const method = simulateRef.current ? "disable" : "enable";
            map.doubleClickZoom?.[method]?.();
            map.boxZoom?.[method]?.();
            map.dragRotate?.[method]?.();
            map.dragPan?.[method]?.();
            map.keyboard?.[method]?.();
            map.scrollZoom?.[method]?.();
            if (simulateRef.current) {
              map.touchZoomRotate?.disableRotation?.();
            } else {
              map.touchZoomRotate?.enableRotation?.();
            }
          } catch {}
        };

        setInteractions();

        offSettings = on(Events.SETTINGS_UPDATE, ({ audioAll, audioMusic, audioFx, debug, simulate }) => {
          audioGateRef.current = { all: !!audioAll, music: !!audioMusic, fx: !!audioFx };
          debugRef.current = !!debug;
          simulateRef.current = !!simulate;
          setSimulateActive(!!simulate);
          setInteractions();
          renderRings();
        });
      } catch (err) {
        console.error("[GameMap] init error", err);
        setEngineNote(err?.message || String(err));
      }
    })();

    return () => {
      destroyed = true;
      try { offSettings?.(); } catch {}
      try { stopFenceRef.current?.(); } catch {}
      stopFenceRef.current = null;
      clearRecords();
      try {
        const map = mapRef.current;
        if (map?.getLayer("__rings_line")) map.removeLayer("__rings_line");
        if (map?.getSource("__rings_src")) map.removeSource("__rings_src");
        map?.remove?.();
      } catch {}
      mapRef.current = null;
      engineRef.current = "maplibre";
      mapReadyRef.current = false;
      setMapReady(false);
      insideIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const sourceOverlays = Array.isArray(overlaysProp) && overlaysProp.length ? overlaysProp : OVERLAYS;

    // Prefer showing an interactive prompt overlay; fall back to dialog; else first
    function selectOne(arr) {
      if (!Array.isArray(arr) || !arr.length) return [];
      const withPrompt = arr.find((o) => o && o.prompt && typeof o.prompt.id === "string");
      if (withPrompt) return [withPrompt];
      const withDialog = arr.find((o) => o && o.dialog);
      if (withDialog) return [withDialog];
      return [arr[0]];
    }

    const candidates = sourceOverlays.filter((ov) => Array.isArray(ov?.coordinates) && ov.coordinates.length >= 2);
    const ACTIVE = selectOne(candidates);

    try { stopFenceRef.current?.(); } catch {}
    stopFenceRef.current = null;
    clearRecords();
    insideIdsRef.current.clear();

    const MarkerClass = engineRef.current === "mapbox" ? window.mapboxgl?.Marker : window.maplibregl?.Marker;
    if (!MarkerClass) return;

    function buildDom(feature) {
      const el = document.createElement("div");
      el.style.position = "relative";
      el.style.transform = "translate(-50%, -50%)";
      el.style.pointerEvents = "none";
      el.style.userSelect = "none";
      el.dataset.overlayId = feature.id;
      el.style.display = "none";
      let media = null;
      if (feature.type === "image") {
        const img = document.createElement("img");
        img.src = feature.url;
        const w = feature.size?.width ?? 240;
        const h = feature.size?.height ?? 160;
        Object.assign(img.style, {
          width: `${w}px`,
          height: `${h}px`,
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.85)",
          objectFit: "cover"
        });
        el.appendChild(img);
      } else if (feature.type === "video") {
        const video = document.createElement("video");
        video.src = feature.url;
        if (feature.poster) video.poster = feature.poster;
        video.loop = !!feature.loop;
        video.muted = true;
        video.playsInline = true;
        const w = feature.size?.width ?? 320;
        const h = feature.size?.height ?? 180;
        Object.assign(video.style, {
          width: `${w}px`,
          height: `${h}px`,
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.85)",
          background: "#000"
        });
        el.appendChild(video);
        media = video;
      } else if (feature.type === "text") {
        const card = document.createElement("div");
        Object.assign(card.style, {
          maxWidth: "260px",
          padding: "12px 14px",
          background: "rgba(255,255,255,0.95)",
          color: "#111",
          borderRadius: "12px",
          border: "1px solid #ddd",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          fontFamily: "system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif"
        });
        card.textContent = feature.text || feature.dialog?.text || feature.id;
        el.appendChild(card);
      } else if (feature.type === "audio") {
        const dot = document.createElement("div");
        Object.assign(dot.style, {
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "#ff3764",
          outline: "2px solid #fff",
          boxShadow: "0 0 0 4px rgba(255,55,100,0.35)"
        });
        el.appendChild(dot);
        media = new Audio(feature.url);
        media.crossOrigin = "anonymous";
        media.preload = "auto";
      } else {
        const pin = document.createElement("div");
        Object.assign(pin.style, {
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: "#111",
          outline: "2px solid #fff"
        });
        el.appendChild(pin);
      }
      return { el, media };
    }

    function shouldPlayAudio(feature) {
      const gates = audioGateRef.current || {};
      if (gates.all) return true;
      const category = String(feature?.category || "fx").toLowerCase();
      return category === "music" ? !!gates.music : !!gates.fx;
    }

    for (const feature of ACTIVE) {
      const coords = Array.isArray(feature.coordinates) ? feature.coordinates : null;
      if (!coords) continue;
      const { el, media } = buildDom(feature);
      const marker = new MarkerClass({ element: el }).setLngLat(coords).addTo(map);
      recordsRef.current.set(feature.id, { marker, el, type: feature.type, media, feature, visible: false });
    }

    const offEnter = on(Events.GEO_ENTER, ({ feature }) => {
      if (!feature) return;
      const rec = recordsRef.current.get(feature.id);
      if (!rec) return;
      rec.visible = true;
      rec.el.style.display = "block";
      if (rec.type === "video" && rec.media) {
        rec.media.currentTime = 0;
        rec.media.play().catch(() => {});
      }
      if (rec.type === "audio" && rec.media) {
        if (shouldPlayAudio(feature)) {
          rec.media.currentTime = 0;
          rec.media.play().catch(() => {});
        }
      }
      try { showBanner(`Entered zone: ${feature.id}`); } catch {}
      insideIdsRef.current.add(feature.id);
    });

    const offExit = on(Events.GEO_EXIT, ({ feature }) => {
      if (!feature) return;
      const rec = recordsRef.current.get(feature.id);
      if (!rec) return;
      rec.visible = false;
      rec.el.style.display = "none";
      if (rec.media) {
        try { rec.media.pause(); } catch {}
      }
      if (feature?.id) insideIdsRef.current.delete(feature.id);
    });

    if (ACTIVE.length) {
      stopFenceRef.current = startGeofenceWatcher({ features: ACTIVE, highAccuracy: true });
    }
    renderRings();

    return () => {
      offEnter();
      offExit();
      try { stopFenceRef.current?.(); } catch {}
      stopFenceRef.current = null;
      clearRecords();
      try {
        if (map.getLayer("__rings_line")) map.removeLayer("__rings_line");
        if (map.getSource("__rings_src")) map.removeSource("__rings_src");
      } catch {}
    };
  }, [overlaysProp, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!simulateActive) return;
    const overlayEl = clickOverlayRef.current;
    const map = mapRef.current;
    if (!overlayEl || !map?.unproject) return;

    let clickCooldown = false;
    const onClick = (ev) => {
      if (!simulateRef.current) return;
      if (clickCooldown) return;
      clickCooldown = true;
      setTimeout(() => { clickCooldown = false; }, 800);

      try { ev.preventDefault(); ev.stopPropagation(); } catch {}

      const rect = overlayEl.getBoundingClientRect();
      const px = [ev.clientX - rect.left, ev.clientY - rect.top];
      const lngLat = map.unproject(px);
      if (!lngLat) return;
      const { lng, lat } = lngLat;

      emit(Events.GEO_POSITION, { lng, lat, accuracy: 0 });

      let nearest = null;
      let best = Infinity;
      for (const rec of recordsRef.current.values()) {
        const coords = Array.isArray(rec.feature?.coordinates) ? rec.feature.coordinates : null;
        if (!coords) continue;
        const dist = distanceMeters({ lng, lat }, { lng: coords[0], lat: coords[1] });
        if (dist < best) {
          best = dist;
          nearest = rec.feature;
        }
      }

      if (nearest) {
        const radius = Number(nearest.radius || 100);
        const inside = best <= radius * 1.05;
        try { showBanner(`Click → ${nearest.id}: ${Math.round(best)}m / R=${radius}m · ${inside ? "INSIDE" : "outside"}`); } catch {}
        if (inside) {
          if (!insideIdsRef.current.has(nearest.id)) {
            insideIdsRef.current.add(nearest.id);
            emit(Events.GEO_ENTER, { feature: nearest, distance: best });
          }
          emit(Events.UI_OPEN_DIALOG, {
            title: nearest.dialog?.title || "Zone reached",
            message: nearest.dialog?.text || nearest.text || `Entered zone: ${nearest.id}`,
            continueLabel: nearest.dialog?.continueLabel || "Continue"
          });
        }
      }
    };

    overlayEl.addEventListener("click", onClick, { passive: false });
    return () => {
      overlayEl.removeEventListener("click", onClick);
    };
  }, [mapReady, simulateActive]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          minHeight: "100vh",
          minWidth: "100vw",
          cursor: simulateActive ? "crosshair" : "grab"
        }}
      />
      <div
        ref={clickOverlayRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: simulateActive ? "auto" : "none",
          background: "transparent",
          zIndex: 5
        }}
      />
      {debugUi && engine && (
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 10, pointerEvents: "none" }}>
          <div style={{ background: "#fff", border: "1px solid #ddd", padding: "6px 10px", borderRadius: 10, fontSize: 12 }}>
            Map engine: <strong>{engine === "mapbox" ? "Mapbox" : "MapLibre"}</strong>
            {engineNote ? <span style={{ opacity: 0.7 }}> — {engineNote}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
