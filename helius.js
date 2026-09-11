const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_WEBHOOK_ID = process.env.HELIUS_WEBHOOK_ID;

async function syncWebhookAddresses(addresses) {
  if (!HELIUS_API_KEY || !HELIUS_WEBHOOK_ID) {
    console.warn('[helius] missing HELIUS_API_KEY or HELIUS_WEBHOOK_ID - cannot sync addresses');
    return { ok: false, error: 'missing config' };
  }

  const url = `https://api.helius.xyz/v0/webhooks/${HELIUS_WEBHOOK_ID}?api-key=${HELIUS_API_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountAddresses: addresses }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[helius] failed to sync addresses:', res.status, text);
      return { ok: false, error: text };
    }

    return { ok: true };
  } catch (err) {
    console.error('[helius] sync error:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { syncWebhookAddresses };
