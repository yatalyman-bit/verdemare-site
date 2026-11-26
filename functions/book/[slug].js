import { ensureSchema } from "../../lib/access.js";

// /book/<id-struttura>/ : conta la scansione del QR (solo un numero al giorno, nessun dato personale)
// e apre WhatsApp con il nome della struttura già scritto.
export async function onRequestGet({ request, env, params }) {
  const slug = String(params.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
  let site = {};
  try { site = await (await env.ASSETS.fetch(new URL("/site.json", request.url))).json(); } catch {}
  let name = "";
  if (env.DB && slug) {
    try {
      await ensureSchema(env.DB);
      const row = await env.DB.prepare("SELECT data FROM state WHERE id = 1").first();
      const p = row ? (JSON.parse(row.data).partners || {})[slug] : null;
      if (p && p.phase !== "no") {
        name = p.name || "";
        const day = new Date().toISOString().slice(0, 10);
        await env.DB.prepare("INSERT INTO clicks (slug, day, n) VALUES (?, ?, 1) ON CONFLICT(slug, day) DO UPDATE SET n = n + 1").bind(slug, day).run();
      }
    } catch {}
  }
  const msg = name ? `Hi Flavio! I'm staying at ${name} and I'd like info on a private surf session.` : (site.booking_message || "Hi Flavio! I'd like info on a private surf session.");
  const to = site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}` : new URL("/", request.url).toString();
  return new Response(null, { status: 302, headers: { Location: to, "cache-control": "no-store", "X-Robots-Tag": "noindex" } });
}
