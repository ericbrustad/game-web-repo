# Game Map Best Practices (Esxape Ride)

This is the authoritative checklist for the web game map (Game app, `apps/game-web`). Use it during implementation and promotion.

## 1) Engine & stability
- Default to **Mapbox GL JS v2.15.0** (stable). Keep `?engine=mapbox|maplibre` override for testing.
- Never re-initialize the map after first load. One Map instance per page.

## 2) Layers over DOM
- Render **geofence rings** as a single **GeoJSON source + line layer** (true meters on the sphere). Do not draw rings as HTML or pixel circles.
- If you must render overlay content (image/video/text), keep their DOM wrappers `pointer-events:none` so the map never freezes or traps clicks.

## 3) Overlay sync model
- Split boot vs. sync:
  - **Boot**: initialize Mapbox/MapLibre once (`useEffect([])`).
  - **Sync**: in a separate effect **(depends on `[mapReady, overlaysProp]`)**, (re)build overlay markers, and (re)start the geofence watcher. Re-use the GeoJSON **source** via `setData()` instead of removing/adding layers.

## 4) Click reliability (simulate mode)
- Do **not** attach `map.on('click')` while in simulate mode. Instead, place a transparent overlay div and convert screen → lng/lat with `map.unproject`.
- When a click lands **inside** a ring (105% tolerance), immediately:
  - emit `GEO_ENTER` (to show or play overlay content),
  - and emit `UI_OPEN_DIALOG` to force the dialog to appear.
- Never create the default Mapbox marker (“blue pin”) in the click path.

## 5) Modals & UI layering
- Dialogs are **portaled to `document.body`** with z-index ≥ **10000**.
- Optional: block map pointer events while a modal is open, but leave overlays themselves `pointer-events:none`.

## 6) Performance hygiene
- Precompute ring polygons when overlays change; **do not** rebuild layers for each toggle—use `setData`.
- Avoid chatter logs; throttle banners/debug.
- Keep overlay DOM minimal (only visible when “entered”).

## 7) Debug & flags
- Show the engine badge (Mapbox/MapLibre and reason) only when `DEBUG_UI=1` (or `NEXT_PUBLIC_DEBUG_UI=1`).
- Provide a `/debug` page for health checks and quick links; do not block runtime on debug failures.

## 8) Acceptance (see the separate checklist)
- Click inside any ring → a dialog must appear without freezing.
- Advancing missions updates rings/overlays without reload.

> Rationale: These rules match Mapbox/MapLibre guidance (single instance, layers not DOM), avoid the canvas pointer-lock freeze seen on some GPUs, and keep UX predictable under network or timing races.
