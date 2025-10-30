import { supaService } from '../../lib/supabase/server.js';

function normalizeSlug(value) {
  const slug = String(value || '').trim();
  if (!slug) return 'default';
  if (slug === 'root' || slug === 'legacy-root') return 'default';
  return slug;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  let supa;
  try {
    supa = supaService();
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Supabase configuration missing' });
  }

  try {
    const { slug: querySlug } = req.query || {};
    const { config: configInput } = req.body || {};
    if (!configInput) {
      return res.status(400).json({ ok: false, error: 'Missing config payload' });
    }

    const slug = normalizeSlug(querySlug);
    const devices = Array.isArray(configInput?.devices)
      ? configInput.devices
      : Array.isArray(configInput?.powerups)
        ? configInput.powerups
        : [];
    const now = new Date().toISOString();

    const updates = [
      supa.from('games').upsert({
        slug,
        title: configInput?.game?.title || slug,
        status: 'draft',
        theme: configInput?.appearance || {},
        map: configInput?.map || {},
        config: configInput,
        updated_at: now,
      }),
      supa.from('devices').upsert({
        game_slug: slug,
        items: devices,
        updated_at: now,
      }),
    ];

    const results = await Promise.all(updates);
    const failure = results.find((result) => result?.error);
    if (failure && failure.error) {
      throw failure.error;
    }

    return res.status(200).json({ ok: true, slug, updated_at: now });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Failed to save config' });
  }
}
