// Protezione provvisoria di Desk con una password (variabile DESK_PASSWORD su Cloudflare),
// finché non c'è il dominio e Cloudflare Access. Il cookie è una firma della password:
// cambiando la password, tutti i dispositivi devono rientrare.
const COOKIE = "vd_auth";
const enc = new TextEncoder();

async function sign(secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode("verdemare-desk-v1"));
  return [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const readCookie = (req, name) => ((req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)")) || [])[1] || "";

export async function passwordOk(request, env) {
  const c = readCookie(request, COOKIE);
  return !!c && same(c, await sign(env.DESK_PASSWORD));
}

const page = (msg = "") => `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Verdemare Desk</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#edf1f0;color:#16302f;padding:16px}form{background:#fff;padding:28px;border-radius:14px;width:100%;max-width:340px;display:grid;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,.06)}h1{margin:0;font-size:22px}input,button{font:inherit;padding:12px;border-radius:10px;border:1px solid #c9d3d1}button{background:#0d6a70;color:#fff;border:0;font-weight:600}.e{color:#a2361b;margin:0}</style></head>
<body><form method="post" action="/desk/login"><h1>Verdemare Desk</h1>${msg ? `<p class="e">${msg}</p>` : ""}<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required><button>Entra</button></form></body></html>`;

export async function loginRoute(request, env) {
  const html = (body, status = 200, extra = {}) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...extra } });
  if (request.method === "POST") {
    const form = await request.formData();
    const pw = String(form.get("password") || "");
    if (pw && same(await sign(pw), await sign(env.DESK_PASSWORD))) {
      const cookie = `${COOKIE}=${await sign(env.DESK_PASSWORD)}; Path=/desk; Max-Age=${90 * 86400}; HttpOnly; Secure; SameSite=Strict`;
      return new Response(null, { status: 303, headers: { Location: "/desk/", "Set-Cookie": cookie, "cache-control": "no-store" } });
    }
    await new Promise(r => setTimeout(r, 1500)); // rallenta chi prova password a caso
    return html(page("Password sbagliata."), 401);
  }
  return html(page());
}
