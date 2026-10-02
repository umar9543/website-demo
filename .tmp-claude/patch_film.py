import re
css_p = r'E:/React/wordpress/construction/css/style.css'
t = open(css_p, encoding='utf8').read()
a = '/* Stage */\n#stage { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100lvh; z-index: 0; }'
assert a in t
t = t.replace(a, '''/* Footage stack (scrubbed by scroll) */
.film { position: fixed; inset: 0; height: 100lvh; z-index: 0; overflow: hidden; background: var(--ink); }
.film__clip { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0;
  filter: saturate(.92) contrast(1.06) brightness(.92); will-change: opacity, transform; }
.film__clip:first-child { opacity: 1; }
.film__grain { position: absolute; inset: -50%; pointer-events: none; opacity: .09; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: grain 1s steps(6) infinite; }
@keyframes grain { 0% { transform: translate(0, 0); } 33% { transform: translate(-6%, 4%); } 66% { transform: translate(5%, -3%); } 100% { transform: translate(-2%, 6%); } }''')
t = t.replace(".no-webgl #stage { display: none; }\n", "")
open(css_p, 'w', encoding='utf8').write(t)

js_p = r'E:/React/wordpress/construction/js/main.js'
t = open(js_p, encoding='utf8').read()
a = t.index('  /* ---------- 3D build ---------- */'); b = t.index('  /* ---------- Nav ---------- */')
new = r'''  /* ---------- Real footage, scrubbed by scroll ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, '0');
  const story = $('#story');
  const chapters = $$('.chapter', story);
  const clips = $$('.film__clip');
  const PHASES = ['Site', 'Pre-construction', 'Groundworks', 'Structural frame', 'Envelope', 'Handover'];
  const FLOORS = 14, WEEKS = 86;
  const small = innerWidth < 860;
  let loadPct = 0;

  // Sources: lighter encodes on phones. Hero loads first, the rest queue behind it.
  clips.forEach(v => { v.src = `media/${v.dataset.clip}${small ? '-m' : ''}.mp4`; });
  const hero = clips[0];
  hero.play().catch(() => {});
  let loadedCount = 0;
  const markLoaded = () => { loadedCount++; loadPct = loadedCount / clips.length; };
  hero.addEventListener('canplay', markLoaded, { once: true });
  (async function queue() {
    for (const v of clips.slice(1)) {
      v.preload = 'auto'; v.load();
      await new Promise(res => { const done = () => { markLoaded(); res(); }; v.addEventListener('canplaythrough', done, { once: true }); v.addEventListener('error', done, { once: true }); setTimeout(done, 15000); });
    }
  })();
  // iOS only seeks videos that have started once: prime them on the first touch.
  addEventListener('touchstart', () => clips.slice(1).forEach(v => v.play().then(() => v.pause()).catch(() => {})), { once: true, passive: true });

  const geo = { tops: [], hs: [], vh: innerHeight };
  function measure() {
    geo.vh = innerHeight;
    chapters.forEach((ch, i) => { const r = ch.getBoundingClientRect(); geo.tops[i] = r.top + scrollY; geo.hs[i] = r.height; });
  }
  measure();
  ScrollTrigger.addEventListener('refresh', measure);

  const want = clips.map(() => 0);           // target time per clip
  const shown = clips.map(() => 0);          // smoothed time per clip
  let heroPlaying = true;

  function update() {
    const y = scrollY, vh = geo.vh, n = chapters.length;
    // crossfade: each chapter's footage rises over the previous one as it scrolls in
    clips.forEach((v, i) => {
      const fade = i === 0 ? 1 : clamp((y - (geo.tops[i] - vh * 0.85)) / (vh * 0.55));
      const next = i < n - 1 ? clamp((y - (geo.tops[i + 1] - vh * 0.3)) / (vh * 0.3)) : 0;
      const visible = fade > 0 && next < 1;
      v.style.opacity = fade;
      v.style.visibility = visible || i === 0 ? 'visible' : 'hidden';
      // local progress through the chapter drives the clip's time
      const z = clamp((y - (geo.tops[i] - vh * 0.85)) / (geo.hs[i] + vh * 0.55));
      v.style.transform = `scale(${(1.08 - z * 0.08).toFixed(4)})`;
      if (i > 0 && v.duration) want[i] = z * (v.duration - 0.05);
    });
    // hero keeps playing at the top, freezes once the story starts
    const playHero = y < vh * 0.6;
    if (playHero !== heroPlaying) { heroPlaying = playHero; playHero ? hero.play().catch(() => {}) : hero.pause(); }

    for (let i = 1; i < clips.length; i++) {
      const v = clips[i];
      if (v.style.visibility === 'hidden' || !v.duration || v.readyState < 1) continue;
      shown[i] += (want[i] - shown[i]) * 0.18;
      if (!v.seeking && Math.abs(v.currentTime - shown[i]) > 0.04) v.currentTime = shown[i];
    }

    // HUD
    const storyEnd = geo.tops[n - 1] + geo.hs[n - 1] - vh;
    const pct = Math.round(clamp(y / storyEnd) * 100);
    let phase = 0;
    for (let k = 1; k < n; k++) if (y >= geo.tops[k] - vh * 0.5) phase = k;
    const frameP = clamp((y - (geo.tops[3] - vh * 0.5)) / geo.hs[3]);
    const level = phase > 3 ? FLOORS : Math.floor(frameP * FLOORS);
    hud.classList.toggle('is-off', phase === 0 || y > storyEnd + vh * 0.3);
    const key = pct + '|' + level + '|' + phase;
    if (key !== lastHud) {
      lastHud = key;
      hudPhase.textContent = PHASES[phase];
      hudFill.style.width = pct + '%';
      hudPct.textContent = pct + '%';
      hudLevel.textContent = `${pad(level)} / ${FLOORS}`;
      hudWeek.textContent = `Wk ${pad(Math.round(pct / 100 * WEEKS))} / ${WEEKS}`;
    }
  }
  const hud = $('#hud'), hudPhase = $('#hudPhase'), hudFill = $('#hudFill'), hudPct = $('#hudPct'), hudLevel = $('#hudLevel'), hudWeek = $('#hudWeek');
  let lastHud = '';
  gsap.ticker.add(update);

  // Pause all footage once the solid content covers it
  ScrollTrigger.create({
    trigger: '.content', start: 'top top',
    onEnter: () => { $('#film').style.visibility = 'hidden'; hero.pause(); },
    onLeaveBack: () => { $('#film').style.visibility = 'visible'; }
  });

'''
t = t[:a] + new + t[b:]
t = t.replace("if (loadPct >= 0.98 || performance.now() - started > 12000)", "if (loadPct > 0 || performance.now() - started > 6000)")
t = t.replace("'Loading materials'", "'Loading site footage'")
t = t.replace("  computeRanges();\n", "  measure();\n")
open(js_p, 'w', encoding='utf8').write(t)
print('ok')
