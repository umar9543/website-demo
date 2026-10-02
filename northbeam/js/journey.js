/* Northbeam: the building journey, all real photography, no WebGL (works from file:// and on phones).
   Exterior in its real surroundings → floors pull apart (x-ray) → dive through a Level 12 balcony door →
   living → dining → bedroom → study (real 360° rooms as CSS 3D cubes) → section → foundations → night. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const small = innerWidth < 760;

  /* ---------- the tower photo (media/tower.jpg, 2400 × 1600) ---------- */
  const IW = 2400, IH = 1600;
  const X0 = 900, X1 = 1545, CROWN = 340, ROOF = 488, PITCH = 39.5, FLOORS = 21;
  const slabY = k => ROOF + k * PITCH;
  const PIERS = [935, 980, 1145, 1210, 1290, 1392, 1495];
  const BAYS = [[990, 1138], [1152, 1204], [1218, 1284], [1298, 1386], [1400, 1488]];
  const FOCUS = { x: 1342, y: slabY(8) + 20 };          // the balcony door we walk through
  const BANDS = [[CROWN, ROOF]];                           // crown + 3-floor bands, top to bottom
  for (let k = 0; k < FLOORS; k += 3) BANDS.push([slabY(k), Math.min(slabY(k + 3), 1330)]);

  const ext = $('#jExt'), frame = $('#jFrame'), towerEl = $('#jBase'), base = $('#jCanvas'), bctx = base.getContext('2d', { alpha: false }), strips = $('#jStrips'), xray = $('#jXray'), night = $('#jNight');
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };

  // floor bands that lift apart, each a window onto the same photo
  const bandEls = BANDS.map(([y0, y1]) => {
    const d = document.createElement('div');
    d.className = 'j-band';
    Object.assign(d.style, { left: (X0 - 10) + 'px', top: y0 + 'px', width: (X1 - X0 + 20) + 'px', height: (y1 - y0) + 'px', backgroundPosition: `-${X0 - 10}px -${y0}px` });
    const s = svgEl('svg', { viewBox: `0 0 ${X1 - X0 + 20} ${y1 - y0}`, preserveAspectRatio: 'none', class: 'j-band__x' }, d);
    for (let k = 0; k <= FLOORS; k++) { const y = slabY(k) - y0; if (y > 0 && y < y1 - y0) svgEl('path', { d: `M0 ${y}H${X1 - X0 + 20}`, class: 'jx' }, s); }
    PIERS.forEach(x => svgEl('path', { d: `M${x - X0 + 10} 0V${y1 - y0}`, class: 'jx jx--soft' }, s));
    strips.appendChild(d);
    return d;
  });
  // static x-ray annotations (in photo coordinates)
  const xLines = [];
  const xl = (d, cls, order) => { const e = svgEl('path', { d, class: 'jx ' + cls, pathLength: 1 }, xray); xLines.push({ e, order }); };
  xl(`M${X0} ${slabY(FLOORS)}V${CROWN}H${X1}V${slabY(FLOORS)}`, 'jx--draw', 0);
  xl(`M${X0 - 60} ${slabY(FLOORS)}V${CROWN}M${X0 - 80} ${CROWN}H${X0 - 40}M${X0 - 80} ${slabY(FLOORS)}H${X0 - 40}`, 'jx--draw jx--soft', 0.2);
  xl(`M${FOCUS.x - 44} ${FOCUS.y - 20}h88v38h-88z`, 'jx--draw jx--amber', 0.6);
  const xLabels = [
    svgEl('text', { x: X1 + 30, y: CROWN + 30 }, xray), svgEl('text', { x: X1 + 30, y: FOCUS.y + 8, class: 'jt-amber' }, xray),
    svgEl('text', { x: X1 + 30, y: slabY(18) + 8 }, xray), svgEl('text', { x: X0 - 100, y: (CROWN + slabY(FLOORS)) / 2, transform: `rotate(-90 ${X0 - 100} ${(CROWN + slabY(FLOORS)) / 2})`, 'text-anchor': 'middle' }, xray)
  ];
  ['ROOF +68.2', 'L12 · ENTRY', 'L03 +9.3', '22 STOREYS · 68.2 m'].forEach((t, i) => (xLabels[i].textContent = t));

  // night: real balcony bays lit at random
  night.innerHTML = '<defs><linearGradient id="warm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0a8"/><stop offset="1" stop-color="#e98a3a"/></linearGradient>' +
    '<linearGradient id="cool" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f0ff"/><stop offset="1" stop-color="#8fa9d6"/></linearGradient></defs>';
  { let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < FLOORS - 1; k++) BAYS.forEach(([a, b]) => {
      if (r() > 0.55) return;
      // one or two lit rooms per bay, warm or cool, glowing from behind the balcony line
      const parts = r() < 0.5 ? [[a, b]] : [[a, (a + b) / 2 - 2], [(a + b) / 2 + 2, b]];
      parts.forEach(([x0, x1]) => { if (r() < 0.25) return;
        svgEl('rect', { x: x0 + 4, y: slabY(k) + 9, width: x1 - x0 - 8, height: PITCH - 20, rx: 2, fill: r() < 0.8 ? 'url(#warm)' : 'url(#cool)', opacity: (0.35 + r() * 0.5).toFixed(2) }, night); });
    }); }

  let vw = innerWidth, vh = innerHeight;
  function placeExterior(Z, focusT) {
    const s0 = Math.max(vw / IW, vh / IH);
    const s = s0 * Z;
    const cx = vw / 2 + (FOCUS.x - IW / 2) * s0, cy = vh / 2 + (FOCUS.y - IH / 2) * s0;   // where the focus sits at rest (cover-fit)
    const fx = lerp(cx, vw / 2, focusT), fy = lerp(cy, vh / 2, focusT);
    const tx = fx - FOCUS.x * s, ty = fy - FOCUS.y * s;
    // The photo itself is painted on a viewport-sized canvas. Scaling a DOM image 45x makes a layer far too
    // large for the browser to paint, which showed up as black, half-drawn areas when scrolling back.
    const key = `${tx.toFixed(1)},${ty.toFixed(1)},${s.toFixed(4)},${vw},${vh}`;
    if (key !== lastKey && towerEl.complete && towerEl.naturalWidth) {
      lastKey = key;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (base.width !== Math.round(vw * dpr) || base.height !== Math.round(vh * dpr)) { base.width = Math.round(vw * dpr); base.height = Math.round(vh * dpr); }
      bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.fillStyle = '#0b0d11'; bctx.fillRect(0, 0, base.width, base.height);
      bctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * tx, dpr * ty);
      bctx.imageSmoothingQuality = 'high'; bctx.drawImage(towerEl, 0, 0, IW, IH);
    }
    // overlays (x-ray lines, floor bands, lit windows) only exist at low zoom, so the DOM frame never gets large
    const overlays = Z < 4.5;
    frame.style.visibility = overlays ? 'inherit' : 'hidden';
    if (overlays) frame.style.transform = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(5)})`;
  }
  let lastKey = '';

  /* ---------- 360° rooms as CSS 3D cubes ---------- */
  const FACES = ['front', 'right', 'back', 'left', 'top', 'bottom'];
  const pano = $('#jPano');
  function makeCube() {
    const v = document.createElement('div'); v.className = 'j-view';
    const c = document.createElement('div'); c.className = 'j-cube';
    const imgs = FACES.map(f => { const i = document.createElement('img'); i.className = 'j-face j-face--' + f; i.alt = ''; i.decoding = 'async'; c.appendChild(i); return i; });
    v.appendChild(c); pano.appendChild(v); return { el: c, view: v, imgs, room: null };
  }
  const cubes = [makeCube(), makeCube()];
  function setRoom(cube, room) {
    if (cube.room === room) return;
    cube.room = room;
    cube.imgs.forEach((im, i) => (im.src = `media/rooms/${room}${small ? '-m' : ''}-${FACES[i]}.jpg`));
  }
  // preload both rooms
  ['cayley_interior', 'hotel_room'].forEach(r => FACES.forEach(f => { const i = new Image(); i.src = `media/rooms/${r}${small ? '-m' : ''}-${f}.jpg`; }));
  const S = 1024; // face size in CSS px
  function viewCube(cube, yawU, pitch, fov, opacity) {
    const P = (vh / 2) / Math.tan((fov * Math.PI / 180) / 2);
    cube.view.style.perspective = P.toFixed(1) + 'px';
    cube.view.style.opacity = opacity;
    cube.view.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
    cube.el.style.transform = `translateZ(${P.toFixed(1)}px) rotateX(${pitch}deg) rotateY(${((yawU - 0.5) * 360).toFixed(3)}deg)`;
    return P;
  }

  /* ---------- the timeline ---------- */
  // rooms: [room, from, to, yawFrom, yawTo, pitch]  (yaw in panorama "u": 0.5 = photo centre)
  const ROOMS = [
    ['cayley_interior', 0.29, 0.38, 0.985, 1.06, -6],    // living: lounge, kitchen beyond
    ['cayley_interior', 0.38, 0.47, 1.06, 1.19, -12],    // dining: turn to the table
    ['hotel_room', 0.5, 0.59, 0.6, 0.73, -10],           // bedroom
    ['hotel_room', 0.59, 0.68, 0.73, 1.24, -8]           // study: turn to the desk
  ];
  const photos = { section: $('#jSection'), piles: $('#jPiles') };
  const dusk = $('#jDusk'), flash = $('#jFlash');
  const caps = [...document.querySelectorAll('.j-cap')].map(c => ({ el: c, a: +c.dataset.from, b: +c.dataset.to }));
  const hudLayer = $('#jhLayer'), hudWhere = $('#jhWhere'), hudBar = $('#jhBar');
  const LAYERS = [[0.07, 'Exterior', 'Street'], [0.2, 'Structure', '22 floors'], [0.29, 'Façade', 'Level 12'], [0.38, 'Living', 'L12'], [0.48, 'Dining', 'L12'], [0.59, 'Bedroom', 'L12'], [0.69, 'Study', 'L12'], [0.8, 'Section', 'All floors'], [0.9, 'Foundations', '−18 m'], [1.01, 'Night', 'Street']];

  const track = $('#journey');
  let p = 0, last = performance.now();
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; });
  const stage = $('#jStage');

  function frameLoop(now) {
    requestAnimationFrame(frameLoop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const r = track.getBoundingClientRect();
    const target = clamp(-r.top / Math.max(1, r.height - vh));
    p += (target - p) * (1 - Math.exp(-dt * 7));
    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 3)); mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 3));
    const onScreen = r.bottom > 0;
    document.body.classList.toggle('past-journey', r.bottom < vh * 0.6);
    stage.style.visibility = onScreen ? 'visible' : 'hidden';
    if (!onScreen) return;

    /* exterior */
    const xr = ease(range(p, 0.07, 0.12)) * (1 - ease(range(p, 0.165, 0.2)));
    const dive = range(p, 0.2, 0.29), back = range(p, 0.9, 0.975);
    let Z, focusT, extO;
    if (p < 0.9) {
      Z = lerp(1, 1.08, range(p, 0, 0.07)) * lerp(1, 0.95, xr) * Math.pow(45, Math.pow(dive, 1.6));
      focusT = Math.max(xr * 0.15, ease(range(p, 0.18, 0.24)));
      extO = 1 - range(p, 0.265, 0.295);
    } else {
      // modest zoom on the way back: a 30x layer is too large for the browser to paint
      Z = Math.pow(3, Math.pow(1 - easeOut(back), 1.3)); focusT = 1 - ease(range(p, 0.93, 0.99)); extO = range(p, 0.9, 0.925);
    }
    placeExterior(Z, focusT);
    ext.style.opacity = extO; ext.style.visibility = extO > 0.001 ? 'visible' : 'hidden';
    const isNight = p > 0.85;
    base.style.filter = isNight ? 'brightness(.32) saturate(.7) contrast(1.1)' : `brightness(${(1 - xr * 0.68).toFixed(3)}) saturate(${(1 - xr * 0.6).toFixed(3)})`;
    strips.style.opacity = xr > 0.001 ? 1 : 0;
    bandEls.forEach((b, j) => { b.style.transform = `translateY(${(-(BANDS.length - 1 - j) * 36 * xr).toFixed(2)}px)`; });
    strips.style.setProperty('--xr', xr.toFixed(3));
    xray.style.opacity = xr > 0.001 || (p > 0.12 && p < 0.25) ? 1 : 0;
    const xd = range(p, 0.08, 0.17), xOut = 1 - range(p, 0.215, 0.25);
    xLines.forEach(l => (l.e.style.strokeDashoffset = 1 - clamp((xd - l.order * 0.5) / 0.5) * xOut));
    xLabels.forEach((t, i) => (t.style.opacity = clamp((xd - 0.4 - i * 0.1) * 4) * xOut));
    dusk.style.opacity = isNight ? 0.75 : 0;
    night.style.opacity = isNight ? 1 : 0;
    flash.style.opacity = (Math.sin(range(p, 0.255, 0.31) * Math.PI) * 0.5).toFixed(3);

    /* rooms */
    const roomsOn = p > 0.255 && p < 0.72;
    pano.style.visibility = roomsOn ? 'visible' : 'hidden';
    if (!roomsOn) cubes.forEach(c => (c.view.style.visibility = 'hidden'));   // children would otherwise stay visible
    if (roomsOn) {
      let i = 0; while (i < ROOMS.length - 1 && p > ROOMS[i][2]) i++;
      const [room, a, b, y0, y1, pitch] = ROOMS[i];
      const local = ease(range(p, a, b));
      const baseFov = small ? 92 : 76;
      let fov = baseFov;
      if (i === 0) fov = lerp(26, baseFov, easeOut(range(p, 0.265, 0.33)));   // arriving through the door
      // hand-over between the two apartments: zoom in on A, B settles from wide
      const swap = range(p, 0.47, 0.5), toPhoto = range(p, 0.68, 0.71);
      setRoom(cubes[0], swap < 1 ? 'cayley_interior' : 'hotel_room');
      const yaw = lerp(y0, y1, local) + mouse.sx * 0.01, pit = pitch - mouse.sy * 3;
      if (swap > 0 && swap < 1) {
        const R0 = ROOMS[1], R1 = ROOMS[2];
        setRoom(cubes[1], 'hotel_room');
        viewCube(cubes[0], R0[4], R0[5], lerp(baseFov, baseFov * 0.45, ease(swap)), 1);
        viewCube(cubes[1], R1[3], R1[5], lerp(baseFov * 1.3, baseFov, ease(swap)), ease(swap));
      } else {
        viewCube(cubes[0], yaw, pit, lerp(fov, fov * 0.5, ease(toPhoto)), 1);
        cubes[1].view.style.visibility = 'hidden';
      }
      pano.style.filter = (swap > 0 && swap < 1) || toPhoto > 0 ? `blur(${(Math.sin(Math.max(swap, toPhoto) * Math.PI) * 3).toFixed(2)}px)` : (p < 0.31 ? `blur(${((1 - range(p, 0.27, 0.31)) * 4).toFixed(2)}px)` : 'none');
    }

    /* section + foundations (real photos, slow camera moves) */
    const sec = range(p, 0.68, 0.71) * (1 - range(p, 0.79, 0.81));
    photos.section.style.opacity = sec; photos.section.style.visibility = sec > 0.001 ? 'visible' : 'hidden';
    photos.section.style.transform = `scale(${lerp(1.25, 1.05, ease(range(p, 0.68, 0.81))).toFixed(4)}) translateY(${lerp(-4, 5, ease(range(p, 0.69, 0.81))).toFixed(2)}%)`;
    const pil = range(p, 0.79, 0.81) * (1 - range(p, 0.895, 0.915));
    photos.piles.style.opacity = pil; photos.piles.style.visibility = pil > 0.001 ? 'visible' : 'hidden';
    photos.piles.style.transform = `scale(${lerp(1.02, 1.22, ease(range(p, 0.79, 0.91))).toFixed(4)})`;

    /* captions + HUD */
    caps.forEach(c => { const k = clamp((p - c.a) / 0.012) * clamp((c.b - p) / 0.012); c.el.style.opacity = k.toFixed(3); c.el.style.visibility = k > 0.001 ? 'visible' : 'hidden'; });
    const L = LAYERS.find(l => p < l[0]) || LAYERS[LAYERS.length - 1];
    hudLayer.textContent = L[1]; hudWhere.textContent = L[2]; hudBar.style.width = (p * 100).toFixed(1) + '%';
    document.documentElement.style.setProperty('--jp', p.toFixed(4));
  }

  // tell the page loader when the first view is ready
  const towerImg = $('#jBase');
  window.NBJourneyReady = new Promise(res => { if (towerImg.complete) res(); else { towerImg.onload = res; towerImg.onerror = res; } });
  requestAnimationFrame(frameLoop);
})();
