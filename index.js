require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { bot, sendActivityAlert } = require('./telegram');
const { normalizeHeliusSwap, extractInvolvedAccounts } = require('./normalize');
const { addWatch, removeWatch, listWatches, getWatchersForWallet, getAllWallets } = require('./storage');
const { syncWebhookAddresses } = require('./helius');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;

function looksLikeSolanaAddress(str) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Hi! I watch Solana devnet wallets and alert you on buy/sell activity.\n\n" +
    "Commands:\n" +
    "/watch <wallet address> - start watching a wallet\n" +
    "/unwatch <wallet address> - stop watching a wallet\n" +
    "/list - show what you're watching"
  );
});

bot.onText(/\/watch (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const wallet = match[1].trim();

  if (!looksLikeSolanaAddress(wallet)) {
    return bot.sendMessage(chatId, "That doesn't look like a valid Solana address. Double-check and try again.");
  }

  const added = addWatch(chatId, wallet);
  if (!added) {
    return bot.sendMessage(chatId, "You're already watching that wallet.");
  }

  const result = await syncWebhookAddresses(getAllWallets());
  if (!result.ok) {
    return bot.sendMessage(chatId, "Added, but I couldn't sync with Helius just now - alerts may be delayed. An admin should check the logs.");
  }

  bot.sendMessage(chatId, `Watching ${wallet.slice(0, 6)}...${wallet.slice(-4)} now. You'll get a message here on any activity.`);
});

bot.onText(/\/unwatch (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const wallet = match[1].trim();

  const removed = removeWatch(chatId, wallet);
  if (!removed) {
    return bot.sendMessage(chatId, "You weren't watching that wallet.");
  }

  await syncWebhookAddresses(getAllWallets());
  bot.sendMessage(chatId, `Stopped watching ${wallet.slice(0, 6)}...${wallet.slice(-4)}.`);
});

bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id;
  const wallets = listWatches(chatId);
  if (wallets.length === 0) {
    return bot.sendMessage(chatId, "You're not watching any wallets yet. Use /watch <address> to add one.");
  }
  const lines = wallets.map(w => `- ${w.slice(0, 6)}...${w.slice(-4)}`).join('\n');
  bot.sendMessage(chatId, `You're watching:\n${lines}`);
});

app.get('/health', (req, res) => res.json({ ok: true, walletsWatched: getAllWallets().length }));

app.post('/webhook/solana', async (req, res) => {
  if (WEBHOOK_SECRET) {
    const provided = req.headers['authorization'];
    if (provided !== WEBHOOK_SECRET) {
      console.warn('[solana webhook] rejected: bad or missing auth header');
      return res.sendStatus(401);
    }
  }

  res.sendStatus(200);

  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    const knownWallets = getAllWallets();

    for (const event of events) {
      const involved = extractInvolvedAccounts(event);
      const matchedWallets = knownWallets.filter(w => involved.has(w));

      for (const wallet of matchedWallets) {
        const activity = normalizeHeliusSwap(event, wallet);
        const watchers = getWatchersForWallet(wallet);
        for (const chatId of watchers) {
          await sendActivityAlert(chatId, activity);
        }
      }
    }
  } catch (err) {
    console.error('[solana webhook] error:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Wallet watcher listening on port ${PORT}, watching ${getAllWallets().length} wallet(s)`);
});
