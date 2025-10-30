// pages/api/vercel-status.js
// Optional. Poll the latest Vercel deployment state so the UI can show
// "Rebuilding…" → "Ready" after Save/Publish.
// Env needed (Admin project):
//   VERCEL_TOKEN
//   VERCEL_PROJECT_ID_GAME (and/or VERCEL_PROJECT_ID_ADMIN)

export default async function handler(req, res) {
  try {
    const { project = 'game-web' } = req.query || {};
    const token = process.env.VERCEL_TOKEN;
    const map = {
      'game-web': process.env.VERCEL_PROJECT_ID_GAME_WEB || process.env.VERCEL_PROJECT_ID_GAME,
      game:  process.env.VERCEL_PROJECT_ID_GAME,
      admin: process.env.VERCEL_PROJECT_ID_ADMIN,
    };
    const pid = map[project];
    if (!token || !pid) {
      return res.status(200).json({ ok:false, disabled:true, reason:'Missing VERCEL_TOKEN or project id' });
    }

    const r = await fetch(`https://api.vercel.com/v13/deployments?projectId=${encodeURIComponent(pid)}&limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json(j);

    const dep = Array.isArray(j.deployments) ? j.deployments[0] : null;
    return res.status(200).json({
      ok: true,
      state: dep?.readyState || 'UNKNOWN', // READY | QUEUED | BUILDING | CANCELED | ERROR
      url: dep?.url || null,
      createdAt: dep?.createdAt || null,
    });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) });
  }
}
