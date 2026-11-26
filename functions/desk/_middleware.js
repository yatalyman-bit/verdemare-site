import { verifyAccess } from "../../lib/access.js";

// Tutto quello che sta sotto /desk/ (app e dati) è solo per il proprietario.
export async function onRequest({ request, env, next }) {
  const v = await verifyAccess(request, env);
  if (!v.ok) return new Response(v.why, { status: v.status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  out.headers.set("Referrer-Policy", "no-referrer");
  out.headers.set("X-Frame-Options", "DENY");
  return out;
}
