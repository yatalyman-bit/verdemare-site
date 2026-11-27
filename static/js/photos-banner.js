// Home: se ci sono open session online, una striscia discreta in alto "Surfed with me this week?"
(() => {
  fetch("/api/open").then(r => r.ok ? r.json() : []).then(list => {
    if (!list.length) return;
    const soon = list.some(g => new Date(g.expires) - Date.now() < 2 * 864e5);
    const a = document.createElement("a"); a.className = "photos-strip"; a.href = "/photos/";
    a.innerHTML = `📸 Surfed with me this week? <b>Find your photos</b>${soon ? " · some expire soon" : ""}&nbsp;→`;
    const main = document.querySelector("main") || document.body; main.prepend(a);
  }).catch(() => {});
})();
