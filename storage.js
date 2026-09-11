const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'watches.json');

function ensureFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ watches: [] }, null, 2));
}

function load() {
  ensureFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return { watches: [] };
  }
}

function save(data) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function addWatch(chatId, wallet) {
  const data = load();
  const exists = data.watches.some(w => w.chatId === chatId && w.wallet === wallet);
  if (exists) return false;
  data.watches.push({ chatId, wallet });
  save(data);
  return true;
}

function removeWatch(chatId, wallet) {
  const data = load();
  const before = data.watches.length;
  data.watches = data.watches.filter(w => !(w.chatId === chatId && w.wallet === wallet));
  save(data);
  return data.watches.length < before;
}

function listWatches(chatId) {
  const data = load();
  return data.watches.filter(w => w.chatId === chatId).map(w => w.wallet);
}

function getWatchersForWallet(wallet) {
  const data = load();
  return data.watches.filter(w => w.wallet === wallet).map(w => w.chatId);
}

function getAllWallets() {
  const data = load();
  return [...new Set(data.watches.map(w => w.wallet))];
}

module.exports = { addWatch, removeWatch, listWatches, getWatchersForWallet, getAllWallets };
