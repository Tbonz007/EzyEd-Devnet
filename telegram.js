const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  console.warn('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing from .env');
}

// polling:false because this bot only sends messages, it doesn't need to receive commands.
const bot = new TelegramBot(token, { polling: false });

/**
 * Sends a formatted wallet-activity alert to the configured chat.
 * @param {object} activity - normalized activity object (see normalize.js)
 */
async function sendActivityAlert(activity) {
  const {
    chain,
    wallet,
    action, // 'buy' | 'sell' | 'transfer'
    tokenSymbol,
    tokenAmount,
    counterAsset, // e.g. USDC, SOL, ETH - what it was traded against
    counterAmount,
    priceUsd,
    txHash,
    explorerUrl,
  } = activity;

  const actionEmoji = action === 'buy' ? '🟢 BUY' : action === 'sell' ? '🔴 SELL' : '↔️ TRANSFER';
  const shortWallet = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  let text = `${actionEmoji}  <b>${chain.toUpperCase()}</b>\n`;
  text += `Wallet: <code>${shortWallet}</code>\n`;
  text += `Token: <b>${tokenSymbol}</b>\n`;
  text += `Amount: ${tokenAmount}`;
  if (counterAsset && counterAmount) {
    text += ` (${counterAmount} ${counterAsset})`;
  }
  text += `\n`;
  if (priceUsd) {
    text += `Price: $${priceUsd}\n`;
  }
  if (explorerUrl) {
    text += `<a href="${explorerUrl}">View transaction</a>`;
  } else if (txHash) {
    text += `Tx: <code>${txHash}</code>`;
  }

  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', disable_web_page_preview: true });
  } catch (err) {
    console.error('[telegram] failed to send message:', err.message);
  }
}

module.exports = { bot, sendActivityAlert };
