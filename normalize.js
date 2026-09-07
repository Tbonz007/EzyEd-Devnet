/**
 * Converts a Helius "enhanced transaction" webhook event into a common
 * activity shape the telegram.js sender understands:
 *
 * { chain, wallet, action, tokenSymbol, tokenAmount,
 *   counterAsset, counterAmount, priceUsd, txHash, explorerUrl }
 *
 * NOTE: exact payload fields depend on your Helius webhook config (type:
 * 'SWAP' vs 'Any'). Log req.body for a few real devnet transactions and
 * adjust field paths here if something doesn't map cleanly.
 */

const CLUSTER = process.env.SOLANA_CLUSTER || 'devnet';

function normalizeHeliusSwap(event, watchedWallet) {
  const type = event.type; // e.g. 'SWAP', 'TRANSFER'
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
    priceUsd: null, // devnet tokens have no real price; leave null
    txHash: event.signature,
    explorerUrl: event.signature
      ? `https://solscan.io/tx/${event.signature}?cluster=${CLUSTER}`
      : null,
  };
}

module.exports = { normalizeHeliusSwap };
