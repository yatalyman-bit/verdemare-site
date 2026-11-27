import { getGallery, json, needBindings, key, okName, KINDS, PUBLIC_KINDS } from "../../../../../lib/gallery.js";

// /api/g/<id>/f/<kind>/<name>  — anteprime sempre; versioni pulite, originali e zip solo dopo il saldo.
export async function onRequestGet({ env, params, request }) {
  const miss = needBindings(env); if (miss) return miss;
  const [kind, ...rest] = params.path || [];
  const name = decodeURIComponent(rest.join("/"));
  if (!KINDS.includes(kind) || !okName(name)) return json({ error: "Not found." }, 404);
  const g = await getGallery(env, params.id);
  if (!g || !g.ready || g.expired) return json({ error: "Not found." }, 404);
  if (!PUBLIC_KINDS.includes(kind) && !g.paid) return json({ error: "Available after payment." }, 403);
  const hasRange = request.headers.has("range");
  const obj = await env.GALLERY.get(key(params.id, kind, name), hasRange ? { range: request.headers, onlyIf: request.headers } : { onlyIf: request.headers });
  if (!obj) return json({ error: "Not found." }, 404);
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("accept-ranges", "bytes");
  h.set("X-Robots-Tag", "noindex");
  h.set("cache-control", PUBLIC_KINDS.includes(kind) ? "private, max-age=86400" : "private, no-store");
  const dl = new URL(request.url).searchParams.get("dl");
  if (dl) h.set("content-disposition", `attachment; filename="${name.replace(/"/g, "")}"`);
  if (!("body" in obj)) return new Response(null, { status: 304, headers: h });
  if (hasRange && obj.range) {
    const start = obj.range.offset ?? 0, end = start + (obj.range.length ?? obj.size - start) - 1;
    h.set("content-range", `bytes ${start}-${end}/${obj.size}`);
    h.set("content-length", String(end - start + 1));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set("content-length", String(obj.size));
  return new Response(obj.body, { headers: h });
}
