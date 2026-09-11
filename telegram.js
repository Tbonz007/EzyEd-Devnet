const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.warn('[telegram] TELEGRAM_BOT_TOKEN missing from env vars');
}

const bot = new TelegramBot(token, { polling: true });

async function sendActivityAlert(chatId, activity) {
  const {
    chain,
    wallet,
    action,
    tokenSymbol,
    tokenAmount,
    counterAsset,
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
    console.error(`[telegram] failed to send to ${chatId}:`, err.message);
  }
}

module.exports = { bot, sendActivityAlert };
