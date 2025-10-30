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
    const { slug: rawSlug } = req.body || {};
    const slug = normalizeSlug(rawSlug);

    const draft = await supa.from('missions').select('*', {
      filters: { game_slug: slug, channel: 'draft' },
      single: true,
    });
    if (draft.error) {
      throw draft.error;
    }

    const now = new Date().toISOString();
    const draftItems = Array.isArray(draft.data?.items) ? draft.data.items : [];

    const publishResult = await supa.from('missions').upsert({
      game_slug: slug,
      channel: 'published',
      items: draftItems,
      updated_at: now,
    });
    if (publishResult.error) {
      throw publishResult.error;
    }

    const gameUpdate = await supa.from('games').update({ status: 'published', updated_at: now }, { slug });
    if (gameUpdate.error) {
      throw gameUpdate.error;
    }

    return res.status(200).json({ ok: true, slug, updated_at: now, missions: draftItems.length });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'Failed to publish game' });
  }
}
