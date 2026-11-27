// Funzioni comuni della gallery: id, chiavi R2, lettura, pulizia delle gallery scadute.
import { ensureSchema } from "./access.js";

export const KINDS = ["thumb", "prev", "web", "orig", "zip"];
export const PUBLIC_KINDS = ["thumb", "prev"];          // visibili anche prima del saldo
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
  g.expired = new Date(g.expires) < new Date();
  return g;
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

// Pulizia "pigra": parte quando apri le gallery in Desk. Niente cron da configurare.
export async function cleanup(env) {
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare("SELECT id FROM galleries WHERE expires < ?").bind(now).all();
  for (const r of results || []) {
    await deletePrefix(env.GALLERY, `g/${r.id}/`);
    await env.DB.prepare("DELETE FROM galleries WHERE id = ?").bind(r.id).run();
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
