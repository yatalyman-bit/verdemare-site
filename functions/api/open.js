import { json, needBindings, thumbOf } from "../../lib/gallery.js";
import { ensureSchema } from "../../lib/access.js";

// Open session online adesso (per la pagina "Find your photos"): solo quelle segnate "mostra sul sito".
export async function onRequestGet({ env }) {
  const miss = needBindings(env); if (miss) return miss;
  await ensureSchema(env.DB);
  const { results } = await env.DB.prepare("SELECT id, client, title, created, expires, files FROM galleries WHERE kind = 'open' AND ready = 1 AND pruned = 0 AND listed = 1 AND expires > ? ORDER BY created DESC LIMIT 40").bind(new Date().toISOString()).all();
  return json((results || []).map(g => {
    const files = JSON.parse(g.files || "[]").filter(f => f.t !== "v");
    const step = Math.max(1, Math.floor(files.length / 4));
    const covers = [0, 1, 2, 3].map(i => files[i * step]).filter(Boolean).map(f => `/api/g/${g.id}/f/thumb/${encodeURIComponent(thumbOf(f.n))}`);
    return { id: g.id, spot: g.client, title: g.title, created: g.created, expires: g.expires, count: files.length, covers };
  }), 200, { "cache-control": "public, max-age=60" });
}
