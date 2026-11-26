import { verifyAccess } from "../../lib/access.js";
import { passwordOk, loginRoute } from "../../lib/password.js";

// Tutto quello che sta sotto /desk/ (app e dati) è solo per il proprietario.
// 1) Cloudflare Access, se configurato (ACCESS_TEAM_DOMAIN + ACCESS_AUD): la protezione definitiva.
// 2) Altrimenti una password (DESK_PASSWORD): protezione provvisoria, finché non c'è il dominio.
// 3) Altrimenti Desk resta chiuso.
const text = (t, status) => new Response(t, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD) {
    const v = await verifyAccess(request, env);
    if (!v.ok) return text(v.why, v.status);
  } else if (env.DESK_PASSWORD) {
    if (url.pathname === "/desk/login") return loginRoute(request, env);
    if (!(await passwordOk(request, env))) {
      if (url.pathname.startsWith("/desk/api/")) return text("Accesso richiesto.", 401);
      return Response.redirect(new URL("/desk/login", url).toString(), 303);
    }
  } else {
    return text("Desk non ancora protetto: imposta DESK_PASSWORD (o Cloudflare Access) nelle impostazioni del progetto.", 503);
  }
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set("X-Robots-Tag", "noindex, nofollow");
  out.headers.set("Referrer-Policy", "no-referrer");
  out.headers.set("X-Frame-Options", "DENY");
  return out;
}
