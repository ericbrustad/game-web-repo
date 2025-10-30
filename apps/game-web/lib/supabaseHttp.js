const getSupabaseUrl = () =>
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const getServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const getAnonKey = () =>
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function authHeaders(key) {
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": "application/json",
  };
}

export function getProjectRef() {
  const url = getSupabaseUrl();
  const m = url.match(/https?:\/\/([a-zA-Z0-9-]+)\.supabase\.co/);
  return m ? m[1] : null;
}

export async function listBuckets() {
  const url = getSupabaseUrl();
  const key = getServiceKey();
  if (!url) return { data: null, error: "Missing SUPABASE_URL" };
  if (!key) return { data: [], error: null };
  const r = await fetch(`${url}/storage/v1/buckets`, { headers: authHeaders(key) });
  if (!r.ok) return { data: null, error: (await r.text()) || r.statusText };
  return { data: await r.json(), error: null };
}

export async function listFiles(bucket, prefix = "", limit = 1000, sortBy = { column: "name", order: "asc" }) {
  const url = getSupabaseUrl();
  if (!url) return { data: null, error: "Missing SUPABASE_URL" };
  const key = getServiceKey() || getAnonKey();
  if (!key) return { data: null, error: "Missing service or anon key" };
  const body = { prefix, limit, sortBy };
  const r = await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: "POST",
    headers: authHeaders(key),
    body: JSON.stringify(body),
  });
  if (!r.ok) return { data: null, error: (await r.text()) || r.statusText };
  // Returns an array of objects with fields like: name, id, updated_at, created_at, metadata, etc.
  return { data: await r.json(), error: null };
}

export function envSummary() {
  return {
    hasUrl: !!getSupabaseUrl(),
    hasServiceKey: !!getServiceKey(),
    hasAnonKey: !!getAnonKey(),
  };
}

export function getDefaults() {
  return {
    bucket: process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || process.env.SUPABASE_MEDIA_BUCKET || "game-media",
    prefix: process.env.NEXT_PUBLIC_SUPABASE_MEDIA_PREFIX || process.env.SUPABASE_MEDIA_PREFIX || "",
  };
}

// Fetch a JSON object from storage (public URL first, then auth if needed)
export async function getObjectJson(bucket, path) {
  const url = getSupabaseUrl();
  if (!url) return { data: null, error: "Missing SUPABASE_URL" };

  async function tryFetch(endpoint, headers = {}) {
    const r = await fetch(endpoint, { headers });
    if (!r.ok) return { ok: false, status: r.status, text: await r.text() };
    try {
      return { ok: true, json: await r.json() };
    } catch (e) {
      return { ok: false, status: 200, text: "Invalid JSON" };
    }
  }

  // 1) Public (no auth)
  let resp = await tryFetch(`${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}`);
  if (resp.ok) return { data: resp.json, error: null };

  // 2) Auth (service or anon)
  const key = getServiceKey() || getAnonKey();
  if (!key) return { data: null, error: "Missing service or anon key to fetch object" };
  resp = await tryFetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, authHeaders(key));
  if (resp.ok) return { data: resp.json, error: null };

  return { data: null, error: resp.text || `HTTP ${resp.status}` };
}

// Server-only: upload/overwrite a text object (e.g., JSON) to Storage
export async function putObjectText(
  bucket,
  path,
  text,
  contentType = "application/json",
  upsert = true
) {
  const url = getSupabaseUrl();
  const key = getServiceKey();
  if (!url || !key) {
    return { data: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };
  }

  const body = typeof text === "string" ? text : JSON.stringify(text);
  const r = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, {
    method: "POST",
    headers: { ...authHeaders(key), "content-type": contentType, "x-upsert": String(!!upsert) },
    body,
  });
  if (!r.ok) {
    return { data: null, error: (await r.text()) || r.statusText, status: r.status };
  }
  try {
    return { data: await r.json(), error: null };
  } catch {
    return { data: null, error: null };
  }
}
