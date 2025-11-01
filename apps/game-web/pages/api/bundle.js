/* CODEx NOTE (2025-10-27): New Bundle API created by ChatGPT for Eric.
   Purpose: Return a single "bundle" payload for a game slug + channel,
   pulling data from Supabase tables and optional storage signed URLs.
   If you change table names or shapes, update the TABLES map below.
*/

import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
// @ts-ignore -- local helper exposes a supabase-compatible client
import { createClient } from "../../lib/supabase-lite.js";

// ---------- Env & defaults ----------
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""; // server-only
const DEFAULT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_GAME_SLUG || "demo";
const DEFAULT_CHANNEL = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "published";
const DEFAULT_MEDIA_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || "media";

// Centralized table names so you can tweak without digging through code:
const TABLES = {
  games: "games",
  missions: "missions",
  devices: "devices",
  powerups: "powerups",
  missionMedia: "mission_media", // if you store media relations separately
} as const;

// ---------- Types (loose; adjust to your schema if needed) ----------
type GameRow = {
  id: string;
  slug: string;
  channel?: string | null;
  name?: string | null;
  appearance?: any;
  config?: any;
  map?: any;
  [k: string]: any;
};

type MissionRow = {
  id: string;
  game_id: string;
  title?: string;
  order_index?: number | null;
  geofence?: any;
  media?: any; // sometimes missions embed media refs in JSON
  [k: string]: any;
};

type DeviceRow = {
  id: string;
  game_id: string;
  kind?: string;
  config?: any;
  [k: string]: any;
};

type PowerupRow = {
  id: string;
  game_id: string;
  kind?: string;
  config?: any;
  [k: string]: any;
};

type MissionMediaRow = {
  id: string;
  mission_id: string;
  path?: string | null; // e.g. "briefcase/lock.png"
  bucket?: string | null; // e.g. "media"
  meta?: any;
  [k: string]: any;
};

type BundleMedia = {
  id?: string;
  bucket: string;
  path: string;
  signedUrl?: string;
  expiresIn?: number;
  meta?: any;
};

// ---------- Helpers ----------
function getServerSupabase() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE key envs.");
  }
  return createClient(SUPABASE_URL, key, {
    fetch: typeof fetch === "function" ? fetch.bind(globalThis) : undefined,
  });
}

function hashETag(obj: any) {
  const json = JSON.stringify(obj);
  return crypto.createHash("sha256").update(json).digest("hex").slice(0, 32);
}

function boolParam(v: string | string[] | undefined, fallback = false) {
  if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  return fallback;
}

