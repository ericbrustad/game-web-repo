# Game Map Acceptance Checklist (Promote to Prod)

Use this list before promoting a preview to Production.

## Stability
- [ ] Engine badge shows **Mapbox** (or **MapLibre**) when `DEBUG_UI=1`.
- [ ] No white screen; `/debug` and `/api/ping` return OK.

## Geofences & dialogs
- [ ] **Show rings** ON + **Click to simulate** ON → click inside ring shows a dialog immediately (no freezes).
- [ ] Dialogs are **above** the map (z-index OK) and close with **Continue**.
- [ ] After prompt answers, **Mission Complete** appears and **Continue** advances to the next mission; rings update without reload.

## Overlay sync
- [ ] Overlays change when the mission changes (no stale markers).
- [ ] Rings are drawn via a single **GeoJSON** source + line layer; `setData()` is used for updates.

## Performance
- [ ] No DOM marker captures clicks (all overlay DOM has `pointer-events:none`).
- [ ] No repeated remove/add of sources on a simple toggle; rings update via `setData()`.

## Audio
- [ ] Settings allow **All**, **Music**, **FX**; first enable chirps to unlock autoplay.
- [ ] Audio overlays play only when the gate/category permits.

## Config
- [ ] Mapbox GL JS **v2.15.0** in Production (unless consciously testing v3 in preview).
- [ ] Env vars set for both Preview & Production: `NEXT_PUBLIC_MAPBOX_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_MEDIA_BUCKET=game-media`, `SUPABASE_MEDIA_PREFIX=` (blank), and (optional) `DEBUG_UI=1` for preview.
