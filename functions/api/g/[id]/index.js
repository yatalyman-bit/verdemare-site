import { getGallery, getOrder, siteData, json, needBindings } from "../../../../lib/gallery.js";

// Dati della gallery per la pagina del cliente. Mai le chiavi degli originali se non è pagata.
// Open session: con ?o=&k= aggiunge l'ordine di chi sta guardando.
export async function onRequestGet({ env, params, request }) {
  const miss = needBindings(env); if (miss) return miss;
  const g = await getGallery(env, params.id);
  if (!g || !g.ready) return json({ error: "Gallery not found." }, 404);
  const u = new URL(request.url);
  const site = await siteData(env, request.url);
  const base = { client: g.client, title: g.title, expires: g.expires, kind: g.kind, whatsapp: site.whatsapp || "", instagram: site.instagram || "" };
  if (g.kind === "open") {
    const order = await getOrder(env, params.id, u.searchParams.get("o"), u.searchParams.get("k"));
    if ((g.expired || g.pruned) && !(order && order.status === "paid")) return json({ error: "This gallery has expired." }, 410);
    const files = g.pruned ? g.files.filter(f => order.photos.includes(f.n)) : g.files;
    return json({
      ...base, archived: !!g.pruned, paid: false,
      files: files.map(f => ({ n: f.n, t: f.t, w: f.w, h: f.h, z: f.z ? 1 : 0 })),
      tiers: (site.open && site.open.tiers) || [], payments: site.payments || [], kept_days: (site.open && site.open.kept_days) || 30,
      order: order ? { id: order.id, status: order.status, photos: order.photos, total: order.total, paid: order.paid } : null,
    }, 200, { "X-Robots-Tag": "noindex" });
  }
  if (g.expired) return json({ error: "This gallery has expired." }, 410);
  return json({
    ...base, paid: !!g.paid,
    zip: g.paid ? g.zip_size : 0,
    files: g.files.map(f => ({ n: f.n, t: f.t, w: f.w, h: f.h, z: f.z ? 1 : 0, s: g.paid ? f.s : undefined })),
    prints: site.prints || [], shipping: site.shipping || 0,
  }, 200, { "X-Robots-Tag": "noindex" });
}
