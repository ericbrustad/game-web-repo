import { getDefaults, putObjectText } from "../../lib/supabaseHttp";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });

  const provided = req.headers["x-api-key"] || req.body?.apiKey;
  const expected = process.env.EXPORT_API_KEY || "";
  if (!expected) return res.status(500).json({ ok: false, error: "Server missing EXPORT_API_KEY" });
  if (!provided || provided !== expected) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const { bucket: defaultBucket } = getDefaults();
  const { game, bundle, path, bucket } = req.body || {};
  const targetBucket = String(bucket || defaultBucket);
  let objectPath = String(path || "").trim();
  if (!objectPath) {
    const gameSlug = (String(game || "demo").trim() || "demo").replace(/[^a-z0-9-_]/gi, "");
    objectPath = `games/${gameSlug}/bundle.json`;
  }
  if (!bundle || typeof bundle !== "object") {
    return res.status(400).json({ ok: false, error: "Missing or invalid 'bundle' (must be JSON object)" });
  }

  try {
    const { error, status } = await putObjectText(
      targetBucket,
      objectPath,
      JSON.stringify(bundle, null, 2),
      "application/json",
      true
    );
    if (error) {
      return res.status(200).json({ ok: false, error, status, bucket: targetBucket, path: objectPath });
    }
    return res.status(200).json({ ok: true, bucket: targetBucket, path: objectPath });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e?.message || String(e) });
  }
}
