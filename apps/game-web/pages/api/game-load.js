import { getDefaults, listFiles, getObjectJson } from "../../lib/supabaseHttp";

// Tries several common mission bundle locations for a given ?game=<id>
export default async function handler(req, res) {
  const game = String(req.query.game || "").trim() || "demo";
  const { bucket } = getDefaults(); // defaults to game-media
  const candidates = [
    `games/${game}/data.json`,
    `games/${game}/bundle.json`,
    `missions/${game}.json`,
    `${game}.json`,
  ];
  // If a fully qualified path is passed, honor it:
  if (req.query.path) candidates.unshift(String(req.query.path));

  // 1) Supabase candidates
  for (const path of candidates) {
    const { data, error } = await getObjectJson(bucket, path);
    if (data && !error) {
      return res.status(200).json({ ok: true, bucket, path, bundle: data, source: "supabase" });
    }
  }

  // 2) Optional local fallback ONLY if explicitly enabled
  if (process.env.ALLOW_LOCAL_BUNDLE === "1") {
    try {
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const proto = (req.headers["x-forwarded-proto"] || "https").toString();
      const localPath = `games/${game}/bundle.json`;
      const r = await fetch(`${proto}://${host}/${localPath}`);
      if (r.ok) {
        const bundle = await r.json();
        return res
          .status(200)
          .json({ ok: true, bucket: null, path: localPath, bundle, source: "local" });
      }
    } catch (_) {}
  }

  // 3) Optional hint: list the bucket root to help user see what's there
  try {
    const list = await listFiles(bucket, "", 100, { column: "name", order: "asc" });
    return res.status(200).json({
      ok: false,
      error: `No mission bundle found for game='${game}'. Tried: ${candidates.join(", ")}`,
      bucket,
      tried: candidates,
      root: Array.isArray(list.data) ? list.data.map((f) => f.name) : [],
      source: "supabase",
    });
  } catch {
    return res.status(200).json({
      ok: false,
      error: `No mission bundle found for game='${game}'. Tried: ${candidates.join(", ")}`,
      bucket,
      tried: candidates,
      source: "supabase",
    });
  }
}
