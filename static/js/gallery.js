// Gallerie a righe con ritmo variabile (1-2-3-2 foto per riga), senza mai tagliare le foto.
// Ogni <div class="jg"> contiene .jg-i con un <img width height>. Le foto nascoste (.rs-more) si saltano.
(() => {
  const GAP = 8;
  const ratio = e => { const im = e.querySelector("img"); return (+im.getAttribute("width") || 4) / (+im.getAttribute("height") || 3); };
  function layout(g) {
    g.querySelectorAll(".jg-row").forEach(r => { while (r.firstChild) g.insertBefore(r.firstChild, r); r.remove(); });   // ricomincia da capo
    const W = g.clientWidth; if (!W) return;
    const mob = W < 640, pat = mob ? [1, 2] : [1, 2, 3, 2];
    const items = [...g.children].filter(e => e.classList.contains("jg-i") && getComputedStyle(e).display !== "none");
    const hidden = [...g.children].filter(e => e.classList.contains("jg-i") && !items.includes(e));
    const cap = Math.min(innerHeight * .8, mob ? 520 : 760);
    let i = 0, k = 0;
    while (i < items.length) {
      let n = Math.min(pat[k++ % pat.length], items.length - i);
      if (n === 1 && ratio(items[i]) < 1 && i + 1 < items.length) n = 2;   // una verticale da sola sarebbe enorme: la accoppio
      const row = items.slice(i, i + n); i += n;
      const H = Math.min(cap, (W - GAP * (n - 1)) / row.reduce((a, e) => a + ratio(e), 0));
      const r = document.createElement("div"); r.className = "jg-row";
      row.forEach(e => { e.style.width = (ratio(e) * H) + "px"; e.style.height = H + "px"; r.appendChild(e); });
      g.appendChild(r);
    }
    hidden.forEach(e => g.appendChild(e));
  }
  const all = () => document.querySelectorAll(".jg").forEach(layout);
  all(); let t, lw = innerWidth; addEventListener("resize", () => { if (innerWidth === lw) return; lw = innerWidth; clearTimeout(t); t = setTimeout(all, 120); });
  window.vmGalleryLayout = all;
})();
