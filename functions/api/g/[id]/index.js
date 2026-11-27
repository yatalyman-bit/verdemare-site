import { getGallery, json, needBindings } from "../../../../lib/gallery.js";

// Dati della gallery per la pagina del cliente. Mai le chiavi degli originali se non è pagata.
export async function onRequestGet({ env, params, request }) {
  const miss = needBindings(env); if (miss) return miss;
  const g = await getGallery(env, params.id);
  if (!g || !g.ready) return json({ error: "Gallery not found." }, 404);
  if (g.expired) return json({ error: "This gallery has expired." }, 410);
  let site = {};
  try { site = await (await env.ASSETS.fetch(new URL("/site.json", request.url))).json(); } catch {}
  return json({
    client: g.client, title: g.title, expires: g.expires, paid: !!g.paid,
    zip: g.paid ? g.zip_size : 0,
    files: g.files.map(f => ({ n: f.n, t: f.t, w: f.w, h: f.h, s: g.paid ? f.s : undefined })),
    prints: site.prints || [], shipping: site.shipping || 0, whatsapp: site.whatsapp || "",
  }, 200, { "X-Robots-Tag": "noindex" });
}
