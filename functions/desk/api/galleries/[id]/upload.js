import { json, needBindings, getGallery, key, okName, KINDS } from "../../../../../lib/gallery.js";

const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", mp4: "video/mp4", mov: "video/quicktime", zip: "application/zip" };
const typeOf = n => TYPES[(n.split(".").pop() || "").toLowerCase()] || "application/octet-stream";

function target(env, params, url) {
  const kind = url.searchParams.get("kind"), name = url.searchParams.get("name");
  if (!KINDS.includes(kind) || !okName(name)) return null;
  return key(params.id, kind, name);
}

// Caricamento semplice (file fino a ~90 MB): PUT ?kind=&name=
export async function onRequestPut({ env, params, request }) {
  const miss = needBindings(env); if (miss) return miss;
  if (!(await getGallery(env, params.id))) return json({ error: "Non trovata." }, 404);
  const url = new URL(request.url);
  const k = target(env, params, url); if (!k) return json({ error: "Nome o tipo non valido." }, 400);
  await env.GALLERY.put(k, request.body, { httpMetadata: { contentType: typeOf(k) } });
  return json({ ok: true });
}

// Caricamento a pezzi per i file grandi (video, zip): POST ?kind=&name=&action=create|complete, PUT ?…&uploadId=&part=
export async function onRequestPost({ env, params, request }) {
  const miss = needBindings(env); if (miss) return miss;
  if (!(await getGallery(env, params.id))) return json({ error: "Non trovata." }, 404);
  const url = new URL(request.url);
  const k = target(env, params, url); if (!k) return json({ error: "Nome o tipo non valido." }, 400);
  const action = url.searchParams.get("action");
  if (action === "create") {
    const up = await env.GALLERY.createMultipartUpload(k, { httpMetadata: { contentType: typeOf(k) } });
    return json({ uploadId: up.uploadId });
  }
  if (action === "complete") {
    const up = env.GALLERY.resumeMultipartUpload(k, url.searchParams.get("uploadId"));
    const { parts } = await request.json();
    await up.complete(parts);
    return json({ ok: true });
  }
  if (action === "abort") {
    await env.GALLERY.resumeMultipartUpload(k, url.searchParams.get("uploadId")).abort();
    return json({ ok: true });
  }
  return json({ error: "Azione sconosciuta." }, 400);
}

export async function onRequestPatch({ env, params, request }) {
  // PATCH ?kind=&name=&uploadId=&part=N  (un pezzo del caricamento a pezzi)
  const miss = needBindings(env); if (miss) return miss;
  const url = new URL(request.url);
  const k = target(env, params, url); if (!k) return json({ error: "Nome o tipo non valido." }, 400);
  const n = parseInt(url.searchParams.get("part"));
  if (!(n >= 1 && n <= 10000)) return json({ error: "Numero di pezzo non valido." }, 400);
  const up = env.GALLERY.resumeMultipartUpload(k, url.searchParams.get("uploadId"));
  const part = await up.uploadPart(n, request.body);
  return json(part);
}
