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
    const { slug: bodySlug, missions: missionsInput, config: configInput } = req.body || {};

    if (!missionsInput || !configInput) {
      return res.status(400).json({ ok: false, error: 'Missing missions or config payload' });
    }

    const slug = normalizeSlug(bodySlug || querySlug);
    const now = new Date().toISOString();

    const missions = Array.isArray(missionsInput)
      ? missionsInput
      : Array.isArray(missionsInput?.missions)
        ? missionsInput.missions
        : [];
    const config = configInput || {};
    const devices = Array.isArray(config?.devices)
      ? config.devices
      : Array.isArray(config?.powerups)
        ? config.powerups
        : [];

    const updates = [
      supa.from('games').upsert({
        slug,
        title: config?.game?.title || slug,
        status: 'draft',
        theme: config?.appearance || {},
        map: config?.map || {},
        config,
        updated_at: now,
      }),
      supa.from('missions').upsert({
        game_slug: slug,
        channel: 'draft',
        items: missions,
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
    return res.status(500).json({ ok: false, error: error?.message || 'Failed to save bundle' });
  }
}
