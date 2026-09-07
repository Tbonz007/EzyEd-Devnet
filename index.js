require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { sendActivityAlert } = require('./telegram');
const { normalizeHeliusSwap } = require('./normalize');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const WATCHED_WALLET = process.env.WATCHED_WALLET;
const WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;

if (!WATCHED_WALLET) {
  console.warn('[startup] WATCHED_WALLET is not set in .env');
}

// ---- Health check (Render/uptime pings this) ----
app.get('/health', (req, res) => res.json({ ok: true, watching: WATCHED_WALLET }));

// ---- Helius webhook (Solana devnet) ----
// Set this URL as the "Webhook URL" when creating a Helius webhook, with
// cluster set to devnet and account = WATCHED_WALLET.
app.post('/webhook/solana', async (req, res) => {
  // Verify the shared secret if you configured one as an auth header in Helius.
  if (WEBHOOK_SECRET) {
    const provided = req.headers['authorization'];
    if (provided !== WEBHOOK_SECRET) {
      console.warn('[solana webhook] rejected: bad or missing auth header');
      return res.sendStatus(401);
    }
  }

  // Ack quickly so Helius doesn't retry/timeout; process after responding.
  res.sendStatus(200);

  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      const activity = normalizeHeliusSwap(event, WATCHED_WALLET);
      await sendActivityAlert(activity);
    }
  } catch (err) {
    console.error('[solana webhook] error:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Wallet watcher listening on port ${PORT}, watching ${WATCHED_WALLET} on devnet`);
});
