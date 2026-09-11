const CLUSTER = process.env.SOLANA_CLUSTER || 'devnet';

function extractInvolvedAccounts(event) {
  const accounts = new Set();
  (event.tokenTransfers || []).forEach(t => {
    if (t.fromUserAccount) accounts.add(t.fromUserAccount);
    if (t.toUserAccount) accounts.add(t.toUserAccount);
  });
  (event.nativeTransfers || []).forEach(t => {
    if (t.fromUserAccount) accounts.add(t.fromUserAccount);
    if (t.toUserAccount) accounts.add(t.toUserAccount);
  });
  (event.accountData || []).forEach(a => {
    if (a.account) accounts.add(a.account);
  });
  if (event.feePayer) accounts.add(event.feePayer);
  return accounts;
}

function normalizeHeliusSwap(event, watchedWallet) {
  const type = event.type;
  const tokenTransfers = event.tokenTransfers || [];

  const incoming = tokenTransfers.find(t => t.toUserAccount === watchedWallet);
  const outgoing = tokenTransfers.find(t => t.fromUserAccount === watchedWallet);

  const action = type === 'SWAP' ? (incoming ? 'buy' : 'sell') : 'transfer';
  const primary = incoming || outgoing || tokenTransfers[0] || {};

  return {
    chain: `solana-${CLUSTER}`,
    wallet: watchedWallet,
    action,
    tokenSymbol: primary.tokenSymbol || primary.mint || 'UNKNOWN',
    tokenAmount: primary.tokenAmount || '0',
    counterAsset: null,
    counterAmount: null,
    priceUsd: null,
    txHash: event.signature,
    explorerUrl: event.signature
      ? `https://solscan.io/tx/${event.signature}?cluster=${CLUSTER}`
      : null,
  };
}

module.exports = { normalizeHeliusSwap, extractInvolvedAccounts };
