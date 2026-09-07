# Solana Devnet Wallet Watcher (Telegram alerts)

Watches one Solana **devnet** wallet and posts buy/sell/transfer alerts to
a Telegram chat, using Helius devnet webhooks + Render (free tier) for
hosting — no VPS, no payment required.

Watched wallet: `Auc3HdZdqUAVhuyLLGG6AJHsSeepgotTNTaoHD76e1oN`
Cluster: `devnet`

---

## Step 1 — Create your Telegram bot
1. Open Telegram, message **@BotFather**, send `/newbot`, follow the prompts.
2. Copy the **bot token** it gives you.
3. Start a chat with your new bot (or add it to a group/channel) and send it
   any message so it has somewhere to reply.
4. Get your **chat ID**:
   - Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser
     right after messaging the bot.
   - Find `"chat":{"id": ...}` in the JSON response — that number is your
     `TELEGRAM_CHAT_ID`.

## Step 2 — Get a Helius API key (devnet)
1. Sign up free at [helius.dev](https://helius.dev).
2. Grab your API key from the dashboard — free tier is enough for watching
   one wallet.
3. Helius supports devnet directly; no separate signup needed for devnet vs
   mainnet, just a cluster setting when you create the webhook (Step 5).

## Step 3 — Push this project to GitHub
Render deploys from a GitHub repo.
```bash
cd telegram-wallet-bot
git init
git add .
git commit -m "Solana devnet wallet watcher"
```
Create a new empty repo on GitHub, then:
```bash
git remote add origin https://github.com/<you>/telegram-wallet-bot.git
git branch -M main
git push -u origin main
```
**Important:** `.env` is not included (see `.gitignore` below) — you'll enter
secrets directly in Render's dashboard instead, never commit them.

## Step 4 — Deploy to Render (free)
1. Sign up free at [render.com](https://render.com), connect your GitHub.
2. Click **New > Web Service**, pick your repo. Render will detect
   `render.yaml` and pre-fill the config.
3. When prompted, fill in the env vars marked `sync: false`:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `HELIUS_API_KEY`
   - `HELIUS_WEBHOOK_SECRET` — make up any random string, you'll reuse it in Step 5
4. Deploy. Once live, Render gives you a URL like
   `https://solana-devnet-wallet-watcher.onrender.com`.
5. Confirm it's running: visit `https://<your-render-url>/health` — should
   return `{"ok":true,"watching":"Auc3Hd..."}`.

Note: Render's free tier spins the service down after ~15 min of no traffic
and takes a few seconds to wake on the next request. For a devnet test bot
this is usually fine; if you later want zero-delay mainnet alerts, Render's
paid tier or Fly.io's always-on free allowance avoids the wake delay.

## Step 5 — Create the Helius devnet webhook
1. In the Helius dashboard, go to **Webhooks > Create Webhook**.
2. Set:
   - **Webhook URL**: `https://<your-render-url>/webhook/solana`
   - **Transaction type**: `Any` (or `SWAP` once you've confirmed the
     pipeline works, to cut down on noise)
   - **Account addresses**: `Auc3HdZdqUAVhuyLLGG6AJHsSeepgotTNTaoHD76e1oN`
   - **Cluster**: `devnet`
   - **Auth header**: paste the same string you used for
     `HELIUS_WEBHOOK_SECRET` in Render
3. Save.

## Step 6 — Test it
Send a small transfer or swap to/from the watched wallet on devnet (e.g. via
`solana transfer` CLI pointed at devnet, or a devnet faucet + a test swap).
Within a few seconds you should get a Telegram message.

If nothing arrives:
- Check Render's **Logs** tab for errors.
- Check Helius dashboard's webhook delivery log — it shows whether it sent
  the event and what response it got back.
- Confirm `/health` still returns OK (service may have spun down — reload
  and retry).

---

## Files
- `src/index.js` — Express server, `/webhook/solana` endpoint, auth check.
- `src/normalize.js` — turns Helius's raw event into `{action, token, amount, ...}`.
- `src/telegram.js` — formats and sends the Telegram message.
- `render.yaml` — Render service definition (auto-detected on deploy).

## Notes
- **Devnet tokens have no real price** — alerts show token + amount, not
  USD value. Swap to mainnet later by changing `SOLANA_CLUSTER=mainnet-beta`
  in Render's env vars and creating a new Helius webhook pointed at mainnet.
- **Payload shapes vary** — the `normalize.js` field mapping is based on
  typical Helius enhanced-webhook shapes; log a real `req.body` from your
  first test transaction and adjust if a field comes back empty.
- **This is free** as configured: Telegram (free), Helius free tier (free),
  Render free tier (free). No card required unless you outgrow either
  provider's free quota.
