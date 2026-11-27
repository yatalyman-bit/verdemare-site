// Prezzo delle foto di una open session: il più conveniente per il cliente tra pacchetti e "tutte".
// Stesso calcolo nel browser (static/js/openprice.js deve restare uguale).
function openPrice(n, tiers) {
  if (!n) return 0;
  const all = tiers.find(t => !t.photos), packs = tiers.filter(t => t.photos > 0);
  const dp = [0];
  for (let i = 1; i <= n; i++) { dp[i] = Infinity; for (const p of packs) dp[i] = Math.min(dp[i], dp[Math.max(0, i - p.photos)] + p.price); }
  return Math.min(all ? all.price : Infinity, dp[n]);
}
