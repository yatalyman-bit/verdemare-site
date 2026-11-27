// /g/<id>/ → la pagina della gallery (un'unica pagina statica che legge i dati dall'API).
export async function onRequestGet({ env, request }) {
  const res = await env.ASSETS.fetch(new URL("/gallery-app/", request.url));
  const h = new Headers(res.headers);
  h.set("X-Robots-Tag", "noindex, nofollow");
  h.set("cache-control", "no-store");
  h.set("Referrer-Policy", "no-referrer");
  return new Response(res.body, { status: res.status, headers: h });
}
