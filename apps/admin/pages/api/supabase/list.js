import { safeErrorMessage } from '../../../lib/safe-error';

export default async function handler(req, res) {
  const debug = req.query.debug === '1';
  try {
    const rawUrl = process.env.SUPABASE_URL || '';
    const baseUrl = rawUrl.trim().replace(/\/+$/, '');
    const srk = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const bucket = (req.query.bucket || process.env.SUPABASE_MEDIA_BUCKET || '').toString().trim();
    const prefix = (req.query.prefix || process.env.SUPABASE_MEDIA_PREFIX || '').toString();

    if (!baseUrl || !srk) {
      return res.status(400).json({
        ok: false,
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
        ...(debug ? { hasUrl: !!baseUrl, hasSrk: !!srk, srkLen: srk.length || 0, rawUrl } : {})
      });
    }
    if (!bucket) return res.status(400).json({ ok: false, error: 'Provide ?bucket= or set SUPABASE_MEDIA_BUCKET' });

    let data = null, text = null;
    try {
      const r = await fetch(`${baseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${srk}`,
          apikey: srk,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prefix, limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } })
      });
      text = await r.text();
      data = text ? (JSON.parse.bind(JSON))(text) : null; // parse if JSON
      if (!r.ok) {
        return res.status(200).json({ ok: false, error: text || `HTTP ${r.status}`, bucket, prefix });
      }
    } catch (e) {
      return res.status(500).json({ ok: false, error: safeErrorMessage(e), ...(debug ? { bucket, prefix, baseUrl } : {}) });
    }

    return res.status(200).json({ ok: true, bucket, prefix, count: data?.length || 0, files: data });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: safeErrorMessage(e),
      ...(debug ? { stack: typeof e?.stack === 'string' ? e.stack : undefined } : {}),
    });
  }
}