function numParam(v: string | string[] | undefined, fallback: number) {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function collectMediaPathsFromJSON(json: any, acc: BundleMedia[] = [], defaultBucket = DEFAULT_MEDIA_BUCKET) {
  if (!json) return acc;
  if (Array.isArray(json)) {
    for (const item of json) collectMediaPathsFromJSON(item, acc, defaultBucket);
  } else if (typeof json === "object") {
    const maybePath = (json as any).path;
    const maybeBucket = (json as any).bucket;
    if (typeof maybePath === "string" && maybePath.trim()) {
      acc.push({
        bucket: typeof maybeBucket === "string" && maybeBucket ? maybeBucket : defaultBucket,
        path: maybePath.trim(),
        meta: (json as any).meta,
      });
    }
    for (const key of Object.keys(json)) {
      collectMediaPathsFromJSON((json as any)[key], acc, defaultBucket);
    }
  }
  return acc;
}

async function signMedia(client: any, media: BundleMedia[], expiresIn: number) {
  const out: BundleMedia[] = [];
  for (const item of media) {
    try {
      const { data, error } = await client.storage
        .from(item.bucket)
        .createSignedUrl(item.path, expiresIn);
      if (error) {
        out.push({ ...item });
      } else {
        const signed = data?.signedUrl ?? data?.signedURL ?? null;
        out.push({ ...item, signedUrl: signed ?? undefined, expiresIn });
      }
    } catch {
      out.push({ ...item });
    }
  }
  return out;
}

function coerceArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeGameRow(data: any, channel: string): GameRow | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    const withChannel = data.find((row) => (row?.channel ?? null) === channel);
    return (withChannel ?? data[0]) ?? null;
  }
  return data as GameRow;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const slug = String(req.query.game || req.query.slug || DEFAULT_SLUG).trim() || DEFAULT_SLUG;
  const channel = String(req.query.channel || DEFAULT_CHANNEL).trim() || DEFAULT_CHANNEL;
  const mediaBucket = String(req.query.bucket || DEFAULT_MEDIA_BUCKET).trim() || DEFAULT_MEDIA_BUCKET;

  const includeSigned = boolParam(req.query.signed, true);
  const expiresIn = numParam(req.query.expiresIn, 3600);
  const verbose = boolParam(req.query.verbose, false);

  let client: any;
  try {
    client = getServerSupabase();
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: `Supabase init failed: ${error?.message || error}` });
  }

  // 1) Load game by slug (prefer matching channel if column exists)
  const { data: gameRows, error: gameErr } = await client
    .from(TABLES.games)
    .select("*")
    .eq("slug", slug);

  const game = normalizeGameRow(gameRows, channel);
  if (gameErr || !game) {
    return res.status(404).json({
      ok: false,
      error: `Game not found for slug="${slug}"${channel ? `, channel="${channel}"` : ""}`,
      details: gameErr?.message || null,
    });
  }

  // 2) Load missions/devices/powerups in parallel
  const [missionsRes, devicesRes, powerupsRes] = await Promise.all([
    client.from(TABLES.missions).select("*").eq("game_id", game.id).order("order_index", { ascending: true }),
    client.from(TABLES.devices).select("*").eq("game_id", game.id),
    client.from(TABLES.powerups).select("*").eq("game_id", game.id),
  ]);

  const missions = coerceArray<MissionRow>(missionsRes?.data).filter(Boolean);
  const devices = coerceArray<DeviceRow>(devicesRes?.data).filter(Boolean);
  const powerups = coerceArray<PowerupRow>(powerupsRes?.data).filter(Boolean);

  // 3) Optional mission media join (best-effort per mission to avoid missing .in support)
  const missionMediaRows: MissionMediaRow[] = [];
  if (missions.length) {
    for (const mission of missions) {
      try {
        const { data, error } = await client
          .from(TABLES.missionMedia)
          .select("*")
          .eq("mission_id", mission.id);
        if (!error && Array.isArray(data)) {
          missionMediaRows.push(...(data as MissionMediaRow[]));
        }
      } catch {
        // Table may not exist; ignore
      }
    }
  }

  // 4) Collect referenced media paths from JSON fields + missionMedia rows
  const mediaRefs: BundleMedia[] = [];
  for (const mission of missions) {
    collectMediaPathsFromJSON(mission, mediaRefs, mediaBucket);
  }
  for (const device of devices) {
    collectMediaPathsFromJSON(device, mediaRefs, mediaBucket);
  }
  for (const powerup of powerups) {
    collectMediaPathsFromJSON(powerup, mediaRefs, mediaBucket);
  }
  for (const row of missionMediaRows) {
    if (row?.path) {
      mediaRefs.push({
        id: row.id,
        bucket: row.bucket || mediaBucket,
        path: row.path,
        meta: row.meta,
      });
    }
  }

  const deduped = new Map<string, BundleMedia>();
  for (const ref of mediaRefs) {
    const key = `${ref.bucket}::${ref.path}`;
    if (!deduped.has(key)) {
      deduped.set(key, ref);
    }
  }

  let media = Array.from(deduped.values());
  if (includeSigned && media.length) {
    media = await signMedia(client, media, expiresIn);
  }

  const bundle = {
    ok: true,
    _meta: {
      slug,
      channel,
      mediaBucket,
      signed: includeSigned,
      signedExpiresIn: includeSigned ? expiresIn : 0,
      generatedAt: new Date().toISOString(),
      elapsedMs: undefined as number | undefined,
      tables: TABLES,
      source: "supabase",
    },
    game,
    missions,
    devices,
    powerups,
    media,
  };

  bundle._meta.elapsedMs = Date.now() - startedAt;

  const etag = hashETag({
    slug,
    channel,
    gameId: game.id,
    mCount: missions.length,
    dCount: devices.length,
    pCount: powerups.length,
    mediaCount: media.length,
    updatedAt: game.updated_at || game.updatedAt || null,
  });

  if ((req.headers["if-none-match"] || "") === etag) {
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    return res.status(304).end();
  }

  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");

  if (verbose) {
    return res.status(200).json(bundle);
  }

  return res.status(200).json(bundle);
}
