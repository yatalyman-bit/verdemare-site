// Funzioni comuni della gallery: id, chiavi R2, lettura, pulizia delle gallery scadute.
import { ensureSchema } from "./access.js";

export const KINDS = ["thumb", "prev", "zoom", "web", "orig", "zip"];
// visibili anche prima del saldo: miniature, anteprima con watermark, versione per lo zoom (più grande ma con watermark fitto)
export const PUBLIC_KINDS = ["thumb", "prev", "zoom"];
const ID_RE = /^[A-Za-z0-9]{16,40}$/;
const NAME_RE = /^[A-Za-z0-9._ ()\-]{1,160}$/;

export const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });
export const okId = id => ID_RE.test(id || "");
export const okName = n => NAME_RE.test(n || "") && !n.includes("..");
export const key = (id, kind, name) => `g/${id}/${kind}/${name}`;

export function newId(len = 20) {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(len));
  return [...b].map(x => a[x % a.length]).join("");
}

export async function getGallery(env, id) {
  if (!okId(id)) return null;
  await ensureSchema(env.DB);
  const g = await env.DB.prepare("SELECT * FROM galleries WHERE id = ?").bind(id).first();
  if (!g) return null;
  g.files = JSON.parse(g.files || "[]");
  g.kind = g.kind || "private";
  g.expired = new Date(g.expires) < new Date();
  return g;
}

export const thumbOf = n => n.replace(/\.[^.]+$/, "") + ".jpg";

// Ordine di una open session, verificato con la sua chiave segreta (o = id, k = chiave).
export async function getOrder(env, gid, o, k) {
  if (!o || !k || !/^[A-Za-z0-9]{6,40}$/.test(o) || !/^[A-Za-z0-9]{16,60}$/.test(k)) return null;
  const r = await env.DB.prepare("SELECT * FROM open_orders WHERE id = ? AND gallery = ?").bind(o, gid).first();
  if (!r || r.k !== k) return null;
  r.photos = JSON.parse(r.photos || "[]");
  return r;
}

export async function siteData(env, url) {
  try { return await (await env.ASSETS.fetch(new URL("/site.json", url))).json(); } catch { return {}; }
}

export async function deletePrefix(bucket, prefix) {
  let cursor;
  do {
    const l = await bucket.list({ prefix, cursor, limit: 1000 });
    const keys = l.objects.map(o => o.key);
    if (keys.length) await bucket.delete(keys);
    cursor = l.truncated ? l.cursor : undefined;
  } while (cursor);
}

// Pulizia "pigra": parte quando apri le gallery in Studio. Niente cron da configurare.
// Private: alla scadenza si cancella tutto. Open session: alla scadenza restano solo le foto pagate
// (per kept_days giorni, poi via anche quelle).
export async function cleanup(env, keptDays = 30) {
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare("SELECT id, kind, pruned FROM galleries WHERE expires < ?").bind(now).all();
  for (const r of results || []) {
    if (r.kind === "open" && !r.pruned) {
      const { results: paid } = await env.DB.prepare("SELECT photos FROM open_orders WHERE gallery = ? AND status = 'paid'").bind(r.id).all();
      const keep = new Set();
      for (const o of paid || []) for (const n of JSON.parse(o.photos || "[]")) { keep.add(`g/${r.id}/web/${n}`); keep.add(`g/${r.id}/orig/${n}`); keep.add(`g/${r.id}/thumb/${thumbOf(n)}`); }
      if (keep.size) {
        let cursor;
        do {
          const l = await env.GALLERY.list({ prefix: `g/${r.id}/`, cursor, limit: 1000 });
          const del = l.objects.map(o => o.key).filter(k => !keep.has(k));
          if (del.length) await env.GALLERY.delete(del);
          cursor = l.truncated ? l.cursor : undefined;
        } while (cursor);
        await env.DB.prepare("UPDATE galleries SET pruned = 1, expires = ? WHERE id = ?").bind(new Date(Date.now() + keptDays * 864e5).toISOString(), r.id).run();
        continue;
      }
    }
    await deletePrefix(env.GALLERY, `g/${r.id}/`);
    await env.DB.prepare("DELETE FROM galleries WHERE id = ?").bind(r.id).run();
    await env.DB.prepare("DELETE FROM open_orders WHERE gallery = ?").bind(r.id).run();
  }
  // indirizzi degli ordini di stampa: tolti 60 giorni dopo la spedizione (GDPR)
  const cut = new Date(Date.now() - 60 * 864e5).toISOString();
  await env.DB.prepare("UPDATE print_orders SET address = '', phone = '', email = '' WHERE status = 'shipped' AND shipped < ? AND address != ''").bind(cut).run();
}

export function needBindings(env) {
  if (!env.DB) return json({ error: "Database non collegato (binding DB)." }, 503);
  if (!env.GALLERY) return json({ error: "Archivio foto non collegato (binding GALLERY)." }, 503);
  return null;
}
