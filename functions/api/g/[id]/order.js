import { getGallery, siteData, json, needBindings, newId } from "../../../../lib/gallery.js";
import { ensureSchema } from "../../../../lib/access.js";
import { openPrice } from "../../../../lib/openprice.js";

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

// Open session: il surfista sceglie le sue foto e manda l'ordine. Il prezzo si ricalcola qui.
export async function onRequestPost({ env, params, request }) {
  const miss = needBindings(env); if (miss) return miss;
  const g = await getGallery(env, params.id);
  if (!g || !g.ready || g.kind !== "open" || g.expired || g.pruned) return json({ error: "This gallery is no longer online." }, 404);
  const text = await request.text();
  if (text.length > 60000) return json({ error: "Too large." }, 413);
  let b; try { b = JSON.parse(text); } catch { return json({ error: "Invalid request." }, 400); }
  if (b.website) return json({ ok: true, id: "x", k: "x" }); // trappola per i bot
  const names = new Set(g.files.filter(f => f.t !== "v").map(f => f.n));
  const photos = [...new Set((Array.isArray(b.photos) ? b.photos : []).map(String))];
  if (!photos.length) return json({ error: "Pick at least one photo." }, 400);
  if (photos.some(n => !names.has(n))) return json({ error: "Some photos are not in this gallery." }, 400);
  const name = clip(b.name, 120), contact = clip(b.contact, 160), note = clip(b.note, 400);
  if (!name || !contact) return json({ error: "Please add your name and your Instagram or WhatsApp." }, 400);
  const site = await siteData(env, request.url);
  const total = openPrice(photos.length, (site.open && site.open.tiers) || []);
  if (!isFinite(total)) return json({ error: "Prices not set." }, 500);
  const id = newId(8), k = newId(24);
  await ensureSchema(env.DB);
  await env.DB.prepare("INSERT INTO open_orders (id, gallery, k, created, photos, total, name, contact, note) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(id, params.id, k, new Date().toISOString(), JSON.stringify(photos), total, name, contact, note).run();
  return json({ ok: true, id, k, total, count: photos.length });
}
