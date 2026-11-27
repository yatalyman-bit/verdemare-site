// Verifica che la richiesta sia passata da Cloudflare Access (login con codice via email).
// Se Access non è configurato, Desk resta chiuso: meglio chiuso che aperto a tutti.
let jwksCache = { keys: null, at: 0 };

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
const decodeJSON = s => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

function readToken(request) {
  const h = request.headers.get("Cf-Access-Jwt-Assertion");
  if (h) return h;
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return m ? m[1] : null;
}

async function keys(team) {
  if (jwksCache.keys && Date.now() - jwksCache.at < 3600e3) return jwksCache.keys;
  const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error("certs " + r.status);
  jwksCache = { keys: (await r.json()).keys || [], at: Date.now() };
  return jwksCache.keys;
}

export async function verifyAccess(request, env) {
  const team = (env.ACCESS_TEAM_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const aud = env.ACCESS_AUD || "";
  if (!team || !aud) return { ok: false, status: 503, why: "Desk non ancora protetto: manca la configurazione di Cloudflare Access." };
  const tok = readToken(request);
  if (!tok) return { ok: false, status: 401, why: "Accesso richiesto." };
  const parts = tok.split(".");
  if (parts.length !== 3) return { ok: false, status: 401, why: "Token non valido." };
  let head, claims;
  try { head = decodeJSON(parts[0]); claims = decodeJSON(parts[1]); } catch { return { ok: false, status: 401, why: "Token non valido." }; }
  if (head.alg !== "RS256") return { ok: false, status: 401, why: "Token non valido." };
  const jwk = (await keys(team)).find(k => k.kid === head.kid);
  if (!jwk) return { ok: false, status: 401, why: "Token non valido." };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const good = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  const now = Math.floor(Date.now() / 1000);
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!good || claims.exp < now || !auds.includes(aud) || claims.iss !== `https://${team}`)
    return { ok: false, status: 401, why: "Accesso scaduto o non valido." };
  return { ok: true, email: claims.email || "" };
}

export const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), rev INTEGER NOT NULL, data TEXT NOT NULL, updated TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS clicks (slug TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (slug, day))",
  "CREATE TABLE IF NOT EXISTS galleries (id TEXT PRIMARY KEY, client TEXT NOT NULL, title TEXT NOT NULL, created TEXT NOT NULL, expires TEXT NOT NULL, paid INTEGER NOT NULL DEFAULT 0, files TEXT NOT NULL DEFAULT '[]', zip_size INTEGER NOT NULL DEFAULT 0, ready INTEGER NOT NULL DEFAULT 0)",
  "CREATE TABLE IF NOT EXISTS open_orders (id TEXT PRIMARY KEY, gallery TEXT NOT NULL, k TEXT NOT NULL, created TEXT NOT NULL, photos TEXT NOT NULL, total INTEGER NOT NULL, name TEXT, contact TEXT, note TEXT, status TEXT NOT NULL DEFAULT 'new', paid TEXT)",
  "CREATE TABLE IF NOT EXISTS print_orders (id TEXT PRIMARY KEY, gallery TEXT NOT NULL, created TEXT NOT NULL, items TEXT NOT NULL, total INTEGER NOT NULL, name TEXT, email TEXT, phone TEXT, address TEXT, country TEXT, note TEXT, status TEXT NOT NULL DEFAULT 'new', shipped TEXT)",
];
// Colonne aggiunte dopo: si aggiungono da sole al primo avvio (se esistono già, l'errore si ignora).
const MIGRATIONS = [
  "ALTER TABLE galleries ADD COLUMN kind TEXT NOT NULL DEFAULT 'private'",
  "ALTER TABLE galleries ADD COLUMN pruned INTEGER NOT NULL DEFAULT 0",
];
let ready = false;
export async function ensureSchema(db) {
  if (ready) return;
  await db.batch(SCHEMA.map(q => db.prepare(q)));
  for (const m of MIGRATIONS) { try { await db.prepare(m).run(); } catch {} }
  ready = true;
}
