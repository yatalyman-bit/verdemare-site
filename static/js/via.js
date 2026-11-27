// Ospite arrivato dal QR di un hotel (/book/<id>/ → /?via=<id>&n=<nome>):
// ricorda l'hotel per 30 giorni e lo aggiunge a tutti i messaggi WhatsApp, così si sa chi ha portato il cliente.
(() => {
  const K = "vm-via", q = new URLSearchParams(location.search);
  let v = null;
  try {
    if (q.get("via") && q.get("n")) { v = { id: q.get("via").slice(0, 80), n: q.get("n").slice(0, 80), t: Date.now() }; localStorage.setItem(K, JSON.stringify(v)); history.replaceState(null, "", location.pathname + location.hash); }
    else { v = JSON.parse(localStorage.getItem(K) || "null"); if (v && Date.now() - v.t > 30 * 864e5) { localStorage.removeItem(K); v = null; } }
  } catch { v = null; }
  const tag = msg => v ? msg.replace(/^Hi Flavio!/, `Hi Flavio! I'm staying at ${v.n}.`).replace(/^(?!Hi Flavio! I'm staying)/, `(Guest at ${v.n}) `) : msg;
  window.vmTag = tag;
  if (!v) return;
  const fix = a => { try { const u = new URL(a.href); if (u.hostname !== "wa.me" || a.dataset.via) return; u.searchParams.set("text", tag(u.searchParams.get("text") || "Hi Flavio! I'd like info on a private surf session.")); a.href = u.toString(); a.dataset.via = 1; } catch {} };
  const run = () => document.querySelectorAll('a[href^="https://wa.me/"]').forEach(fix);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", run) : run();
})();
