p = r'E:/React/wordpress/construction/js/main.js'
t = open(p, encoding='utf8').read()
a = t.index('  /* ---------- Photo story ---------- */'); b = t.index('  /* ---------- Nav ---------- */')
new = r'''  /* ---------- 3D build ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, '0');
  const story = $('#story');
  const chapters = $$('.chapter', story);
  const WEEKS = 86;
  let scene = null, loadPct = 0, progress = 0;

  function computeRanges() {
    if (!scene) return;
    const vh = innerHeight, scrollable = Math.max(1, story.offsetHeight - vh);
    scene.setRanges(chapters.map((ch, i) => {
      const s = i === 0 ? 0 : (ch.offsetTop - vh * 0.55) / scrollable;
      const e = i === chapters.length - 1 ? 1 : (ch.offsetTop + ch.offsetHeight - vh) / scrollable;
      return [clamp(s), clamp(e)];
    }));
  }

  NBScene.create($('#stage'), { onProgress: f => (loadPct = f) })
    .then(s => { scene = s; computeRanges(); scene.setProgress(progress); })
    .catch(err => { console.warn('WebGL scene unavailable', err); document.body.classList.add('no-webgl'); loadPct = 1; });

  ScrollTrigger.create({
    trigger: story, start: 'top top', end: 'bottom bottom',
    onUpdate: self => { progress = self.progress; scene && scene.setProgress(progress); },
    onRefresh: computeRanges
  });
  // Stop rendering once the solid content fully covers the canvas
  ScrollTrigger.create({
    trigger: '.content', start: 'top top',
    onEnter: () => scene && scene.setRunning(false),
    onLeaveBack: () => scene && scene.setRunning(true)
  });

  /* ---------- HUD ---------- */
  const hud = $('#hud'), hudPhase = $('#hudPhase'), hudFill = $('#hudFill'), hudPct = $('#hudPct'), hudLevel = $('#hudLevel'), hudWeek = $('#hudWeek');
  let lastHud = '';
  gsap.ticker.add(() => {
    if (!scene) { hud.classList.add('is-off'); return; }
    const i = scene.getInfo();
    const inStory = story.getBoundingClientRect().bottom > innerHeight * 0.6;
    hud.classList.toggle('is-off', !inStory || i.phase === 0);
    const key = i.pct + '|' + i.level + '|' + i.phase;
    if (key === lastHud) return;
    lastHud = key;
    hudPhase.textContent = i.phaseName;
    hudFill.style.width = i.pct + '%';
    hudPct.textContent = i.pct + '%';
    hudLevel.textContent = `${pad(i.level)} / ${scene.FLOORS}`;
    hudWeek.textContent = `Wk ${pad(Math.round(i.pct / 100 * WEEKS))} / ${WEEKS}`;
  });

'''
t = t[:a] + new + t[b:]
t = t.replace("if (loadPct >= 0.5 || performance.now() - started > 5000)", "if (loadPct >= 0.98 || performance.now() - started > 12000)")
t = t.replace("'Loading the site photos'", "'Loading materials'")
t = t.replace("  measure();\n", "  computeRanges();\n")
open(p, 'w', encoding='utf8').write(t)
print('ok')
