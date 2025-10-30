# AGENTS.md — Esxape Ride (Admin & Game)

Operational reference for our bots, API workers, and background-ish “agents” that keep the **Game** and **Admin** apps running.

> **Projects**
> - **Game** (public player app): `apps/game-web` → `game.esxaperide.com`
> - **Admin** (internal editor): `apps/admin` (future: publish/export from Admin)

---

## 0) Quick status & health

**Game health**
- `/debug` – runtime & storage checks, links to ping/list
- `/api/ping` – env + storage buckets
- `/api/list-storage?bucket=game-media` – file listing
- `/api/game-load?game=<slug>` – resolves a mission bundle
- *(optional)* `/api/mapbox-env` – confirms token presence (hasToken/tokenLen)

**Env (Game) – must exist in Preview & Production**
- `NEXT_PUBLIC_MAPBOX_TOKEN` – Mapbox public key
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(server-only)*
- `SUPABASE_MEDIA_BUCKET = game-media`
-/ `SUPABASE_MEDIA_PREFIX =` *(blank)*
- `EXPORT_API_KEY` *(server-only, for /api/export-bundle)*

**Node/Build**
- Node `22.x` (Vercel)
- Game has `apps/game-web/vercel.json` to force `npm` build

---

## 1) Agent: **Mission Loader**
Loads a mission bundle for the player runtime.

- **Path**: `apps/game-web/pages/api/game-load.js`
- **Trigger**: HTTP GET `GET /api/game-load?game=<slug>[&path=...]`
- **Input**:
  - `game` (slug) – e.g., `demo`
  - Looks for bundle at (in order):
    1. **Supabase Storage**: `game-media/games/<slug>/bundle.json` (also tries `missions/<slug>.json`, `<slug>.json`)
    2. **Local fallback**: `/public/games/<slug>/bundle.json`
- **Output**: JSON `{ ok, bucket, path, bundle }`
- **Env**: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (read), `SUPABASE_SERVICE_ROLE_KEY` (optional; anon fallback allowed)
- **Runbook**:
  - 404/`ok:false` → verify path & policy; ensure bucket **Public** or add anon **select** policy:
    ```sql
    create policy "Allow anon read game-media"
    on storage.objects for select to anon
    using (bucket_id = 'game-media');
    ```

---

## 2) Agent: **Bundle Exporter**
Uploads a mission bundle to Supabase without local dev.

- **Path**: `apps/game-web/pages/api/export-bundle.js`
- **Trigger**: HTTP POST `POST /api/export-bundle`
- **Auth**: header `x-api-key: ${EXPORT_API_KEY}` (server-only secret)
- **Input** (JSON body):
  ```json
  { "game": "demo", "bundle": { "ui":{}, "missions":[] } }
  ```
  - Optional: `bucket`, `path`
- **Writes**: `game-media/games/<game>/bundle.json`
- **Env**: `EXPORT_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Test**:
  - 401 (no/invalid key) is expected when missing header
  - Success → `{ ok:true, bucket, path }`
- **Runbook**:
  - Rotate key: set new `EXPORT_API_KEY` in Vercel → redeploy
  - If blocked by bot protection from CLI, use browser tools (Hoppscotch/Postman Web) or Supabase UI

---

## 3) Agent: **Geofence Watcher**
Evaluates player position against mission zones and emits in-app events.

- **Path**: `apps/game-web/lib/geofence.js`
- **Trigger**: 
  - Real GPS: `navigator.geolocation.watchPosition`
  - Sim mode: `Events.GEO_POSITION` (click on map)
- **Inputs**: `features[]` (mission overlays with `{ id, coordinates:[lng,lat], radius }`)
- **Outputs (events)**:
  - `GEO_ENTER` / `GEO_EXIT` with `{ feature, distance }`
- **Runbook**:
  - No triggers? Confirm the watcher is started with the **same overlays** rendered (`ACTIVE`, not demo constants).
  - Debug HUD (when enabled): shows nearest zone and distance on click.

---

## 4) Agent: **Overlay/Modal Runtime**
Catches `GEO_ENTER` and shows mission dialogs & prompts with Continue flow.

- **Path**: `apps/game-web/components/GameRuntime.jsx`, `.../ui/Modal.jsx`
- **Modal rules**:
  - Portaled to `document.body` (z-index `10000`)
  - While open, we can optionally block map clicks (pointer-events)
- **Continue UX**:
  - Per-prompt, per-mission, or bundle-level `continueLabel`
  - Mission auto-complete if no prompts or all required answered
  - “All Missions Complete” when out of missions
- **Audio**:
  - Settings toggles for **All**, **Music**, **FX**
  - First enable resumes `AudioContext` and chirps (autoplay unlock)
  - Audio overlays can include `"category":"music"|"fx"` (defaults to `fx`)
- **Runbook**:
  - Dialog hidden under map? Use **Open test modal** (Settings) to verify
  - No popups but rings show – confirm `/api/game-load?game=<slug>` is `ok:true` and watcher uses mission overlays

---

## 5) Agent: **Ring Renderer (Debug)**
Draws always-visible geofence rings for operators.

- **Path**: `apps/game-web/components/GameMap.jsx`
- **Trigger**: Settings → “Show geofence debug rings”
- **Render**: true geodesic circle polygons via GeoJSON source + line layer (works in Mapbox & MapLibre)
- **Runbook**:
  - If rings vanish after toggles → toggle off/on; source is rebuilt

---

## 6) Agent: **Map Engine Bootstrap**
Initializes Mapbox GL JS v3 (Standard) with MapLibre fallback.

- **Path**: `apps/game-web/components/GameMap.jsx`
- **Token**: `NEXT_PUBLIC_MAPBOX_TOKEN`
- **Fallback**: If token missing/blocked or style load errors/timeouts → auto-switch to MapLibre + OSM
- **Debug**:
  - Badge shows `Map engine: Mapbox | MapLibre` (+ reason)
  - URL overrides: `?engine=mapbox|maplibre`, `?mb=<token>` for quick tests
- **Runbook**:
  - If white screen → check console for 401/403 style errors (token/domain scopes)

---

## 7) Agent: **Diagnostics**
Simple health endpoints for quick sanity.

- **/api/ping**: env summary + list buckets (tolerant if service key absent)
- **/api/list-storage?bucket=...&prefix=...**: reads storage with service key or anon fallback
- **/debug**: in-browser panel: status, links, and tips

---

## 8) Data contracts

### Mission bundle schema (v0)
```jsonc
{
  "ui": { "continueLabel": "Continue", "completeLabel": "Proceed", "finishLabel": "Done" },
  "missions": [
    {
      "id": "m1",
      "title": "Example",
      "ui": { "completeTitle": "Mission 1 Complete", "completeMessage": "Nice work!" },
      "overlays": [
        { "id":"note", "type":"text", "coordinates":[-93.265,44.978], "radius":150,
          "dialog": { "title":"Heads up", "text":"Welcome", "continueLabel":"Got it" } },
        { "id":"quiz1", "type":"text", "coordinates":[-93.267,44.979], "radius":150,
          "prompt": { "id":"q1", "question":"What color is the X?", "correct":"blue" } },
        { "id":"aud1", "type":"audio", "category":"fx", "coordinates":[-93.266,44.9785], "radius":160,
          "url":"https://upload.wikimedia.org/wikipedia/commons/4/45/Beep-09.ogg" }
      ],
      "prompts": [{ "id":"q1", "required": true }]
    }
  ]
}
```

### Storage layout (Supabase)
```
game-media/
  games/
    <slug>/
      bundle.json
  (optional)
  missions/<slug>.json
  <slug>.json
