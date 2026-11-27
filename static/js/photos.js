// Pagina "Find your photos": le open session online adesso, con il conto alla rovescia.
(() => {
  const box = document.getElementById("days");
  const fmt = s => new Date(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const left = exp => {
    const ms = new Date(exp) - Date.now(); if (ms <= 0) return { t: "Expired", soon: true };
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    return { t: d ? `${d}d ${h}h left` : h ? `${h}h ${m}m left` : `${m} min left`, soon: ms < 2 * 864e5 };
  };
  let list = [];
  const draw = () => {
    if (!list.length) { box.innerHTML = document.getElementById("empty").innerHTML; return; }
    box.innerHTML = list.map(g => { const l = left(g.expires); return `
      <a class="day card" href="/g/${g.id}">
        <div class="day-covers">${g.covers.map(c => `<img src="${c}" alt="" loading="lazy">`).join("")}</div>
        <div class="day-body"><span class="cd${l.soon ? " soon" : ""}">⏳ ${l.t}</span>
          <h3>${g.spot.replace(/[<>&]/g, "")} <span class="arrow">→</span></h3>
          <p class="muted small">${g.title.replace(/[<>&]/g, "") || fmt(g.created)} · ${g.count} photos</p></div>
      </a>`; }).join("");
  };
  fetch("/api/open").then(r => r.ok ? r.json() : []).then(j => { list = j; draw(); setInterval(draw, 60000); }).catch(() => { list = []; draw(); });
})();
