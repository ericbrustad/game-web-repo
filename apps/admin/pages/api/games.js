import { supaService } from '../../lib/supabase/server.js';
import { GAME_ENABLED } from '../../lib/game-switch.js';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'game';
}

function defaultSuite(title) {
  return {
    version: '0.0.1',
    missions: [
      {
        id: 'm01',
        title: title || 'Welcome',
        type: 'statement',
        rewards: { points: 10 },
        content: { text: `Welcome to ${title || 'the adventure'}! Ready to play?` },
      },
    ],
  };
}

function defaultConfig({ title, gameType, mode, slug, extras = {} }) {
  const players = mode === 'head2head' ? 2 : mode === 'multi' ? 4 : 1;
  const tags = new Set();
  if (slug) tags.add(slug);
  if (slug === 'default') tags.add('default-game');
  const baseConfig = {
    splash: { enabled: true, mode },
    game: {
      title,
      type: gameType || 'Mystery',
      tags: Array.from(tags),
      coverImage: extras.coverImage || '',
      shortDescription: extras.shortDescription || '',
      longDescription: extras.longDescription || '',
      slug,
    },
    forms: { players },
    textRules: [],
    timer: { durationMinutes: 0, alertMinutes: 10 },
    devices: [],
    powerups: [],
    media: { rewardsPool: [], penaltiesPool: [] },
    appearance: {},
    appearanceSkin: '',
    appearanceTone: 'light',
    map: { centerLat: 0, centerLng: 0, defaultZoom: 13 },
    geofence: { mode: 'test' },
    mediaTriggers: {},
  };
  return baseConfig;
}

export default async function handler(req, res) {
  let supa;
  try {
    supa = supaService();
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Supabase configuration missing' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supa.from('games').select('*', { order: { column: 'updated_at', ascending: false } });
    if (error) {
      return res.status(500).json({ ok: false, error: error.message || 'Failed to load games' });
    }
    const games = (data || []).map((entry) => {
      const config = entry?.config || {};
      const gameMeta = config?.game || {};
      return {
        slug: entry.slug,
        title: entry.title || gameMeta.title || entry.slug,
        status: entry.status || 'draft',
        mode: config?.splash?.mode || 'single',
        updatedAt: entry.updated_at,
        createdAt: entry.created_at,
        config,
      };
    });
    return res.status(200).json({ ok: true, games, gameProjectEnabled: GAME_ENABLED });
  }

  if (req.method === 'POST') {
    try {
      const {
        title,
        type,
        mode = 'single',
        slug: requestedSlug,
        shortDescription = '',
        longDescription = '',
        coverImage = '',
        missions: providedMissions,
        config: providedConfig,
      } = req.body || {};

      if (!title) {
        return res.status(400).json({ ok: false, error: 'Title is required' });
      }

      const baseSlug = slugify(requestedSlug || title);
      const slug = baseSlug || 'game';
      const now = new Date().toISOString();

      const config = providedConfig || defaultConfig({
        title,
        gameType: type,
        mode,
        slug,
        extras: { shortDescription, longDescription, coverImage },
      });

      const suite = providedMissions || defaultSuite(title);
      const missions = Array.isArray(suite?.missions) ? suite.missions : [];
      const devices = Array.isArray(config?.devices) ? config.devices : Array.isArray(config?.powerups) ? config.powerups : [];

      const upserts = [
        supa.from('games').upsert({
          slug,
          title: title || slug,
          status: 'draft',
          theme: config.appearance || {},
          map: config.map || {},
          config,
          updated_at: now,
        }),
        supa.from('missions').upsert({
          game_slug: slug,
          channel: 'draft',
          items: missions,
          updated_at: now,
        }),
        supa.from('missions').upsert({
          game_slug: slug,
          channel: 'published',
          items: [],
          updated_at: now,
        }),
        supa.from('devices').upsert({
          game_slug: slug,
          items: devices,
          updated_at: now,
        }),
      ];

      const results = await Promise.all(upserts);
      const failed = results.find((result) => result?.error);
      if (failed && failed.error) {
        throw failed.error;
      }

      return res.status(200).json({ ok: true, slug });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error?.message || 'Failed to create game' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
}
