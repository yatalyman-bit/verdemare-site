// Preventivo nelle pagine Solo / Couple / Friends. Prezzi letti da #q-data (data/site.yaml).
(() => {
  const D = JSON.parse(document.getElementById("q-data").textContent), P = D.prices, f = document.getElementById("q");
  const NAMES = { photo: "Surf photos", shoot: "Surf photos + photoshoot", video: "Video: edited reel + all clips", clips: "Video: clips only" };
  const each = (t, n) => { const e = t / n; return Number.isInteger(e) ? e + "€" : Number.isInteger(e * 2) ? e.toFixed(2) + "€" : "≈" + Math.round(e) + "€"; };
  const half = P.extra_hour / 2;
  function calc() {
    const svc = f.svc.value, n = +f.n.value, x = +f.x.value, w = +f.w.value;
    const base = svc === "shoot" ? P.photo[n - 1] + P.shoot : P[svc][n - 1], extra = x * half, travel = w ? P.travel : 0, tot = base + extra + travel;
    const lines = [[`${NAMES[svc]} · ${n} surfer${n > 1 ? "s" : ""} · ${svc === "shoot" ? "1h" + P.shoot_minutes : "1 hour"}`, base]];
    if (x) lines.push([`Extra time +${x * 30} min`, extra]);
    if (w) lines.push(["Ericeira or Nazaré", travel]);
    document.getElementById("q-lines").innerHTML = lines.map(([a, b]) => `<div class="q-row"><span>${a}</span><span>${b}€</span></div>`).join("");
    document.getElementById("q-tot").textContent = tot + "€";
    document.getElementById("q-each").textContent = n > 1 ? `${each(tot, n)} each, split between ${n}.` : "";
    const h = f.querySelector(".hint4"); if (h) h.hidden = !(n === 4 && x === 0);
    const msg = `Hi Flavio! I'd like to book a ${D.group} session:\n` + lines.map(([a, b]) => `- ${a}: ${b}€`).join("\n") + `\nTotal ${tot}€. When are you free?`;
    document.getElementById("q-book").href = `https://wa.me/${D.wa}?text=${encodeURIComponent((window.vmTag || (m => m))(msg))}`;
    document.getElementById("q-book").dataset.via = 1;
  }
  f.addEventListener("change", calc); calc();
  // schede Foto / Video: si vede un pannello alla volta; il preventivo segue la scheda
  const tabs = document.querySelectorAll(".tabs-pv [role=tab]");
  const GROUP = { photo: ["photo", "shoot"], video: ["video", "clips"] };
  function setTab(name, fromPick) {
    tabs.forEach(t => { const on = t.dataset.tab === name; t.setAttribute("aria-selected", on); document.getElementById("panel-" + t.dataset.tab).hidden = !on; });
    if (!fromPick && !GROUP[name].includes(f.svc.value)) { f.querySelector(`input[name=svc][value=${GROUP[name][0]}]`).checked = true; calc(); }
  }
  tabs.forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
  f.addEventListener("change", e => { if (e.target.name === "svc") setTab(GROUP.photo.includes(e.target.value) ? "photo" : "video", true); });
  const rsAll = document.querySelector(".rs-all");
  if (rsAll) rsAll.addEventListener("click", () => { document.querySelector(".rs-grid").classList.add("rs-open"); rsAll.remove(); });
  document.querySelectorAll(".pick").forEach(b => b.addEventListener("click", () => {
    f.querySelector(`input[name=svc][value=${b.dataset.svc}]`).checked = true; calc();
    document.getElementById("quote").scrollIntoView({ behavior: "smooth" });
  }));
})();
