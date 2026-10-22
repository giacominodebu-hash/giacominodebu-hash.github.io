/* J.A.R.V.I.S. Mark V · GALASSIA (versione cinema)
   Il tuo computer come una galassia 3D: il PC è la stella centrale, ogni cartella una stella dorata, ogni file una stella azzurra.
   Spazio profondo con nebulose e tre strati di stelle; quando JARVIS lavora la telecamera fa il salto nell'iperspazio fino alla
   cartella vera, arriva con un'onda d'urto, la cartella si apre e i suoi file nascono come nuove stelle.
   A riposo la telecamera esplora da sola le tue cartelle. Dati: /api/mappa (solo nomi) ed eventi "visione". */
"use strict";
(function () {
  const CFG = window.GALASSIA_CFG || {};
  const hud = CFG.contenitore ? document.querySelector(CFG.contenitore) : document.getElementById("hud"); if (!hud) return;
  const cv = document.createElement("canvas"); cv.id = "galassia"; cv.setAttribute("aria-hidden", "true");
  const neural = document.getElementById("neural"); hud.insertBefore(cv, neural || hud.firstChild);
  const g = cv.getContext("2d");
  const LITE = () => document.body.classList.contains("lite");
  const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, rnd = (a, b) => a + Math.random() * (b - a);
  let W = 0, H = 0, DPR = 1;
  const nodi = [], perPath = new Map();
  let focus = null, focusAt = 0, arrivato = false, chain = new Set(), t0 = performance.now(), last = 0;
  let tour = null, tourFine = 0, prossimoTour = performance.now() + 15000, ultimaAzione = 0;
  const cam = { x: 0, y: 0, z: 0, d: 2400, yaw: 0, pitch: .42, ax: 0, ay: 0, px: 0, py: 0, pz: 0, pd: 2400, vel: 0 };
  const onde = [], scintille = [], pacchetti = [];
  let livello = 0, impulso = 0;
  const key = p => String(p || "").replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();

  // ---------- struttura della galassia (forma stabile per percorso) ----------
  function seed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
  function aggiungi(p, n, d, par, nato) {
    const k = key(p); if (perPath.has(k)) return perPath.get(k);
    const P = par != null && par >= 0 ? nodi[par] : null, r = seed(k), depth = P ? P.depth + 1 : 0;
    let dir;
    if (!P) dir = [0, 0, 0];
    else if (depth === 1) { const i = P.kids.length, a = i * 2.39996, y = 1 - ((i * .37) % 1) * 2, rr = Math.sqrt(1 - y * y); dir = [Math.cos(a) * rr, y * .55, Math.sin(a) * rr]; }
    else { const v = [P.dir[0] * .8 + (r() - .5) * 1.3, P.dir[1] * .8 + (r() - .5) * 1.1, P.dir[2] * .8 + (r() - .5) * 1.3]; const L = Math.hypot(...v) || 1; dir = v.map(x => x / L); }
    const dist = P ? (d ? 260 / (1 + depth * .42) : 72 / (1 + depth * .15)) * (.75 + r() * .5) : 0;
    const node = { p, n, d, par: P ? par : -1, depth, dir, kids: [], x: P ? P.x + dir[0] * dist : 0, y: P ? P.y + dir[1] * dist : 0, z: P ? P.z + dir[2] * dist : 0, nato: nato || 0, ph: r() * TAU, sx: 0, sy: 0, s: 0, z2: 0, vis: false };
    nodi.push(node); const i = nodi.length - 1; perPath.set(k, i); if (P) P.kids.push(i);
    return i;
  }
  function trovaOCrea(path, isDir) {
    const k = key(path); if (perPath.has(k)) return perPath.get(k);
    const parts = String(path).replace(/\//g, "\\").split("\\").filter(Boolean);
    let i = parts.length - 1, base = -1;
    for (; i > 0; i--) { const pk = key(parts.slice(0, i).join("\\")); if (perPath.has(pk)) { base = perPath.get(pk); break; } }
    if (base < 0) base = 0;
    const ora = performance.now();
    for (let j = i; j < parts.length; j++) base = aggiungi(parts.slice(0, j + 1).join("\\"), parts[j], j < parts.length - 1 || isDir, base, ora + (j - i) * 160);
    return base;
  }
  let caricando = false, centro = [0, 0, 0], raggio = 400;
  function misura() {
    if (!nodi.length) return; let x = 0, y = 0, z = 0; nodi.forEach(n => { x += n.x; y += n.y; z += n.z; });
    centro = [x / nodi.length, y / nodi.length, z / nodi.length];
    const ds = nodi.map(n => Math.hypot(n.x - centro[0], n.y - centro[1], n.z - centro[2])).sort((a, b) => a - b);
    raggio = Math.max(150, ds[Math.floor(ds.length * .9)] || 400);
  }
  async function carica() {
    if (caricando || nodi.length > 2 || typeof api !== "function") return; caricando = true;
    try { const d = await api("/mappa"); (d.nodi || []).forEach(n => aggiungi(n.p, n.n, n.d, n.a, 0)); misura(); }
    catch (e) { /* senza mappa: la galassia nasce dalle azioni */ }
    finally { caricando = false; if (!nodi.length) aggiungi("C:\\Users", "PC", true, -1); }
  }
  if (!CFG.contenitore) new MutationObserver(() => { if (!hud.hidden) { setTimeout(layout, 30); if (nodi.length < 3) carica(); } }).observe(hud, { attributes: true, attributeFilter: ["hidden"] });

  // ---------- luci pre-disegnate ----------
  const spr = {};
  function sprite(rgb, soft) {
    const k = rgb + (soft ? "s" : ""); if (spr[k]) return spr[k];
    const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (soft) { gr.addColorStop(0, `rgba(${rgb},.5)`); gr.addColorStop(.4, `rgba(${rgb},.12)`); gr.addColorStop(1, `rgba(${rgb},0)`); }
    else { gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.12, `rgba(${rgb},.95)`); gr.addColorStop(.35, `rgba(${rgb},.32)`); gr.addColorStop(1, `rgba(${rgb},0)`); }
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return spr[k] = c;
  }
  const ORO = "255,200,90", AZZ = "90,210,255", BIA = "255,255,255", VIOLA = "160,110,255";
  // nebulose: disegnate una volta su una tela grande, poi solo spostate
  let neb = null;
  function nebulose() {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 640; const x = c.getContext("2d");
    const col = [["40,90,200", .22], ["120,60,220", .16], ["20,160,190", .18], ["200,120,60", .07], ["70,40,160", .18]];
    for (let i = 0; i < (LITE() ? 14 : 26); i++) {
      const [rgb, a] = col[i % col.length], px = rnd(0, 1024), py = rnd(80, 560), r = rnd(90, 300);
      const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = gr; x.beginPath(); x.ellipse(px, py, r * 1.6, r * .7, rnd(-.6, .6), 0, TAU); x.fill();
    }
    // polvere
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(200,225,255,${rnd(.03, .18)})`; x.fillRect(rnd(0, 1024), rnd(0, 640), 1, 1); }
    neb = c;
  }
  // stelle di sfondo su una sfera lontana (tre strati)
  const fondo = [];
  function stelleFondo() {
    fondo.length = 0; const n = LITE() ? 260 : 620;
    for (let i = 0; i < n; i++) { const a = rnd(0, TAU), b = Math.asin(rnd(-1, 1)); fondo.push({ a, b, l: i % 3, s: rnd(.5, 1.7), tw: rnd(0, TAU), c: Math.random() < .12 ? "255,220,180" : Math.random() < .2 ? "170,200,255" : "230,240,255" }); }
  }

  function layout() {
    DPR = LITE() ? 1 : Math.min(1.5, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight; if (!W) return; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!neb) nebulose(); if (!fondo.length) stelleFondo();
  }
  new ResizeObserver(layout).observe(document.body); window.addEventListener("resize", layout);

  function stato() { const c = document.body.className; return c.includes("s-thinking") ? "thinking" : c.includes("s-listening") ? "listening" : c.includes("s-speaking") ? "speaking" : c.includes("s-alert") ? "alert" : c.includes("s-error") ? "error" : "idle"; }
  function ancora() {   // dove sta il centro dell'inquadratura sullo schermo
    if (CFG.ancora) return CFG.ancora(focus != null && document.body.classList.contains("in-visione"));
    if (focus != null && document.body.classList.contains("in-visione")) return [W * .28, H * .5];
    const box = document.querySelector(".map-area"); const r = box ? box.getBoundingClientRect() : null;
    return r && r.width ? [r.left + r.width / 2, r.top + r.height * .42] : [W / 2, H * .42];
  }

  // ---------- disegno ----------
  function draw(now) {
    const T = (now - t0) / 1000, lite = LITE(), st = stato();
    const F = focus != null ? nodi[focus] : null, TR = !F && tour != null ? nodi[tour] : null, bersaglio = F || TR;
    // telecamera: punta il bersaglio, altrimenti tutta la galassia
    const R0 = nodi[0] || { x: 0, y: 0, z: 0 };   // a riposo il PC sta al centro della galassia
    const tx = bersaglio ? bersaglio.x : lerp(R0.x, centro[0], .3), ty = bersaglio ? bersaglio.y : lerp(R0.y, centro[1], .3), tz = bersaglio ? bersaglio.z : lerp(R0.z, centro[2], .3);
    const td = (F ? (F.d ? 500 : 300) : TR ? 640 : raggio * 2.15) / (CFG.zoom || 1);
    const kk = F ? .05 : TR ? .025 : .03;
    cam.px = cam.x; cam.py = cam.y; cam.pz = cam.z; cam.pd = cam.d;
    cam.x = lerp(cam.x, tx, kk); cam.y = lerp(cam.y, ty, kk); cam.z = lerp(cam.z, tz, kk); cam.d = lerp(cam.d, td, kk * .9); cam.pitch = lerp(cam.pitch, F ? .26 : TR ? .32 : .42, .03);
    cam.yaw += (F ? .0022 : .0011) * (st === "thinking" ? 2.2 : 1);
    const vel = Math.hypot(cam.x - cam.px, cam.y - cam.py, cam.z - cam.pz) + Math.abs(cam.d - cam.pd) * .6;
    cam.vel = lerp(cam.vel, vel, .2);
    const warp = Math.min(1, Math.max(0, (cam.vel - 4) / 22));
    const [ax, ay] = ancora(); cam.ax = lerp(cam.ax || ax, ax, .06); cam.ay = lerp(cam.ay || ay, ay, .06);
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), FOC = Math.min(W, H) * .95;
    for (const n of nodi) {
      const x = n.x - cam.x, y = n.y - cam.y, z = n.z - cam.z;
      const x1 = x * cy - z * sy, z1 = x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + cam.d;
      n.z2 = z2; if (z2 < 30) { n.vis = false; continue; }
      const s = FOC / z2; n.s = s; n.sx = cam.ax + x1 * s; n.sy = cam.ay + y1 * s; n.vis = n.sx > -120 && n.sx < W + 120 && n.sy > -120 && n.sy < H + 120;
    }
    // scia durante il volo: non cancello del tutto, così resta il movimento
    if (warp > .05) { g.globalCompositeOperation = "destination-out"; g.fillStyle = `rgba(0,0,0,${.55 - warp * .3})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over"; }
    else g.clearRect(0, 0, W, H);

    // spazio profondo: nebulose che ruotano con la telecamera
    if (neb) {
      const off = ((cam.yaw * 260) % 1024 + 1024) % 1024, sc = Math.max(W / 1024, H / 640) * 1.25, yo = (cam.pitch - .4) * 300;
      g.globalAlpha = .9;
      for (let k = -1; k <= 1; k++) g.drawImage(neb, (k * 1024 - off) * sc + W / 2 - 512 * sc * .2, -80 * sc + yo, 1024 * sc, 640 * sc);
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = "lighter";
    // stelle di sfondo con parallasse; durante il salto si allungano in strisce
    const cxs = ax, cys = ay;
    for (const s of fondo) {
      const a = s.a + cam.yaw * (.25 + s.l * .2), b = s.b + (cam.pitch - .4) * .5;
      const ca = Math.cos(a), cb = Math.cos(b); if (ca * cb < -.2) continue;
      const x = W / 2 + Math.sin(a) * cb * W * .75, y = H / 2 + Math.sin(b) * H * .75;
      const tw = .55 + .45 * Math.sin(T * 2 + s.tw), al = (.25 + s.l * .2) * tw;
      if (warp > .05) {
        const dx = x - cxs, dy = y - cys, L = warp * (18 + s.l * 26);
        const d = Math.hypot(dx, dy) || 1;
        g.strokeStyle = `rgba(${s.c},${Math.min(1, al + warp * .5)})`; g.lineWidth = s.s * (.6 + warp);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx / d * L * (d / 300), y + dy / d * L * (d / 300)); g.stroke();
      } else { g.fillStyle = `rgba(${s.c},${al})`; g.fillRect(x, y, s.s, s.s); }
    }
    // collegamenti dell'albero
    g.lineWidth = 1;
    for (const [col, filtro] of [[`rgba(${ORO},.15)`, n => n.d], [`rgba(${AZZ},.08)`, n => !n.d]]) {
      g.strokeStyle = col; g.beginPath();
      for (const n of nodi) { if (n.par < 0 || !filtro(n)) continue; const P = nodi[n.par]; if (!n.vis && !P.vis) continue; const b = nascita(n, now); if (b <= 0) continue;
        g.moveTo(P.sx, P.sy); g.lineTo(lerp(P.sx, n.sx, b), lerp(P.sy, n.sy, b)); }
      g.stroke();
    }
    // attività: pacchetti di luce che partono dal PC verso le cartelle (di più quando pensa)
    const freq = st === "thinking" ? .45 : st === "speaking" ? .2 : .05;
    if (nodi.length > 2 && Math.random() < freq * (lite ? .5 : 1) && pacchetti.length < (lite ? 12 : 34)) {
      const i = (Math.random() * (nodi.length - 1) + 1) | 0; if (nodi[i].d) pacchetti.push({ i, t: 0, v: rnd(.012, .03) });
    }
    for (let q = pacchetti.length - 1; q >= 0; q--) {
      const p = pacchetti[q]; p.t += p.v; const n = nodi[p.i]; if (p.t >= 1 || !n) { pacchetti.splice(q, 1); continue; }
      const P = nodi[n.par]; if (!P || !n.vis) continue; const x = lerp(P.sx, n.sx, p.t), y = lerp(P.sy, n.sy, p.t);
      g.drawImage(sprite(st === "thinking" ? ORO : AZZ), x - 6, y - 6, 12, 12);
    }
    // percorso fino al punto in cui sta lavorando: raggio di luce
    if (chain.size) {
      for (const [w, a] of [[7, .12], [2.2, .9]]) {
        g.strokeStyle = `rgba(${ORO},${a})`; g.lineWidth = w; g.beginPath();
        chain.forEach(i => { const n = nodi[i]; if (n.par >= 0) { const P = nodi[n.par]; g.moveTo(P.sx, P.sy); g.lineTo(n.sx, n.sy); } }); g.stroke();
      }
      const arr = [...chain].reverse(); const tt = (T * 1.6) % 1;
      arr.forEach((i, j) => { const n = nodi[i]; if (n.par < 0) return; const P = nodi[n.par], u = (tt + j * .17) % 1; g.drawImage(sprite(BIA), lerp(P.sx, n.sx, u) - 8, lerp(P.sy, n.sy, u) - 8, 16, 16); });
    }
    // stelle (cartelle e file)
    let etichette = 0;
    g.textAlign = "left";
    for (let i = 1; i < nodi.length; i++) {
      const n = nodi[i]; if (!n.vis) continue; const b = nascita(n, now); if (b <= 0) continue;
      const isF = i === focus, isT = i === tour && !F, figlioF = bersaglio && n.par === (F ? focus : tour), inChain = chain.has(i);
      const base = n.d ? (n.depth <= 1 ? 9 : 6) : 3.2;
      const r = Math.min(n.d ? 7.5 : 4.5, Math.max(1.1, base * n.s * 1.25)) * b * (isF ? 1.8 + Math.sin(T * 5) * .25 : figlioF || isT ? 1.3 : 1);
      // profondità di campo: le stelle lontane sono più morbide
      const lont = Math.min(1, Math.max(0, (n.z2 - cam.d) / 900));
      g.globalAlpha = isF || figlioF || inChain || isT ? 1 : (bersaglio ? .4 : .85) * (1 - lont * .5);
      g.drawImage(sprite(isF ? BIA : n.d ? ORO : AZZ), n.sx - r * 3.4, n.sy - r * 3.4, r * 6.8, r * 6.8);
      if (lont > .3) g.drawImage(sprite(n.d ? ORO : AZZ, true), n.sx - r * 6, n.sy - r * 6, r * 12, r * 12);
      g.globalAlpha = 1;
      if (isF || isT) agganciato(n, r, T, isF);
      const mostra = isF || isT || figlioF || (inChain && n.depth > 0) || (n.d && n.depth <= (bersaglio ? 0 : 2) && n.s > .5 && etichette < (lite ? 14 : 24));
      if (mostra && etichette < (lite ? 30 : 60)) {
        etichette++;
        if (isF || isT) callout(n, r, now, isF);
        else {
          g.font = `${n.d ? 700 : 500} ${figlioF ? 11.5 : 11}px "JetBrains Mono", Consolas, monospace`;
          g.fillStyle = n.d ? `rgba(255,228,160,${figlioF || inChain ? 1 : .78})` : `rgba(180,235,255,${figlioF ? .95 : .7})`;
          g.fillText((n.d ? "▸ " : "") + n.n.slice(0, 30), n.sx + r + 5, n.sy + 4);
        }
      }
    }
    // il PC: stella centrale con riflessi da lente
    if (nodi[0] && nodi[0].vis) stellaPC(nodi[0], T, st);
    // onde d'urto e scintille dell'arrivo
    for (let q = onde.length - 1; q >= 0; q--) {
      const o = onde[q]; o.t += .022; if (o.t >= 1) { onde.splice(q, 1); continue; } const n = nodi[o.i]; if (!n || !n.vis || o.t <= 0) continue;
      g.beginPath(); g.arc(n.sx, n.sy, 10 + o.t * 170, 0, TAU); g.strokeStyle = `rgba(${o.c},${(1 - o.t) * .7})`; g.lineWidth = 3 * (1 - o.t) + .5; g.stroke();
    }
    g.fillStyle = "rgba(255,230,170,.9)";
    for (let q = scintille.length - 1; q >= 0; q--) {
      const s = scintille[q]; s.life -= .025; if (s.life <= 0) { scintille.splice(q, 1); continue; }
      s.x += s.vx; s.y += s.vy; s.vx *= .95; s.vy *= .95; g.globalAlpha = s.life; g.fillRect(s.x, s.y, 2, 2);
    }
    g.globalAlpha = 1;
    // arrivo sul bersaglio
    if (F && !arrivato && cam.vel < 3 && now - focusAt > 400) {
      arrivato = true; onde.push({ i: focus, t: 0, c: ORO }, { i: focus, t: -.25, c: AZZ });
      for (let q = 0; q < (lite ? 24 : 60); q++) { const a = rnd(0, TAU), v = rnd(1.5, 6); scintille.push({ x: F.sx, y: F.sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.5, 1) }); }
    }
    // lampo dell'ingresso nell'iperspazio
    if (warp > .5) { g.fillStyle = `rgba(150,220,255,${(warp - .5) * .12})`; g.fillRect(0, 0, W, H); }
    g.globalCompositeOperation = "source-over";
  }
  function stellaPC(n, T, st) {
    const col = st === "thinking" ? ORO : st === "listening" ? "120,255,200" : st === "alert" ? "255,160,60" : st === "error" ? "255,70,95" : "140,220,255";
    const R = Math.min(34, Math.max(14, 28 * n.s)) * (1 + livello * .5 + impulso * .4 + Math.sin(T * 1.6) * .05);
    impulso *= .94; livello *= .9;
    g.drawImage(sprite(col, true), n.sx - R * 9, n.sy - R * 9, R * 18, R * 18);
    g.drawImage(sprite(col), n.sx - R * 3, n.sy - R * 3, R * 6, R * 6);
    g.drawImage(sprite(BIA), n.sx - R, n.sy - R, R * 2, R * 2);
    // riflesso anamorfico (striscia orizzontale) e raggi
    const gr = g.createLinearGradient(n.sx - R * 16, 0, n.sx + R * 16, 0);
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(.5, `rgba(${col},.55)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(n.sx - R * 16, n.sy - 1.5, R * 32, 3);
    g.save(); g.translate(n.sx, n.sy); g.rotate(T * .08);
    for (let k = 0; k < 6; k++) { g.rotate(TAU / 6); const l = R * (4 + (k % 2) * 2.5); const lg = g.createLinearGradient(0, 0, l, 0); lg.addColorStop(0, `rgba(${col},.5)`); lg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = lg; g.fillRect(0, -.8, l, 1.6); }
    g.restore();
    // anelli di mira attorno al PC
    g.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) { const rr = R * (3.2 + k * 1.3), a0 = T * (k ? -.5 : .35); g.strokeStyle = `rgba(${col},${.5 - k * .2})`; g.beginPath(); g.arc(n.sx, n.sy, rr, a0, a0 + 1.6); g.stroke(); g.beginPath(); g.arc(n.sx, n.sy, rr, a0 + Math.PI, a0 + Math.PI + 1.6); g.stroke(); }
    // lenti fantasma lungo la diagonale (riflesso cinematografico)
    const dx = W / 2 - n.sx, dy = H / 2 - n.sy;
    [[.6, 10, .12], [1.2, 22, .07], [1.6, 6, .16]].forEach(([f, rr, a]) => { g.globalAlpha = a; g.drawImage(sprite(col, true), n.sx + dx * f - rr * 2, n.sy + dy * f - rr * 2, rr * 4, rr * 4); });
    g.globalAlpha = 1;
    g.font = "700 11px Orbitron, Rajdhani, sans-serif"; g.fillStyle = `rgba(${col},.85)`; g.textAlign = "center";
    g.fillText("NODO-01 · " + (n.n || "PC").toUpperCase(), n.sx, n.sy + R * 1.7 + 14); g.textAlign = "left";
  }
  function agganciato(n, r, T, forte) {
    for (let q = 0; q < (forte ? 3 : 1); q++) { const rr = r * (3 + q * 1.6) + ((T * 40 + q * 14) % 30); g.beginPath(); g.arc(n.sx, n.sy, rr, 0, TAU); g.strokeStyle = `rgba(${ORO},${(forte ? .5 : .3) - q * .14})`; g.lineWidth = 1.5; g.stroke(); }
    const L = r * 6; g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = n.sx + sx * L, y = n.sy + sy * L; g.moveTo(x, y + -sy * 7); g.lineTo(x, y); g.lineTo(x + -sx * 7, y); }
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 1.4; g.stroke();
  }
  function callout(n, r, now, forte) {   // etichetta da film: linea dalla stella a un riquadro, testo che si scrive
    const nome = (n.d ? "▣ " : "▤ ") + n.n, k = Math.min(nome.length, Math.floor((now - (forte ? focusAt : tourInizio)) / 28));
    const testo = nome.slice(0, k) + (k < nome.length ? "▌" : "");
    const info = `${n.d ? "CARTELLA" : "FILE"} · LIVELLO ${n.depth} · ${n.kids.length} ELEMENTI`;
    const fs = W < 600 ? (forte ? 13 : 12) : (forte ? 15 : 13);
    g.font = `700 ${fs}px "JetBrains Mono", Consolas, monospace`; const w = Math.min(W - 16, Math.max(g.measureText(nome).width, W < 600 ? 170 : 200) + 18);
    const sx = n.sx + r * 2 + 60 + w > W - 6 ? -1 : 1;   // se a destra non c'è posto, il riquadro va a sinistra
    const x0 = n.sx + sx * r * 2, y0 = n.sy - r * 2, x1 = x0 + sx * 46, y1 = Math.max(40, y0 - 34);
    const bx = Math.max(6, sx > 0 ? x1 + 14 : x1 - 14 - w);
    g.strokeStyle = `rgba(${ORO},.8)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1 + sx * 14, y1); g.stroke();
    g.fillStyle = "rgba(3,14,26,.62)"; g.fillRect(bx, y1 - 30, w, 40);
    g.strokeStyle = `rgba(${ORO},.55)`; g.strokeRect(bx, y1 - 30, w, 40);
    g.save(); g.beginPath(); g.rect(bx, y1 - 30, w, 40); g.clip();
    g.fillStyle = "#fff"; g.fillText(testo, bx + 8, y1 - 13);
    g.font = "500 9.5px Consolas, monospace"; g.fillStyle = `rgba(${ORO},.95)`; g.fillText(info, bx + 8, y1 + 3); g.restore();
  }
  let tourInizio = 0;
  function nascita(n, now) { if (!n.nato) return 1; const b = (now - n.nato) / 700; return b < 0 ? 0 : b > 1 ? 1 : 1 - Math.pow(1 - b, 3); }
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || hud.hidden) return;
    if (!W || cv.clientWidth !== W) { layout(); if (!W) return; }
    if (!nodi.length) return;
    const muove = focus != null || tour != null || cam.vel > 1 || stato() !== "idle";
    const fps = LITE() ? (muove ? 24 : 16) : (muove ? 40 : 28);
    if (now - last < 1000 / fps - 2) return; last = now;
    // a riposo la telecamera esplora da sola una cartella, poi torna indietro
    if (focus == null) {
      if (tour != null && now > tourFine) { tour = null; prossimoTour = now + rnd(14000, 24000); }
      else if (tour == null && now > prossimoTour && now - ultimaAzione > 20000 && stato() === "idle") {
        const dirs = nodi.map((n, i) => n.d && n.depth >= 2 && n.kids.length ? i : -1).filter(i => i >= 0);
        if (dirs.length) { tour = dirs[(Math.random() * dirs.length) | 0]; tourFine = now + 8000; tourInizio = now + 900; }
      }
    }
    draw(now);
  }
  requestAnimationFrame(loop); setTimeout(layout, 60);

  window.GALASSIA = {
    /* vola sul percorso dell'azione; restituisce dopo quanti ms mostrare il pannello */
    vai(d) {
      if (!d || !d.path || !nodi.length) return 0;
      const p = String(d.path).replace(/^avvio |^python |^registro /, "");
      if (!/^[a-z]:\\|^\\\\|^\//i.test(p)) return 0;
      const isDir = d.tipo === "cartella" || d.tipo === "ricerca";
      const i = trovaOCrea(p, isDir);
      const lontano = focus == null || Math.hypot(nodi[i].x - cam.x, nodi[i].y - cam.y, nodi[i].z - cam.z) > 250;
      focus = i; focusAt = performance.now(); arrivato = false; tour = null; ultimaAzione = performance.now();
      chain = new Set(); for (let j = i; j >= 0; j = nodi[j].par) chain.add(j);
      if (d.tipo === "cartella" && d.items) {   // i file della cartella nascono come nuove stelle
        const ora = performance.now() + (lontano ? 1400 : 400);
        d.items.slice(0, 70).forEach((x, q) => aggiungi(p.replace(/\\+$/, "") + "\\" + x.n, x.n, !!x.d, i, ora + q * 35));
      }
      if (d.tipo === "ricerca" && d.items) d.items.slice(0, 30).forEach(s => { const pp = String(s).split(/:\d+\s/)[0]; if (/^[a-z]:\\/i.test(pp)) trovaOCrea(pp, false); });
      return lontano ? 1700 : 700;
    },
    torna() { focus = null; chain = new Set(); misura(); ultimaAzione = performance.now(); },
    carica(dati) {   // il telefono passa la mappa ricevuta dal PC
      if (dati && dati.nodi && dati.nodi.length) { nodi.length = 0; perPath.clear(); dati.nodi.forEach(n => aggiungi(n.p, n.n, n.d, n.a, 0)); misura(); return true; }
      return carica();
    },
    radice(nome) { if (!nodi.length) { aggiungi("C:\\" + (nome || "PC"), nome || "PC", true, -1); misura(); } },
    get nodi() { return nodi.length; },
  };
  // senza l'occhio, il resto dell'interfaccia parla con la stella del PC
  if (!window.NEURAL) window.NEURAL = {
    flash() { impulso = 1; }, set level(v) { livello = Math.max(livello, Math.min(1, v || 0)); }, get level() { return livello; },
    relayout: layout, look() {},
    beam(x, y) { impulso = Math.max(impulso, .6); },
    core() { const n = nodi[0]; return n && n.vis ? { x: n.sx, y: n.sy, r: 40 } : { x: W / 2, y: H * .42, r: 40 }; },
  };
})();
