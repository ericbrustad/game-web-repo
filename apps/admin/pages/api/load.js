import { promises as fs } from 'fs';
import path from 'path';
import { supaService } from '../../lib/supabase/server.js';

async function readJsonFile(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function normalizeSlug(input) {
  const slug = String(input || '').trim();
  if (!slug) return 'default';
  if (slug === 'root' || slug === 'legacy-root') return 'default';
  return slug;
}

function resolveLegacyPaths(slug, channel = 'draft') {
  const baseDir = channel === 'published' ? '' : 'draft/';
  const missionsFile = path.join(process.cwd(), 'public', 'games', slug, `${baseDir}missions.json`);
  const configFile = path.join(process.cwd(), 'public', 'games', slug, `${baseDir}config.json`);
  const devicesFile = path.join(process.cwd(), 'public', 'games', slug, `${baseDir}devices.json`);
  return { missionsFile, configFile, devicesFile };
}

export default async function handler(req, res) {
  const { slug: rawSlug, channel = 'draft' } = req.query || {};
  const slug = normalizeSlug(rawSlug);

  let supa;
  try {
    supa = supaService();
  } catch (error) {
    supa = null;
  }

  if (supa) {
    try {
      const [gameRes, missionsRes, devicesRes] = await Promise.all([
        supa.from('games').select('*', { filters: { slug }, single: true }),
        supa.from('missions').select('*', { filters: { game_slug: slug, channel }, single: true }),
        supa.from('devices').select('*', { filters: { game_slug: slug }, single: true }),
      ]);

      if (!gameRes.error && gameRes.data) {
        const game = gameRes.data;
        const config = game?.config || {};
        const missions = missionsRes?.data?.items || [];
        const devices = devicesRes?.data?.items || [];
        return res.status(200).json({
          ok: true,
          source: 'supabase',
          slug,
          channel,
          game,
          config,
          missions,
          devices,
        });
      }
    } catch (error) {
      // Ignore and fall through to legacy fallback
    }
  }

  const { missionsFile, configFile, devicesFile } = resolveLegacyPaths(slug, channel);
  const [legacyMissions, legacyConfig, legacyDevices] = await Promise.all([
    readJsonFile(missionsFile),
    readJsonFile(configFile),
    readJsonFile(devicesFile),
  ]);

  if (!legacyMissions && !legacyConfig && !legacyDevices) {
    return res.status(404).json({ ok: false, error: 'Game not found', slug });
  }

  return res.status(200).json({
    ok: true,
    source: 'legacy',
    slug,
    channel,
    game: {
      slug,
      title: legacyConfig?.game?.title || slug,
      status: 'draft',
      theme: legacyConfig?.appearance || {},
      map: legacyConfig?.map || {},
      config: legacyConfig || {},
    },
    config: legacyConfig || {},
    missions: Array.isArray(legacyMissions?.missions) ? legacyMissions.missions : Array.isArray(legacyMissions) ? legacyMissions : [],
    devices: Array.isArray(legacyDevices) ? legacyDevices : Array.isArray(legacyConfig?.devices) ? legacyConfig.devices : [],
  });
}