```

---

## 9) Security & least privilege

- **Secrets never client-side**: `SUPABASE_SERVICE_ROLE_KEY`, `EXPORT_API_KEY` must NOT be `NEXT_PUBLIC_*`.
- **Export route gating**: `x-api-key` required; rotate quickly if leaked.
- **Storage**: allow **anon select** only on `game-media`; keep writes server-side via service key.
- **Mapbox**: scope token to your domains if desired; include Preview & Production hostnames.

---

## 10) SLOs & alerts (lightweight)

- **Availability**: runtime up and loading bundles (`/api/game-load` returns `ok:true`)
- **Latency**: mission load < 300ms
- **Error budget**: < 1% failed loads / 24h
- **Observe**: Vercel deploy logs for API routes; Supabase Storage access logs
- **Manual check**: bookmark `/debug` in Prod

---

## 11) Runbooks

**Promote a working preview to Production**
1. Vercel → Game → Deployments → select preview → **Promote to Production**.
2. Verify `/`, `/debug`, `/api/game-load?game=demo`.

**Export a bundle (no local)**
- Supabase UI: upload to `game-media/games/<slug>/bundle.json`
- or `POST /api/export-bundle` with header `x-api-key: ${EXPORT_API_KEY}`.

**Map fails to load**
- Confirm `NEXT_PUBLIC_MAPBOX_TOKEN` set in Preview+Production.
- Check Mapbox domain restrictions.
- Use `?engine=maplibre` to confirm fallback while you fix token.

**Dialogs not appearing**
- Use Settings → **Open test modal** (confirms portal/z-index).
- Ensure watcher uses **ACTIVE** (mission overlays).
- Turn on rings & simulate click near center; check debug banner distance/INSIDE.

---

## 12) Ownership

- **Product/Gameplay**: Eric (Esxape Ride)
- **Runtime & APIs**: Eric + Codex helper
- **Infra**: Vercel (deploys), Supabase (storage/auth)
- **On-call (temporary)**: Eric (manual), alerts via Vercel dashboard

---

## 13) Changelog (ops-facing)

- **2025-10**  
  - Mapbox v3 (Standard) with MapLibre fallback + engine badge  
  - `/api/export-bundle` gated by `EXPORT_API_KEY`  
  - Loader: Supabase-first → fallback `/public/games/<slug>/bundle.json`  
  - Modal portal + z-index 10000; watcher uses ACTIVE mission overlays  
  - Debug rings via GeoJSON layer  
  - Settings: Simulate, Rings, Audio All/Music/FX with autoplay chirp

---

## 14) Backlog (nice-to-haves)

- Volume mixer (Master/Music/FX) via WebAudio gain nodes  
- Admin → “Export to Game” button (calls `/api/export-bundle`)  
- Signed storage URLs for private bundles  
- Basic analytics (zone enters, time-to-complete, prompt stats)
