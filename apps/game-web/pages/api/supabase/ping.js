// Ping endpoint for game-web 
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

    const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const projectRef = url.startsWith('https://') ? url.split('https://')[1]?.split('.')[0] : null;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      env: 'game-web',
      baseUrl: url || null,
      projectRef,
      hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      now: new Date().toISOString(),
      // comment placeholder
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
