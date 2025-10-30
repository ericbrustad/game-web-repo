export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  const bucket = String(req.query.bucket || '').trim();
  const prefix = String(req.query.prefix || '').trim();

  if (!bucket) return res.status(400).json({ ok: false, error: 'Missing ?bucket' });

  try {
    const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!url || !serviceKey) {
      return res.status(500).json({ ok: false, error: 'Supabase credentials are not configured' });
    }

    const listEndpoint = new URL(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, url);
    const requestBody = {
      prefix: prefix || '',
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    };

    const response = await fetch(listEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorPayload;
      try {
        errorPayload = await response.json();
      } catch (err) {
        errorPayload = { error: response.statusText };
      }

      const bucketsEndpoint = new URL('/storage/v1/bucket', url);
      const bucketsResponse = await fetch(bucketsEndpoint, {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      }).catch(() => null);

      let available = [];
      if (bucketsResponse?.ok) {
        try {
          const buckets = await bucketsResponse.json();
          available = Array.isArray(buckets) ? buckets.map(b => b.name).filter(Boolean) : [];
        } catch (err) {
          available = [];
        }
      }

      return res.status(response.status).json({
        ok: false,
        error: errorPayload?.error || 'Failed to list storage objects',
        available,
      });
    }

    const data = await response.json();
    return res.status(200).json({ ok: true, bucket, prefix, files: Array.isArray(data) ? data : [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
