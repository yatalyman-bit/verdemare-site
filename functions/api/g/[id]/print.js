import { getGallery, json, needBindings, newId } from "../../../../lib/gallery.js";
import { ensureSchema } from "../../../../lib/access.js";

const COUNTRIES = ["Portugal","Spain","France","Italy","Germany","Netherlands","Belgium","Luxembourg","Austria","Switzerland","Ireland","United Kingdom","Denmark","Sweden","Norway","Finland","Poland","Czechia","Slovakia","Slovenia","Croatia","Hungary","Romania","Bulgaria","Greece","Estonia","Latvia","Lithuania","Malta","Cyprus","Iceland"];
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

// Ordine di stampa dal cliente. I prezzi si ricalcolano qui dal listino: quelli mandati dal browser non contano.
export async function onRequestPost({ env, params, request }) {
  const miss = needBindings(env); if (miss) return miss;
  const g = await getGallery(env, params.id);
  if (!g || !g.ready || g.expired) return json({ error: "Gallery not found." }, 404);
  const text = await request.text();
  if (text.length > 20000) return json({ error: "Too large." }, 413);
  let b; try { b = JSON.parse(text); } catch { return json({ error: "Invalid request." }, 400); }
  if (b.website) return json({ ok: true, id: "x" }); // campo trappola per i bot
  let site = {};
  try { site = await (await env.ASSETS.fetch(new URL("/site.json", request.url))).json(); } catch {}
  const prices = Object.fromEntries((site.prints || []).map(p => [p.id, p]));
  const names = new Set(g.files.map(f => f.n));
  const items = [];
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 100)) {
    const p = prices[it.size], q = Math.max(1, Math.min(20, parseInt(it.qty) || 1));
    if (!p || !names.has(it.photo)) return json({ error: "Invalid item." }, 400);
    items.push({ photo: it.photo, size: p.id, label: p.label, qty: q, price: p.price });
  }
  if (!items.length) return json({ error: "No photos selected." }, 400);
  const name = clip(b.name, 120), email = clip(b.email, 160), phone = clip(b.phone, 40), address = clip(b.address, 400), country = clip(b.country, 60), note = clip(b.note, 400);
  if (!name || !address || !COUNTRIES.includes(country) || !(email || phone)) return json({ error: "Please fill in name, address, country and email or phone." }, 400);
  const total = items.reduce((a, i) => a + i.price * i.qty, 0) + (site.shipping || 0);
  const id = newId(8);
  await ensureSchema(env.DB);
  await env.DB.prepare("INSERT INTO print_orders (id, gallery, created, items, total, name, email, phone, address, country, note) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .bind(id, params.id, new Date().toISOString(), JSON.stringify(items), total, name, email, phone, address, country, note).run();
  return json({ ok: true, id, total, items });
}

export const onRequestGet = () => json({ countries: COUNTRIES });
