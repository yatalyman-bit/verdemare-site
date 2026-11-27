import { json, needBindings, getGallery, deletePrefix } from "../../../../../lib/gallery.js";

export async function onRequestGet({ env, params }) {
  const miss = needBindings(env); if (miss) return miss;
  const g = await getGallery(env, params.id);
  return g ? json(g) : json({ error: "Non trovata." }, 404);
}

// Aggiorna: pagato sì/no, pronta, elenco file, dimensione zip, scadenza.
export async function onRequestPatch({ env, params, request }) {
  const miss = needBindings(env); if (miss) return miss;
  const g = await getGallery(env, params.id);
  if (!g) return json({ error: "Non trovata." }, 404);
  let b; try { b = await request.json(); } catch { return json({ error: "JSON non valido." }, 400); }
  const sets = [], vals = [];
  if ("paid" in b) { sets.push("paid = ?"); vals.push(b.paid ? 1 : 0); }
  if ("ready" in b) { sets.push("ready = ?"); vals.push(b.ready ? 1 : 0); }
  if ("zip_size" in b) { sets.push("zip_size = ?"); vals.push(Math.max(0, parseInt(b.zip_size) || 0)); }
  if ("client" in b) { sets.push("client = ?"); vals.push(String(b.client).slice(0, 120)); }
  if ("title" in b) { sets.push("title = ?"); vals.push(String(b.title).slice(0, 160)); }
  if ("extend_days" in b) { const d = Math.max(1, Math.min(365, parseInt(b.extend_days) || 0)); sets.push("expires = ?"); vals.push(new Date(Math.max(Date.now(), new Date(g.expires).getTime()) + d * 864e5).toISOString()); }
  if (Array.isArray(b.files)) {
    const files = b.files.slice(0, 2000).map(f => ({ n: String(f.n).slice(0, 160), t: f.t === "v" ? "v" : "p", w: f.w | 0, h: f.h | 0, s: Math.max(0, Math.floor(+f.s || 0)), z: f.z ? 1 : 0 }));
    sets.push("files = ?"); vals.push(JSON.stringify(files));
  }
  if (!sets.length) return json({ ok: true });
  await env.DB.prepare(`UPDATE galleries SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, params.id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  const miss = needBindings(env); if (miss) return miss;
  const g = await getGallery(env, params.id);
  if (!g) return json({ error: "Non trovata." }, 404);
  await deletePrefix(env.GALLERY, `g/${params.id}/`);
  await env.DB.prepare("DELETE FROM galleries WHERE id = ?").bind(params.id).run();
  await env.DB.prepare("DELETE FROM open_orders WHERE gallery = ?").bind(params.id).run();
  return json({ ok: true });
}
