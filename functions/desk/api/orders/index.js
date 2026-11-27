import { json } from "../../../../lib/gallery.js";
import { ensureSchema } from "../../../../lib/access.js";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "Database non collegato." }, 503);
  await ensureSchema(env.DB);
  const { results } = await env.DB.prepare("SELECT o.*, g.client AS gclient, g.title AS gtitle FROM print_orders o LEFT JOIN galleries g ON g.id = o.gallery ORDER BY o.created DESC LIMIT 300").all();
  return json((results || []).map(r => ({ ...r, items: JSON.parse(r.items || "[]") })));
}

export async function onRequestPatch({ env, request }) {
  if (!env.DB) return json({ error: "Database non collegato." }, 503);
  const b = await request.json();
  const st = ["new", "ordered", "shipped", "cancelled"];
  if (!st.includes(b.status) || !b.id) return json({ error: "Dati non validi." }, 400);
  await env.DB.prepare("UPDATE print_orders SET status = ?, shipped = CASE WHEN ? = 'shipped' THEN ? ELSE shipped END WHERE id = ?")
    .bind(b.status, b.status, new Date().toISOString(), String(b.id)).run();
  return json({ ok: true });
}
