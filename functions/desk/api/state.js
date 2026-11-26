import { ensureSchema } from "../../../lib/access.js";

const MAX = 1_800_000; // limite di una riga D1 (~2 MB), con margine
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function current(db) {
  const row = await db.prepare("SELECT rev, data FROM state WHERE id = 1").first();
  return row ? { rev: row.rev, data: JSON.parse(row.data) } : { rev: 0, data: null };
}
async function clicks(db) {
  const { results } = await db.prepare("SELECT slug, SUM(n) AS n FROM clicks GROUP BY slug").all();
  return Object.fromEntries((results || []).map(r => [r.slug, r.n]));
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "Database non collegato (binding DB)." }, 503);
  await ensureSchema(env.DB);
  return json({ ...(await current(env.DB)), clicks: await clicks(env.DB) });
}

export async function onRequestPut({ request, env }) {
  if (!env.DB) return json({ error: "Database non collegato (binding DB)." }, 503);
  const text = await request.text();
  if (text.length > MAX) return json({ error: "Dati troppo grandi." }, 413);
  let body; try { body = JSON.parse(text); } catch { return json({ error: "JSON non valido." }, 400); }
  if (!body || typeof body.data !== "object" || body.data === null || !Number.isInteger(body.rev)) return json({ error: "Formato non valido." }, 400);
  await ensureSchema(env.DB);
  const data = JSON.stringify(body.data), at = new Date().toISOString();
  let r;
  if (body.rev === 0) r = await env.DB.prepare("INSERT INTO state (id, rev, data, updated) VALUES (1, 1, ?, ?) ON CONFLICT(id) DO NOTHING").bind(data, at).run();
  else r = await env.DB.prepare("UPDATE state SET rev = rev + 1, data = ?, updated = ? WHERE id = 1 AND rev = ?").bind(data, at, body.rev).run();
  if (!r.meta.changes) return json(await current(env.DB), 409); // qualcun altro (l'altro dispositivo) ha salvato prima
  return json({ rev: body.rev + 1 });
}
