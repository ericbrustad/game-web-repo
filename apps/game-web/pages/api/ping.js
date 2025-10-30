import { envSummary, getProjectRef, listBuckets } from "../../lib/supabaseHttp";

export default async function handler(_req, res) {
  const out = {
    ok: true,
    time: new Date().toISOString(),
    env: { ...envSummary() },
    projectRef: getProjectRef(),
    buckets: [],
    storageError: null,
  };
  try {
    const { data, error } = await listBuckets();
    // If no service key, listBuckets() returns [] without error. That's fine.
    if (error) { out.storageError = error; }
    out.buckets = (data || []).map((b) => b.name);
  } catch (e) {
    out.ok = false;
    out.storageError = e?.message || String(e);
  }
  res.status(200).json(out);
}
