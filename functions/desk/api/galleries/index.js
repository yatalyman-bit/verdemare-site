import { json, needBindings, newId, cleanup, siteData } from "../../../../lib/gallery.js";
import { ensureSchema } from "../../../../lib/access.js";

// Elenco e creazione delle gallery (solo da Desk: protetto dal middleware di /desk/).
export async function onRequestGet({ env, request }) {
  const miss = needBindings(env); if (miss) return miss;
  await ensureSchema(env.DB);
  const site = await siteData(env, request.url);
  await cleanup(env, (site.open && site.open.kept_days) || 30);
  const { results } = await env.DB.prepare("SELECT g.id, g.client, g.title, g.created, g.expires, g.paid, g.ready, g.zip_size, g.files, g.kind, g.pruned, (SELECT COUNT(*) FROM open_orders o WHERE o.gallery = g.id) AS orders FROM galleries g ORDER BY g.created DESC").all();
  return json((results || []).map(r => ({ ...r, files: undefined, count: JSON.parse(r.files || "[]").length, paid: !!r.paid, ready: !!r.ready, pruned: !!r.pruned })));
}

export async function onRequestPost({ env, request }) {
  const miss = needBindings(env); if (miss) return miss;
  let b; try { b = await request.json(); } catch { return json({ error: "JSON non valido." }, 400); }
  const client = String(b.client || "").trim().slice(0, 120), title = String(b.title || "").trim().slice(0, 160);
  if (!client) return json({ error: "Manca il nome del cliente." }, 400);
  const kind = b.kind === "open" ? "open" : "private";
  const days = Math.max(1, Math.min(365, parseInt(b.days) || (kind === "open" ? 7 : 90)));
  const id = newId(20), now = new Date();
  await ensureSchema(env.DB);
  const listed = kind === "open" && b.listed !== false ? 1 : 0;   // open session: compare nella pagina "Find your photos" del sito
  await env.DB.prepare("INSERT INTO galleries (id, client, title, created, expires, kind, listed) VALUES (?,?,?,?,?,?,?)")
    .bind(id, client, title, now.toISOString(), new Date(now.getTime() + days * 864e5).toISOString(), kind, listed).run();
  return json({ id });
}
