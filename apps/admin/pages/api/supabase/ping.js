//2//
import { safeErrorMessage } from '../../../lib/safe-error';

export default async function handler(req, res) {
  try {
    const baseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const srk = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!baseUrl || !srk) {
      return res.status(400).json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }
    const projectRef = new URL(baseUrl).host.split('.')[0];

    const authHealthResp = await fetch(`${baseUrl}/auth/v1/health`);
    const authHealth = authHealthResp.ok ? await authHealthResp.json() : { status: 'down', code: authHealthResp.status };

    const bucketsResp = await fetch(`${baseUrl}/storage/v1/bucket`, {
      headers: { Authorization: `Bearer ${srk}`, apikey: srk }
    });
    const buckets = bucketsResp.ok ? await bucketsResp.json() : null;
    const bucketsError = bucketsResp.ok ? null : { status: bucketsResp.status, text: await bucketsResp.text() };

    res.status(200).json({ ok: true, projectRef, authHealth, buckets, bucketsError });
  } catch (e) {
    res.status(500).json({ ok: false, error: safeErrorMessage(e) });
  }
}

