/* J.A.R.V.I.S. Mark V · VISORE
   Trasforma ogni azione VERA in una scena: entra nella cartella e mostra i file che ci sono davvero, apre il file e ne fa
   scorrere il testo reale, scrive il codice riga per riga, fa scorrere l'output del programma, mostra conto e mercati.
   Riceve gli eventi "visione" dal cervello (window.VISORE.mostra(d)). Fuori dalle scene non consuma niente. */
"use strict";
(function () {
  const hud = (window.VISORE_CFG && document.querySelector(window.VISORE_CFG.contenitore)) || document.getElementById("hud"); if (!hud) return;
  const box = document.createElement("div"); box.id = "visore"; box.setAttribute("aria-live", "off");
  box.innerHTML = `<button type="button" class="vs-x" title="Chiudi (Esc)">✕</button><div class="vs-stage"></div>`;
  hud.appendChild(box);
  const stage = box.querySelector(".vs-stage");
  const LITE = () => document.body.classList.contains("lite");
  const esc = t => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const hex = n => Array.from({ length: n }, () => "0123456789ABCDEF"[(Math.random() * 16) | 0]).join("");
  const kb = b => b == null ? "" : b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB";
  const parti = p => String(p || "").split(/[\\/]+/).filter(Boolean);
  const coda = [], timers = new Set();
  let attiva = null, inizio = 0, chiudiT = null;
  const T = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const I = (fn, ms) => { const id = setInterval(fn, ms); timers.add(id); return id; };
  function pulisci() { timers.forEach(id => { clearTimeout(id); clearInterval(id); }); timers.clear(); }

  // colora il codice in modo semplice
  const TOK = /(#.*$|\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(def|class|return|if|elif|else|for|while|in|import|from|as|with|try|except|finally|raise|lambda|and|or|not|is|None|True|False|pass|break|continue|function|const|let|var|async|await)\b|\b(\d+(?:[.,]\d+)?)\b/g;
  function colora(riga) {
    const r = String(riga == null ? "" : riga); let out = "", last = 0;
    r.replace(TOK, (m, c, st, k, n, off) => {
      out += esc(r.slice(last, off));
      out += `<i class="${c ? "c" : st ? "s" : k ? "k" : "n"}">${esc(m)}</i>`;
      last = off + m.length; return m;
    });
    return out + esc(r.slice(last));
  }
  const ICON = { cartella: "▣", file: "▤", scrittura: "✎", ricerca: "◎", esecuzione: "▶", programmi: "◉", web: "◍", mercato: "▲", conto: "$" };
  const TITOLO = { cartella: "ACCESSO CARTELLA", file: "LETTURA FILE", scrittura: "SCRITTURA FILE", ricerca: "SCANSIONE DEL DISCO", esecuzione: "ESECUZIONE", programmi: "AGENTI IN ESECUZIONE", web: "COLLEGAMENTO ESTERNO", mercato: "MERCATI IN TEMPO REALE", conto: "CONTO METATRADER" };

  function testa(d, extra) {
    return `<div class="vs-h"><b>${ICON[d.tipo] || "◆"}</b><span class="vs-t">${TITOLO[d.tipo] || "OPERAZIONE"}</span>
      <span class="vs-p">${esc(d.path || d.comando || "")}</span><span class="vs-id">${extra || "0x" + hex(6)}</span></div>`;
  }
  function stato(d, testoOk) {
    return `<div class="vs-stamp ${d.ok === false ? "ko" : "ok"}">${d.ok === false ? "✕ " + esc(d.errore || "ERRORE") : "✓ " + (testoOk || "COMPLETATO")}</div>`;
  }

  // ---------- scene ----------
  const SCENE = {
    cartella(d, el) {
      const seg = parti(d.path), items = d.items || [];
      const nd = items.filter(x => x.d).length, nf = items.length - nd;
      el.innerHTML = testa(d, `${items.length} ELEMENTI`) + `<div class="vs-dive"></div><div class="vs-grid"></div><div class="vs-foot"></div><div class="vs-scan"></div>`;
      const dive = el.querySelector(".vs-dive"), grid = el.querySelector(".vs-grid"), foot = el.querySelector(".vs-foot");
      const mostrati = seg.slice(-5);
      mostrati.forEach((s, i) => { const g = document.createElement("div"); g.className = "vs-gate"; g.style.animationDelay = (i * .5) + "s"; g.innerHTML = `<em>${esc(i === 0 && seg.length > 5 ? "…\\" + s : s)}</em><small>LIVELLO ${seg.length - mostrati.length + i + 1}</small>`; dive.appendChild(g); });
      const dopo = mostrati.length * 500 + 450;
      T(() => {
        dive.classList.add("via");
        items.forEach((x, j) => {
          const c = document.createElement("div"); c.className = "vs-card" + (x.d ? " dir" : "");
          const ext = (x.n || "").split(".").pop().toLowerCase();
          c.innerHTML = `<i>${x.d ? "▣" : ext === "py" ? "PY" : ext === "csv" ? "CSV" : ext === "json" ? "{ }" : ext === "log" || ext === "txt" ? "TXT" : "▤"}</i><b>${esc(x.n)}</b><small>${x.d ? "cartella" : kb(x.b)}</small>`;
          c.style.animationDelay = Math.min(j * 28, 1400) + "ms"; grid.appendChild(c);
        });
        if (!items.length) grid.innerHTML = `<div class="vs-vuoto">${d.ok === false ? esc(d.errore) : "CARTELLA VUOTA"}</div>`;
        foot.innerHTML = `<span>${nd} CARTELLE</span><span>${nf} FILE</span><span>SETTORE 0x${hex(4)}</span>` + stato(d, "INDICE LETTO");
        el.querySelector(".vs-scan").classList.add("go");
      }, dopo);
      return dopo + 2600;
    },
    file(d, el) {
      const righe = String(d.testo || "").split(/\r?\n/), ext = String(d.path || "").split(".").pop().toLowerCase();
      el.innerHTML = testa(d, `${righe.length} RIGHE`) + `<div class="vs-doc"><div class="vs-lines"></div><div class="vs-mini"></div><div class="vs-bar"></div></div><div class="vs-foot"></div>`;
      const L = el.querySelector(".vs-lines"), mini = el.querySelector(".vs-mini"), bar = el.querySelector(".vs-bar"), foot = el.querySelector(".vs-foot");
      const max = Math.min(righe.length, 600);
      L.innerHTML = righe.slice(0, max).map((r, i) => `<div><u>${i + 1}</u>${colora(r, ext) || " "}</div>`).join("");
      mini.innerHTML = righe.slice(0, 300).map(r => `<i style="width:${Math.min(100, r.length * 1.2)}%"></i>`).join("");
      if (d.ok === false) { foot.innerHTML = stato(d); return 3500; }
      let k = 0; const passo = Math.max(1, Math.round(max / 90));
      const id = I(() => {
        k = Math.min(max - 1, k + passo); const riga = L.children[k];
        if (riga) { bar.style.transform = `translateY(${riga.offsetTop - L.scrollTop}px)`; if (riga.offsetTop > L.scrollTop + L.clientHeight * .6) L.scrollTop = riga.offsetTop - L.clientHeight * .6; riga.classList.add("letta"); }
        foot.innerHTML = `<span>LETTURA ${Math.round((k + 1) / max * 100)}%</span><span>RIGA ${k + 1}/${righe.length}</span><span>${esc(ext.toUpperCase())}</span>`;
        if (k >= max - 1) { clearInterval(id); foot.innerHTML += stato(d, "FILE ANALIZZATO"); }
      }, LITE() ? 70 : 40);
      return Math.min(9000, 1200 + max / passo * 45);
    },
    scrittura(d, el) {
      const nuove = String(d.testo || "").split(/\r?\n/), vecchie = d.vecchio ? String(d.vecchio).split(/\r?\n/) : [], ext = String(d.path || "").split(".").pop().toLowerCase();
      el.innerHTML = testa(d, d.vecchio ? "MODIFICA" : "NUOVO FILE") + `<div class="vs-doc scrive"><div class="vs-lines"></div></div><div class="vs-foot"></div>`;
      const L = el.querySelector(".vs-lines"), foot = el.querySelector(".vs-foot");
      vecchie.slice(0, 30).forEach((r, i) => { const div = document.createElement("div"); div.className = "del"; div.innerHTML = `<u>−</u>${colora(r, ext) || " "}`; div.style.animationDelay = (i * 30) + "ms"; L.appendChild(div); });
      const tot = Math.min(nuove.length, 220); let k = 0;
      T(() => {
        const id = I(() => {
          const n = LITE() ? 2 : 1;
          for (let q = 0; q < n && k < tot; q++, k++) { const div = document.createElement("div"); div.className = "add"; div.innerHTML = `<u>+</u>${colora(nuove[k], ext) || " "}`; L.appendChild(div); }
          L.scrollTop = L.scrollHeight;
          foot.innerHTML = `<span>SCRITTURA ${Math.round(k / tot * 100)}%</span><span>+${k} RIGHE</span>${vecchie.length ? `<span>−${vecchie.length} RIGHE</span>` : ""}<span class="cur">█</span>`;
          if (k >= tot) { clearInterval(id); foot.innerHTML = `<span>+${tot} RIGHE</span>${vecchie.length ? `<span>−${vecchie.length} RIGHE</span>` : ""}` + stato(d, "SALVATO"); }
        }, 32);
      }, vecchie.length ? 700 : 200);
      return Math.min(9000, 1200 + tot * 34);
    },
    ricerca(d, el) {
      const items = d.items || [], q = String(d.query || "");
      el.innerHTML = testa(d, `«${esc(q)}»`) + `<div class="vs-rad"><div class="vs-sweep"></div><b>${items.length}</b><small>RISULTATI</small></div><div class="vs-list"></div><div class="vs-foot"></div>`;
      const list = el.querySelector(".vs-list"), foot = el.querySelector(".vs-foot");
      const re = q ? new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig") : null;
      items.forEach((x, j) => T(() => {
        const li = document.createElement("div"); li.className = "vs-hit"; li.style.setProperty("--dx", (Math.random() * 400 - 200) + "px");
        li.innerHTML = re ? esc(x).replace(re, "<mark>$1</mark>") : esc(x); list.appendChild(li); list.scrollTop = list.scrollHeight;
        foot.innerHTML = `<span>TROVATI ${j + 1}/${items.length}</span><span>${esc(parti(d.path).slice(-2).join("\\"))}</span>`;
      }, 500 + j * 90));
      T(() => { foot.innerHTML += stato(d, items.length ? "SCANSIONE COMPLETA" : "NESSUN RISULTATO"); }, 600 + items.length * 90);
      return 1800 + items.length * 90;
    },
    esecuzione(d, el) {
      const righe = String(d.testo || "").split(/\r?\n/).filter((r, i, a) => r.trim() || i < a.length - 1).slice(-120);
      el.innerHTML = testa(d, d.pid ? "PID " + d.pid : "PROCESSO") + `<div class="vs-term"><div class="vs-cmd"><b>PS&gt;</b> <span></span><i>█</i></div><div class="vs-out"></div></div><div class="vs-foot"></div>`;
      const cmd = el.querySelector(".vs-cmd span"), out = el.querySelector(".vs-out"), foot = el.querySelector(".vs-foot");
      const c = String(d.comando || ""); let k = 0;
      const id = I(() => { k += 3; cmd.textContent = c.slice(0, k); if (k >= c.length) { clearInterval(id); avvia(); } }, 18);
      function avvia() {
        let j = 0;
        const id2 = I(() => {
          for (let q = 0; q < 2 && j < righe.length; q++, j++) { const div = document.createElement("div"); div.textContent = righe[j]; if (/error|errore|traceback|exception/i.test(righe[j])) div.className = "err"; else if (/\b(ok|fatto|avviato|aperto|chiuso|profitto|buy|sell)\b/i.test(righe[j])) div.className = "hi"; out.appendChild(div); }
          out.scrollTop = out.scrollHeight;
          foot.innerHTML = `<span>OUTPUT ${j}/${righe.length} RIGHE</span>${d.pid ? `<span>PID ${d.pid}</span>` : ""}`;
          if (j >= righe.length) { clearInterval(id2); foot.innerHTML += stato(d, d.pid ? "PROCESSO IN ESECUZIONE" : "TERMINATO"); }
        }, 40);
      }
      return Math.min(8000, 1500 + c.length * 6 + righe.length * 20);
    },
    programmi(d, el) {
      const items = d.items || [], on = items.filter(x => x.on);
      el.innerHTML = testa(d, `${on.length} ATTIVI`) + `<div class="vs-agenti">${items.map((x, i) => `<div class="vs-ag ${x.on ? "on" : ""}" style="animation-delay:${i * 90}ms"><i></i><b>${esc(x.n)}</b><small>${x.on ? "PID " + x.pid + " · IN ESECUZIONE" : "FERMO"}</small><em>${hex(8)}</em></div>`).join("") || '<div class="vs-vuoto">NESSUN AGENTE AVVIATO</div>'}</div><div class="vs-foot">${stato(d, "AGENTI VERIFICATI")}</div>`;
      return 4200;
    },
    web(d, el) {
      const righe = d.items && d.items.length ? d.items : String(d.testo || "").split(/\n+/).filter(r => r.trim()).slice(0, 80);
      el.innerHTML = testa(d, "HTTPS") + `<div class="vs-link"><i></i><span>NODO-01</span><em></em><span>${esc(String(d.path || "").replace(/^https?:\/\//, "").slice(0, 40))}</span></div><div class="vs-list web"></div><div class="vs-foot"></div>`;
      const list = el.querySelector(".vs-list"), foot = el.querySelector(".vs-foot");
      righe.forEach((r, j) => T(() => { const li = document.createElement("div"); li.className = "vs-hit"; li.textContent = r.slice(0, 220); list.appendChild(li); list.scrollTop = list.scrollHeight; foot.innerHTML = `<span>RICEVUTI ${j + 1}/${righe.length}</span>`; }, 900 + j * 70));
      T(() => foot.innerHTML += stato(d, "DATI RICEVUTI"), 1000 + righe.length * 70);
      return 2200 + righe.length * 70;
    },
    mercato(d, el) {
      const items = d.items || [];
      el.innerHTML = testa(d, "FEED MT5") + `<div class="vs-tiles">${items.map((x, i) => `<div class="vs-tile ${x.c >= 0 ? "up" : "dn"}" style="animation-delay:${i * 110}ms"><b>${esc(x.s)}</b><strong data-v="${x.p}" data-d="${x.d}">0</strong><small>${x.c >= 0 ? "▲" : "▼"} ${Math.abs(x.c || 0).toFixed(2)}% · ${esc(x.b || "")}</small></div>`).join("") || '<div class="vs-vuoto">METATRADER NON RISPONDE</div>'}</div><div class="vs-foot">${stato(d, "QUOTAZIONI AGGIORNATE")}</div>`;
      conta(el); return 4500;
    },
    conto(d, el) {
      const items = d.items || [];
      el.innerHTML = testa(d, d.demo ? "DEMO " + (d.conto || "") : "REALE " + (d.conto || "")) + `<div class="vs-tiles big">
        <div class="vs-tile"><b>SALDO</b><strong data-v="${d.saldo || 0}" data-d="2">0</strong><small>USD</small></div>
        <div class="vs-tile ${(d.equity || 0) >= (d.saldo || 0) ? "up" : "dn"}"><b>EQUITY</b><strong data-v="${d.equity || 0}" data-d="2">0</strong><small>USD</small></div></div>
        <div class="vs-list">${items.map((p, i) => `<div class="vs-hit ${p.pr >= 0 ? "up" : "dn"}" style="animation-delay:${600 + i * 120}ms">${esc(p.s)} · ${esc(p.t)} ${esc(p.l)} lotti da ${esc(p.po)} → <b>${p.pr >= 0 ? "+" : ""}${Number(p.pr || 0).toFixed(2)} $</b></div>`).join("") || '<div class="vs-hit">NESSUNA POSIZIONE APERTA</div>'}</div>
        <div class="vs-foot">${stato(d, "CONTO SINCRONIZZATO")}</div>`;
      conta(el); return 5000;
    },
  };
  function conta(el) {   // i numeri salgono fino al valore vero
    el.querySelectorAll("strong[data-v]").forEach(s => {
      const v = Number(s.dataset.v) || 0, dg = Number(s.dataset.d) || 2; let k = 0;
      const id = I(() => { k++; const t = Math.min(1, k / 24), e = 1 - Math.pow(1 - t, 3); s.textContent = (v * e).toLocaleString("it-IT", { minimumFractionDigits: dg, maximumFractionDigits: dg }); if (t >= 1) clearInterval(id); }, 30);
    });
  }

  // ---------- regia ----------
  function prossima() {
    if (attiva || !coda.length) return;
    const d = coda.shift(); const fn = SCENE[d.tipo]; if (!fn) return prossima();
    pulisci(); clearTimeout(chiudiT);
    attiva = d;
    let ritardo = 0; try { if (window.GALASSIA) ritardo = window.GALASSIA.vai(d) || 0; } catch {}
    document.body.classList.add("in-visione"); if (ritardo) document.body.classList.add("gal");
    stage.querySelectorAll(".vs-scene").forEach(o => { o.classList.add("esce"); setTimeout(() => o.remove(), 450); });
    if (window.FX) window.FX.log("NAV", `rotta verso ${String(d.path || d.comando || d.tipo).slice(-46)}`, "hot");
    T(() => apri(d), ritardo);
  }
  function apri(d) {
    const fn = SCENE[d.tipo];
    const el = document.createElement("div"); el.className = "vs-scene vs-" + d.tipo;
    stage.querySelectorAll(".vs-scene").forEach(o => { o.classList.add("esce"); setTimeout(() => o.remove(), 450); });
    stage.appendChild(el);
    box.classList.add("on"); document.body.classList.add("in-visione");
    if (window.NEURAL && window.NEURAL.beam) { const r = box.getBoundingClientRect(); window.NEURAL.beam(r.left + r.width / 2, r.top + 40); }
    if (window.FX) window.FX.log("VISORE", `${TITOLO[d.tipo] || d.tipo} ▸ ${String(d.path || d.comando || "").slice(-48)}`, "hot");
    let dur = 3000; try { dur = fn(d, el) || 3000; } catch (e) { console.error(e); }
    inizio = performance.now();
    const minimo = coda.length ? Math.min(dur, 2600) : dur;
    T(() => { attiva = null; if (coda.length) prossima(); else programmaChiusura(); }, minimo);
  }
  function programmaChiusura() {
    clearTimeout(chiudiT);
    chiudiT = setTimeout(function chk() {
      if (attiva || coda.length) return;
      if (/\bs-(thinking|listening)\b/.test(document.body.className)) { chiudiT = setTimeout(chk, 1500); return; }
      chiudi();
    }, 6000);
  }
  function chiudi() {
    pulisci(); coda.length = 0; attiva = null; box.classList.remove("on"); document.body.classList.remove("in-visione", "gal");
    try { if (window.GALASSIA) window.GALASSIA.torna(); } catch {}
    setTimeout(() => { if (!box.classList.contains("on")) stage.innerHTML = ""; }, 500);
  }
  box.querySelector(".vs-x").onclick = chiudi;
  document.addEventListener("keydown", e => { if (e.key === "Escape" && box.classList.contains("on")) chiudi(); });

  window.VISORE = {
    mostra(d) { if (!d || !d.tipo) return; if (coda.length > 6) coda.shift(); coda.push(d); prossima(); },
    chiudi,
  };
})();
