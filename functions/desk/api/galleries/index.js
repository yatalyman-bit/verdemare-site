import { json, needBindings, newId, cleanup } from "../../../../lib/gallery.js";
import { ensureSchema } from "../../../../lib/access.js";

// Elenco e creazione delle gallery (solo da Desk: protetto dal middleware di /desk/).
export async function onRequestGet({ env }) {
  const miss = needBindings(env); if (miss) return miss;
  await ensureSchema(env.DB);
  await cleanup(env);
  const { results } = await env.DB.prepare("SELECT id, client, title, created, expires, paid, ready, zip_size, files FROM galleries ORDER BY created DESC").all();
  return json((results || []).map(r => ({ ...r, files: undefined, count: JSON.parse(r.files || "[]").length, paid: !!r.paid, ready: !!r.ready })));
}

export async function onRequestPost({ env, request }) {
  const miss = needBindings(env); if (miss) return miss;
  let b; try { b = await request.json(); } catch { return json({ error: "JSON non valido." }, 400); }
  const client = String(b.client || "").trim().slice(0, 120), title = String(b.title || "").trim().slice(0, 160);
  if (!client) return json({ error: "Manca il nome del cliente." }, 400);
  const days = Math.max(7, Math.min(365, parseInt(b.days) || 90));
  const id = newId(20), now = new Date();
  await ensureSchema(env.DB);
  await env.DB.prepare("INSERT INTO galleries (id, client, title, created, expires) VALUES (?,?,?,?,?)")
    .bind(id, client, title, now.toISOString(), new Date(now.getTime() + days * 864e5).toISOString()).run();
  return json({ id });
}
