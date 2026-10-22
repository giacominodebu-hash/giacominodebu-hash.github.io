/* J.A.R.V.I.S. Mark V · GALASSIA FLUIDA
   La galassia del tuo computer (il PC al centro, cartelle dorate, file azzurri) viene disegnata UNA volta sola;
   poi tutto si muove con le animazioni della scheda video (zoom, voli, comete, pulsazioni): il processore resta quasi fermo,
   quindi è fluida anche su PC vecchi e telefoni. Quando JARVIS usa una cartella, la telecamera vola fin lì e la cartella si apre.
   API: GALASSIA.vai(d) · torna() · carica(dati) · radice(nome) · cometa(titolo, fonte) · nodi */
"use strict";
(function () {
  const CFG = window.GALASSIA_CFG || {};
  const hud = CFG.contenitore ? document.querySelector(CFG.contenitore) : document.getElementById("hud"); if (!hud) return;
  const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, rnd = (a, b) => a + Math.random() * (b - a);
  const esc = t => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const key = p => String(p || "").replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();

  // ---------- stile (tutto animato dalla scheda video: transform e opacity) ----------
  const css = document.createElement("style"); css.id = "gx-style";
  css.textContent = `
#galassia{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:#02050c;contain:strict}
.hud.mk4>#galassia{position:fixed;z-index:0}
#galassia .gx-sky{position:absolute;inset:-10%;background-size:cover;background-position:center;opacity:.95;animation:gxSky 90s ease-in-out infinite alternate;will-change:transform}
#galassia .gx-stars{position:absolute;left:0;top:0;width:200%;height:100%;background-repeat:repeat;will-change:transform,opacity}
#galassia .gx-stars.a{animation:gxStars 240s linear infinite,gxTw 5s ease-in-out infinite alternate}
#galassia .gx-stars.b{animation:gxStars 150s linear infinite,gxTw 3.2s ease-in-out infinite alternate-reverse;opacity:.7}
#galassia .gx-drift{position:absolute;inset:0;animation:gxDrift 38s ease-in-out infinite alternate;will-change:transform}
#galassia.fermo .gx-drift{animation-play-state:paused}
#galassia .gx-stage{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
#galassia .gx-stage canvas{position:absolute;left:0;top:0}
#galassia .gx-pc{position:absolute;width:0;height:0;--c:140,220,255}
body.s-thinking #galassia .gx-pc{--c:255,200,90}body.s-listening #galassia .gx-pc{--c:120,255,200}body.s-alert #galassia .gx-pc{--c:255,160,60}body.s-error #galassia .gx-pc{--c:255,70,95}
#galassia .gx-pc i{position:absolute;left:-90px;top:-90px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,#fff 0,rgba(var(--c),.95) 9%,rgba(var(--c),.35) 26%,rgba(var(--c),0) 62%);animation:gxPulse 3.2s ease-in-out infinite}
body.s-thinking #galassia .gx-pc i{animation-duration:1.1s}
#galassia .gx-pc b{position:absolute;left:-260px;top:-1.5px;width:520px;height:3px;background:linear-gradient(90deg,rgba(var(--c),0),rgba(var(--c),.7),rgba(var(--c),0))}
#galassia .gx-pc em{position:absolute;left:-70px;top:-70px;width:140px;height:140px;border-radius:50%;border:1.5px solid rgba(var(--c),.55);border-left-color:transparent;border-right-color:transparent;animation:gxSpin 9s linear infinite}
#galassia .gx-pc em+em{left:-95px;top:-95px;width:190px;height:190px;border-color:rgba(var(--c),.3);border-top-color:transparent;border-bottom-color:transparent;animation-duration:14s;animation-direction:reverse}
#galassia .gx-pc u{position:absolute;left:-40px;top:-40px;width:80px;height:80px;border-radius:50%;border:2px solid rgba(var(--c),.6);opacity:0}
body.s-thinking #galassia .gx-pc u,body.s-speaking #galassia .gx-pc u{animation:gxOnda 2.2s ease-out infinite}
body.s-thinking #galassia .gx-pc u+u,body.s-speaking #galassia .gx-pc u+u{animation-delay:1.1s}
#galassia .gx-pc span{position:absolute;left:-120px;top:58px;width:240px;text-align:center;font:700 12px Orbitron,Rajdhani,sans-serif;letter-spacing:.2em;color:rgba(var(--c),.9)}
#galassia .gx-pc.flash i{animation:gxFlash .7s ease-out}
#galassia .gx-labels{position:absolute;inset:0}
#galassia .gx-dot{position:absolute;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:radial-gradient(circle,#fff,rgba(90,210,255,.9) 40%,rgba(90,210,255,0) 72%);animation:gxNasce .7s cubic-bezier(.2,.9,.25,1) both}
#galassia .gx-dot.d{width:14px;height:14px;margin:-7px 0 0 -7px;background:radial-gradient(circle,#fff,rgba(255,200,90,.95) 40%,rgba(255,200,90,0) 72%)}
#galassia .gx-dot span{position:absolute;left:14px;top:-3px;white-space:nowrap;font:500 11.5px "JetBrains Mono",Consolas,monospace;color:#bfeeff;text-shadow:0 0 6px #000}
#galassia .gx-dot.d span{color:#ffe2a0;font-weight:700}
#galassia .gx-lock{position:absolute;left:0;top:0;width:0;height:0;opacity:0;transition:opacity .4s}
#galassia.agganciato .gx-lock{opacity:1}
#galassia .gx-lock>i{position:absolute;border-radius:50%;border:1.5px solid rgba(255,200,90,.7);left:-34px;top:-34px;width:68px;height:68px;border-left-color:transparent;animation:gxSpin 4s linear infinite}
#galassia .gx-lock>i+i{left:-52px;top:-52px;width:104px;height:104px;border-color:rgba(255,200,90,.35);border-top-color:transparent;animation-duration:7s;animation-direction:reverse}
#galassia .gx-lock>i+i+i{left:-16px;top:-16px;width:32px;height:32px;border:0;background:radial-gradient(circle,#fff,rgba(255,220,150,.8) 35%,rgba(255,200,90,0) 70%);animation:gxPulse 1.4s ease-in-out infinite}
#galassia .gx-lock>b{position:absolute;left:-46px;top:-46px;width:92px;height:92px;
  background:linear-gradient(#fff,#fff) 0 0/14px 2px,linear-gradient(#fff,#fff) 0 0/2px 14px,linear-gradient(#fff,#fff) 100% 0/14px 2px,linear-gradient(#fff,#fff) 100% 0/2px 14px,
             linear-gradient(#fff,#fff) 0 100%/14px 2px,linear-gradient(#fff,#fff) 0 100%/2px 14px,linear-gradient(#fff,#fff) 100% 100%/14px 2px,linear-gradient(#fff,#fff) 100% 100%/2px 14px;background-repeat:no-repeat;opacity:.85}
#galassia .gx-call{position:absolute;left:44px;top:-74px;padding:6px 12px;border:1px solid rgba(255,200,90,.6);background:rgba(3,14,26,.72);white-space:nowrap;animation:gxCall .6s .2s cubic-bezier(.2,.9,.25,1) both}
#galassia .gx-call b{display:block;font:700 15px "JetBrains Mono",Consolas,monospace;color:#fff}
#galassia .gx-call small{font:500 9.5px Consolas,monospace;color:rgba(255,200,90,.95);letter-spacing:.06em}
#galassia .gx-warp{position:absolute;inset:-20%;opacity:0;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(170,225,255,0) 0deg 2.2deg,rgba(170,225,255,.22) 2.4deg 2.6deg);
  -webkit-mask-image:radial-gradient(circle,transparent 12%,#000 60%);mask-image:radial-gradient(circle,transparent 12%,#000 60%)}
#galassia.warp .gx-warp{animation:gxWarp 1.5s ease-in-out}
#galassia .gx-comet{position:absolute;left:0;top:0;animation:gxCometa var(--d,7s) cubic-bezier(.45,.05,.55,.95) forwards;will-change:transform}
#galassia .gx-comet i{position:absolute;left:-150px;top:-1.5px;width:160px;height:3px;transform:rotate(var(--a,0deg));transform-origin:150px 1.5px;background:linear-gradient(90deg,rgba(120,220,255,0),rgba(120,220,255,.4) 60%,#fff8e0)}
#galassia .gx-comet u{position:absolute;left:-10px;top:-10px;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle,#fff,rgba(255,235,190,.8) 35%,rgba(255,235,190,0) 70%)}
#galassia .gx-comet span{position:absolute;left:16px;top:-26px;white-space:nowrap;font:600 13px "JetBrains Mono",Consolas,monospace;color:#fff8e0;text-shadow:0 0 8px #000;animation:gxTesto var(--d,7s) linear forwards}
#galassia .gx-comet span small{display:block;font:500 10px Consolas,monospace;color:rgba(120,220,255,.9)}
#galassia .gx-comet.sx span{left:auto;right:16px;text-align:right}
@keyframes gxSky{to{transform:translate(-3%,2%) scale(1.06)}}
@keyframes gxStars{to{transform:translateX(-50%)}}
@keyframes gxTw{from{opacity:.55}to{opacity:1}}
@keyframes gxDrift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-1.2%,.8%) scale(1.025)}100%{transform:translate(1%,-.6%) scale(1.01)}}
@keyframes gxPulse{0%,100%{transform:scale(1);opacity:.92}50%{transform:scale(1.12);opacity:1}}
@keyframes gxFlash{0%{transform:scale(1.6)}100%{transform:scale(1)}}
@keyframes gxSpin{to{transform:rotate(360deg)}}
@keyframes gxOnda{0%{transform:scale(.6);opacity:.9}100%{transform:scale(4.2);opacity:0}}
@keyframes gxNasce{from{transform:translate(var(--dx,0),var(--dy,0)) scale(.2);opacity:0}to{transform:none;opacity:1}}
@keyframes gxCall{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
@keyframes gxWarp{0%{opacity:0;transform:scale(.6)}35%{opacity:1}100%{opacity:0;transform:scale(1.6)}}
@keyframes gxCometa{from{transform:translate(var(--x0),var(--y0))}to{transform:translate(var(--x1),var(--y1))}}
@keyframes gxTesto{0%{opacity:0}12%,85%{opacity:1}100%{opacity:0}}
`;
  document.head.appendChild(css);

  const root = document.createElement("div"); root.id = "galassia"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<div class="gx-sky"></div><div class="gx-stars a"></div><div class="gx-stars b"></div>
    <div class="gx-drift"><div class="gx-stage"><canvas class="gx-base"></canvas><canvas class="gx-over"></canvas>
      <div class="gx-pc"><i></i><b></b><em></em><em></em><u></u><u></u><span>NODO-01</span></div></div></div>
    <div class="gx-warp"></div><div class="gx-labels"></div><div class="gx-lock"><b></b><i></i><i></i><i></i></div><div class="gx-comets"></div>`;
  const neural = document.getElementById("neural"); hud.insertBefore(root, neural || hud.firstChild);
  const stage = root.querySelector(".gx-stage"), base = root.querySelector(".gx-base"), over = root.querySelector(".gx-over"), pcEl = root.querySelector(".gx-pc");
  const labels = root.querySelector(".gx-labels"), lock = root.querySelector(".gx-lock"), cometeEl = root.querySelector(".gx-comets");

  // ---------- cielo: nebulose e stelle disegnate una volta ----------
  (function cielo() {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 640; const x = c.getContext("2d");
    x.fillStyle = "#02050c"; x.fillRect(0, 0, 1024, 640);
    const col = [["40,90,200", .26], ["120,60,220", .2], ["20,160,190", .2], ["200,120,60", .08], ["70,40,160", .2]];
    for (let i = 0; i < 24; i++) {
      const [rgb, a] = col[i % col.length], px = rnd(0, 1024), py = rnd(60, 580), r = rnd(90, 300);
      const gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      x.fillStyle = gr; x.beginPath(); x.ellipse(px, py, r * 1.6, r * .7, rnd(-.6, .6), 0, TAU); x.fill();
    }
    root.querySelector(".gx-sky").style.backgroundImage = `url(${c.toDataURL("image/jpeg", .82)})`;
    for (const [sel, n, max] of [[".gx-stars.a", 260, 1.6], [".gx-stars.b", 120, 2.2]]) {
      const s = document.createElement("canvas"); s.width = 900; s.height = 700; const y = s.getContext("2d");
      for (let i = 0; i < n; i++) { const al = rnd(.35, 1); y.fillStyle = Math.random() < .15 ? `rgba(255,220,180,${al})` : `rgba(220,235,255,${al})`; y.beginPath(); y.arc(rnd(0, 900), rnd(0, 700), rnd(.4, max), 0, TAU); y.fill(); }
      root.querySelector(sel).style.backgroundImage = `url(${s.toDataURL("image/png")})`;
    }
  })();

  // ---------- struttura della galassia (forma stabile) ----------
  const nodi = [], perPath = new Map();
  function seed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
  function aggiungi(p, n, d, par) {
    const k = key(p); if (perPath.has(k)) return perPath.get(k);
    const P = par != null && par >= 0 ? nodi[par] : null, r = seed(k), depth = P ? P.depth + 1 : 0;
    let dir;
    if (!P) dir = [0, 0, 0];
    else if (depth === 1) { const i = P.kids.length, a = i * 2.39996, y = 1 - ((i * .37) % 1) * 2, rr = Math.sqrt(Math.max(0, 1 - y * y)); dir = [Math.cos(a) * rr, y * .55, Math.sin(a) * rr]; }
    else { const v = [P.dir[0] * .8 + (r() - .5) * 1.3, P.dir[1] * .8 + (r() - .5) * 1.1, P.dir[2] * .8 + (r() - .5) * 1.3]; const L = Math.hypot(...v) || 1; dir = v.map(x => x / L); }
    const dist = P ? (d ? 260 / (1 + depth * .42) : 72 / (1 + depth * .15)) * (.75 + r() * .5) : 0;
    nodi.push({ p, n, d, par: P ? par : -1, depth, dir, kids: [], x: P ? P.x + dir[0] * dist : 0, y: P ? P.y + dir[1] * dist : 0, z: P ? P.z + dir[2] * dist : 0, bx: 0, by: 0, nuovo: false });
    const i = nodi.length - 1; perPath.set(k, i); if (P) P.kids.push(i); return i;
  }
  function trovaOCrea(path, isDir) {
    const k = key(path); if (perPath.has(k)) return perPath.get(k);
    const parts = String(path).replace(/\//g, "\\").split("\\").filter(Boolean);
    let i = parts.length - 1, b = -1;
    for (; i > 0; i--) { const pk = key(parts.slice(0, i).join("\\")); if (perPath.has(pk)) { b = perPath.get(pk); break; } }
    if (b < 0) b = 0;
    for (let j = i; j < parts.length; j++) b = aggiungi(parts.slice(0, j + 1).join("\\"), parts[j], j < parts.length - 1 || isDir, b);
    return b;
  }

  // ---------- disegno della galassia: UNA volta (o quando cambiano i nodi) ----------
  const DPR = Math.min(1.5, window.devicePixelRatio || 1);
  let BW = 1800, BH = 1100; const sprites = {};
  function sprite(rgb) { if (sprites[rgb]) return sprites[rgb]; const c = document.createElement("canvas"); c.width = c.height = 48; const x = c.getContext("2d"); const gr = x.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, "#fff"); gr.addColorStop(.15, `rgba(${rgb},.95)`); gr.addColorStop(.4, `rgba(${rgb},.3)`); gr.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = gr; x.fillRect(0, 0, 48, 48); return sprites[rgb] = c; }
  function proietta() {
    const yaw = .6, pitch = .42, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    let mx = 0, my = 0, mz = 0; nodi.forEach(n => { mx += n.x; my += n.y; mz += n.z; }); mx /= nodi.length; my /= nodi.length; mz /= nodi.length;
    let R = 1; nodi.forEach(n => { R = Math.max(R, Math.hypot(n.x - mx, n.y - my, n.z - mz)); });
    const D = R * 2.4; const pts = nodi.map(n => { const x = n.x - mx, y = n.y - my, z = n.z - mz; const x1 = x * cy - z * sy, z1 = x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + D; const s = D / Math.max(D * .3, z2); return [x1 * s, y1 * s, s]; });
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    const pad = 140, w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), k = Math.min(1700 / w, 1100 / h, 3);
    BW = Math.round(w * k + pad * 2); BH = Math.round(h * k + pad * 2);
    nodi.forEach((n, i) => { n.bx = (pts[i][0] - x0) * k + pad; n.by = (pts[i][1] - y0) * k + pad; n.prof = pts[i][2]; });
  }
  function disegna() {
    if (!nodi.length) return;
    proietta();
    for (const c of [base, over]) { c.width = BW * DPR; c.height = BH * DPR; c.style.width = BW + "px"; c.style.height = BH + "px"; }
    const g = base.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, BW, BH);
    g.globalCompositeOperation = "lighter"; g.lineWidth = 1;
    for (const [col, f] of [["rgba(255,200,90,.16)", n => n.d], ["rgba(90,210,255,.09)", n => !n.d]]) {
      g.strokeStyle = col; g.beginPath();
      for (const n of nodi) { if (n.par < 0 || !f(n) || n.nuovo) continue; const P = nodi[n.par]; g.moveTo(P.bx, P.by); g.lineTo(n.bx, n.by); }
      g.stroke();
    }
    for (let i = 1; i < nodi.length; i++) {
      const n = nodi[i]; if (n.nuovo) continue; const r = (n.d ? (n.depth <= 1 ? 9 : 6.5) : 3.4) * Math.min(1.4, Math.max(.7, n.prof || 1));
      g.globalAlpha = n.depth > 3 ? .6 : .9; g.drawImage(sprite(n.d ? "255,200,90" : "90,210,255"), n.bx - r * 3, n.by - r * 3, r * 6, r * 6);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    g.font = "700 13px 'JetBrains Mono', Consolas, monospace";
    for (const n of nodi) if (n.d && n.depth >= 1 && n.depth <= 2 && !n.nuovo) { g.fillStyle = n.depth === 1 ? "rgba(255,230,170,.95)" : "rgba(255,225,160,.7)"; g.fillText("▸ " + n.n.slice(0, 26), n.bx + 12, n.by + 4); }
    const P0 = nodi[0]; pcEl.style.transform = `translate(${P0.bx}px,${P0.by}px)`;
    pcEl.querySelector("span").textContent = "NODO-01 · " + String(P0.n || "PC").toUpperCase();
    over.getContext("2d").clearRect(0, 0, over.width, over.height);
    if (focus == null) riposo(0);
  }

  // ---------- telecamera (solo transform: lavora la scheda video) ----------
  let W = innerWidth, H = innerHeight, focus = null, ultimaAzione = 0, giro = null;
  const cam = { tx: 0, ty: 0, s: 1 };
  function ancora(visione) {
    if (CFG.ancora) return CFG.ancora(visione);
    if (visione) return [W * .28, H * .5];
    const box = document.querySelector(".map-area"); const r = box ? box.getBoundingClientRect() : null;
    return r && r.width ? [r.left + r.width / 2, r.top + r.height * .45] : [W / 2, H * .45];
  }
  function muovi(tx, ty, s, ms) {
    cam.tx = tx; cam.ty = ty; cam.s = s;
    stage.style.transition = ms ? `transform ${ms}ms cubic-bezier(.65,.02,.2,1)` : "none";
    stage.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
  }
  function riposo(ms) {
    if (!nodi.length) return;
    const P0 = nodi[0], [ax, ay] = ancora(false);
    const s = Math.min(W * .95 / BW, H * .92 / BH) * (CFG.zoom || 1);
    const cx = lerp(P0.bx, BW / 2, .45), cy = lerp(P0.by, BH / 2, .45);
    muovi(ax - cx * s, ay - cy * s, s, ms);
  }
  function suSchermo(n) { return [cam.tx + n.bx * cam.s, cam.ty + n.by * cam.s]; }
  addEventListener("resize", () => { W = innerWidth; H = innerHeight; if (focus == null) riposo(0); });

  function pulisciFocus() { labels.innerHTML = ""; root.classList.remove("agganciato", "fermo"); const c = lock.querySelector(".gx-call"); if (c) c.remove(); over.getContext("2d").clearRect(0, 0, over.width, over.height); }
  function percorso(i) {   // il percorso dal PC alla cartella, disegnato una volta sul livello sopra
    const g = over.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, BW, BH); g.lineCap = "round";
    for (const [w, a] of [[6, .15], [2, .95]]) { g.strokeStyle = `rgba(255,200,90,${a})`; g.lineWidth = w; g.beginPath(); for (let j = i; nodi[j] && nodi[j].par >= 0; j = nodi[j].par) { const n = nodi[j], P = nodi[n.par]; g.moveTo(P.bx, P.by); g.lineTo(n.bx, n.by); } g.stroke(); }
  }
  function aggancia(i, conFigli) {   // dopo il volo: mirino, nome e figli che nascono (elementi animati dalla scheda video)
    const n = nodi[i]; if (!n) return;
    const [sx, sy] = suSchermo(n);
    lock.style.transform = `translate(${sx}px,${sy}px)`; root.classList.add("agganciato");
    const vecchio = lock.querySelector(".gx-call"); if (vecchio) vecchio.remove();
    const call = document.createElement("div"); call.className = "gx-call";
    call.innerHTML = `<b>${n.d ? "▣" : "▤"} ${esc(n.n)}</b><small>${n.d ? "CARTELLA" : "FILE"} · LIVELLO ${n.depth} · ${n.kids.length} ELEMENTI</small>`;
    if (sx > W - 330) { call.style.left = "auto"; call.style.right = "44px"; } lock.appendChild(call);
    if (!conFigli) return;
    n.kids.slice(0, 40).forEach((ki, q) => {
      const c = nodi[ki], [cx, cy] = suSchermo(c);
      if (cx < -20 || cy < -20 || cx > W + 20 || cy > H + 20) return;
      const el = document.createElement("div"); el.className = "gx-dot" + (c.d ? " d" : "");
      el.style.left = cx + "px"; el.style.top = cy + "px"; el.style.setProperty("--dx", (sx - cx) + "px"); el.style.setProperty("--dy", (sy - cy) + "px"); el.style.animationDelay = (q * 45) + "ms";
      el.innerHTML = q < 18 ? `<span>${esc(c.n.slice(0, 28))}</span>` : ""; labels.appendChild(el);
    });
  }

  // ---------- mappa ----------
  let caricando = false;
  async function carica() {
    if (caricando || nodi.length > 2 || typeof api !== "function") return; caricando = true;
    try { const d = await api("/mappa"); (d.nodi || []).forEach(n => aggiungi(n.p, n.n, n.d, n.a)); }
    catch (e) { /* senza mappa la galassia nasce dalle azioni */ }
    finally { caricando = false; if (!nodi.length) aggiungi("C:\\Users", "PC", true, -1); disegna(); }
  }
  if (!CFG.contenitore) new MutationObserver(() => { if (!hud.hidden) { W = innerWidth; H = innerHeight; if (nodi.length < 3) carica(); else riposo(0); } }).observe(hud, { attributes: true, attributeFilter: ["hidden"] });

  // a riposo, ogni tanto la telecamera va a guardare una cartella (un solo movimento, niente calcoli continui)
  setInterval(() => {
    if (focus != null || document.hidden || hud.hidden || Date.now() - ultimaAzione < 30000 || !nodi.length) return;
    if (/\bs-(thinking|listening|speaking)\b/.test(document.body.className) || Math.random() < .5) return;
    const dirs = nodi.map((n, i) => n.d && n.depth >= 2 && n.kids.length ? i : -1).filter(i => i >= 0); if (!dirs.length) return;
    giro = dirs[(Math.random() * dirs.length) | 0]; const n = nodi[giro], [ax, ay] = ancora(false), s = Math.min(1.4, cam.s * 2.2);
    root.classList.add("fermo"); muovi(ax - n.bx * s, ay - n.by * s, s, 2600);
    setTimeout(() => { if (focus == null && giro != null) aggancia(giro, false); }, 2700);
    setTimeout(() => { if (focus == null) { giro = null; pulisciFocus(); riposo(2600); } }, 9000);
  }, 45000);

  function lampo() { pcEl.classList.remove("flash"); void pcEl.offsetWidth; pcEl.classList.add("flash"); }
  window.GALASSIA = {
    /* vola sul percorso dell'azione; restituisce dopo quanti ms mostrare il pannello */
    vai(d) {
      if (!d || !d.path || !nodi.length) return 0;
      const p = String(d.path).replace(/^avvio |^python |^registro /, "");
      if (!/^[a-z]:\\|^\\\\|^\//i.test(p)) return 0;
      const isDir = d.tipo === "cartella" || d.tipo === "ricerca", prima = nodi.length;
      const i = trovaOCrea(p, isDir);
      if (d.tipo === "cartella" && d.items) d.items.slice(0, 60).forEach(x => { const j = aggiungi(p.replace(/\\+$/, "") + "\\" + x.n, x.n, !!x.d, i); if (j >= prima) nodi[j].nuovo = true; });
      const lontano = focus !== i;
      focus = i; giro = null; ultimaAzione = Date.now(); pulisciFocus(); root.classList.add("fermo");
      if (nodi.length !== prima) disegna();
      const n = nodi[i], [ax, ay] = ancora(true);
      const s = Math.min(n.d ? 1.6 : 2.2, Math.max(cam.s * 2.6, .9)) * (CFG.zoom ? Math.sqrt(CFG.zoom) : 1);
      percorso(i);
      if (lontano) { root.classList.remove("warp"); void root.offsetWidth; root.classList.add("warp"); setTimeout(() => root.classList.remove("warp"), 1600); }
      const ms = lontano ? 1500 : 700;
      muovi(ax - n.bx * s, ay - n.by * s, s, ms);
      setTimeout(() => { if (focus === i) aggancia(i, d.tipo === "cartella"); }, ms);
      lampo();
      return ms;
    },
    torna() {
      focus = null; ultimaAzione = Date.now(); pulisciFocus();
      if (nodi.some(n => n.nuovo)) { nodi.forEach(n => n.nuovo = false); disegna(); }
      riposo(1800);
    },
    carica(dati) {   // il telefono passa la mappa ricevuta dal PC
      if (dati && dati.nodi && dati.nodi.length) { nodi.length = 0; perPath.clear(); dati.nodi.forEach(n => aggiungi(n.p, n.n, n.d, n.a)); disegna(); return true; }
      return carica();
    },
    radice(nome) { if (!nodi.length) { aggiungi("C:\\" + (nome || "PC"), nome || "PC", true, -1); disegna(); } },
    cometa(testo, fonte) {
      if (!testo) return; const da = Math.random() < .5, y0 = rnd(H * .12, H * .5), y1 = y0 + rnd(-H * .12, H * .18);
      const x0 = da ? -60 : W + 60, x1 = da ? W + 60 : -60, a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
      const dur = W < 600 ? 6 : 8, ritardo = cometeEl.children.length * 1.6;
      const el = document.createElement("div"); el.className = "gx-comet" + (da ? "" : " sx");
      el.style.cssText = `--x0:${x0}px;--y0:${y0}px;--x1:${x1}px;--y1:${y1}px;--a:${a}deg;--d:${dur}s;transform:translate(${x0}px,${y0}px);animation-delay:${ritardo}s`;
      el.querySelector && (el.innerHTML = `<i></i><u></u><span style="animation-delay:${ritardo}s">📰 ${esc(String(testo).slice(0, W < 600 ? 44 : 90))}<small>${esc(fonte || "")}</small></span>`);
      cometeEl.appendChild(el); setTimeout(() => el.remove(), (dur + ritardo) * 1000 + 500);
      lampo();
    },
    get nodi() { return nodi.length; },
  };
  // il resto dell'interfaccia parla con la stella del PC
  if (!window.NEURAL) window.NEURAL = {
    flash: lampo, level: 0, relayout() { W = innerWidth; H = innerHeight; if (focus == null) riposo(0); }, look() {}, beam() {},
    core() { const r = pcEl.getBoundingClientRect(); return { x: r.left, y: r.top, r: 40 }; },
  };
  setTimeout(() => { if (!nodi.length && CFG.contenitore) window.GALASSIA.radice("PC"); }, 50);
})();
