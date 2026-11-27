import { json, siteData } from "../../../../lib/gallery.js";
import { ensureSchema } from "../../../../lib/access.js";
import { openPrice } from "../../../../lib/openprice.js";

// Ordini delle open session (solo da Studio).
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "Database non collegato." }, 503);
  await ensureSchema(env.DB);
  const { results } = await env.DB.prepare("SELECT o.id, o.gallery, o.created, o.photos, o.total, o.name, o.contact, o.note, o.status, o.paid, g.client AS gclient, g.title AS gtitle FROM open_orders o LEFT JOIN galleries g ON g.id = o.gallery ORDER BY o.created DESC LIMIT 500").all();
  return json((results || []).map(r => ({ ...r, photos: JSON.parse(r.photos || "[]") })));
}

// PATCH {id, status?: new|paid|cancelled, remove?: [foto]} — togliere foto ricalcola il prezzo.
export async function onRequestPatch({ env, request }) {
  if (!env.DB) return json({ error: "Database non collegato." }, 503);
  let b; try { b = await request.json(); } catch { return json({ error: "JSON non valido." }, 400); }
  const o = await env.DB.prepare("SELECT * FROM open_orders WHERE id = ?").bind(String(b.id || "")).first();
  if (!o) return json({ error: "Ordine non trovato." }, 404);
  let photos = JSON.parse(o.photos || "[]"), total = o.total, status = o.status, paid = o.paid;
  if (Array.isArray(b.remove) && b.remove.length) {
    photos = photos.filter(n => !b.remove.includes(n));
    const site = await siteData(env, request.url);
    total = openPrice(photos.length, (site.open && site.open.tiers) || []);
  }
  if (b.status) {
    if (!["new", "paid", "cancelled"].includes(b.status)) return json({ error: "Stato non valido." }, 400);
    status = b.status; paid = status === "paid" ? (paid || new Date().toISOString()) : null;
  }
  await env.DB.prepare("UPDATE open_orders SET photos = ?, total = ?, status = ?, paid = ? WHERE id = ?").bind(JSON.stringify(photos), total, status, paid, o.id).run();
  return json({ ok: true, photos, total, status });
}
