import { supaService } from '../../lib/supabase/server.js';

function normalizeSlug(value) {
  const slug = String(value || '').trim();
  if (!slug) return 'default';
  if (slug === 'root' || slug === 'legacy-root') return 'default';
  return slug;
}

function extractMissions(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.missions)) return input.missions;
  return [];
}

function extractDevices(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.devices)) return input.devices;
  if (Array.isArray(input?.powerups)) return input.powerups;
  return [];
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
    const { slug: rawSlug, missions: missionsInput, config: configInput, devices: devicesInput } = req.body || {};
    const slug = normalizeSlug(rawSlug);
    if (!slug) {
      return res.status(400).json({ ok: false, error: 'Missing slug' });
    }

    const missionsProvided = missionsInput !== undefined;
    const devicesProvided = devicesInput !== undefined;
    const config = configInput && typeof configInput === 'object' ? configInput : null;

    const missions = missionsProvided ? extractMissions(missionsInput) : [];
    const devices = devicesProvided
      ? extractDevices(devicesInput)
      : config && Array.isArray(config.devices)
        ? extractDevices(config.devices)
        : [];

    if (!config && !missionsProvided && !devicesProvided) {
      return res.status(400).json({ ok: false, error: 'No draft payload provided' });
    }

    const now = new Date().toISOString();

    const tasks = [];
    if (config) {
      tasks.push(
        supa.from('games').upsert({
          slug,
          title: config?.game?.title || slug,
          status: 'draft',
          theme: config?.appearance || {},
          map: config?.map || {},
          config,
          updated_at: now,
        })
      );
    }

    if (missionsProvided) {
      tasks.push(
        supa.from('missions').upsert({
          game_slug: slug,
          channel: 'draft',
          items: missions,
          updated_at: now,
        })
      );
    }

    if (devicesProvided || (config && Array.isArray(config.devices))) {
      tasks.push(
        supa.from('devices').upsert({
          game_slug: slug,
          items: devices,
          updated_at: now,
        })
      );
    }

    const results = await Promise.all(tasks);
    const failure = results.find((result) => result?.error);
    if (failure && failure.error) {
      throw failure.error;
    }

    return res.status(200).json({ ok: true, slug, updated_at: now });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Failed to save draft' });
  }
}
