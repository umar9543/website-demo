import re, shutil, os
SRC = 'E:/React/wordpress/construction'
DST = 'E:/React/wordpress/northbeam'
src = open(f'{SRC}/index.html', encoding='utf8').read()

def between(s, a, b, incl_b=True):
    i = s.index(a); j = s.index(b, i) + (len(b) if incl_b else 0)
    return s[i:j]

nav = between(src, '<header class="nav" id="nav">', '</header>')
nav = nav.replace('<a href="#story">How we build</a>', '<a href="#journey">The building</a>')
menu = between(src, '<div class="menu" id="menu" aria-hidden="true">', '</div>\n')
menu = menu.replace('<a href="#story">How we build</a>', '<a href="#journey">The building</a>')
content = between(src, '<div class="content">', '    </footer>\n  </div>')
content = content.replace('Footage via Pexels. Photography via Unsplash:', 'Photography via Unsplash and Poly Haven (CC0). Exterior: Alexander Cafarella. Section: Kate Trysh. Foundations: Yk K. 360° interiors: cayley_interior and hotel_room (Poly Haven). Project photos:')

journey = '''
  <!-- ============ THE BUILDING: one tower, every layer (real photography) ============ -->
  <section class="journey" id="journey" aria-label="Meridian House, from the street to the foundations"></section>
'''

stage = '''<!-- Journey stage (fixed). Real exterior photo, real 360° rooms as CSS 3D cubes, real site photos. -->
<div class="j-stage" id="jStage" aria-hidden="true">
  <div class="j-pano" id="jPano"></div>
  <img class="j-photo" id="jSection" src="media/section.jpg" alt="">
  <img class="j-photo" id="jPiles" src="media/piles.jpg" alt="">
  <div class="j-ext" id="jExt">
    <div class="j-frame" id="jFrame">
      <img class="j-base" id="jBase" src="media/tower.jpg" alt="">
      <div class="j-dusk" id="jDusk"></div>
      <div class="j-strips" id="jStrips"></div>
      <svg class="j-xray" id="jXray" viewBox="0 0 2400 1600" preserveAspectRatio="none"></svg>
      <svg class="j-night" id="jNight" viewBox="0 0 2400 1600" preserveAspectRatio="none"></svg>
    </div>
  </div>
  <div class="j-flash" id="jFlash"></div>
  <div class="j-grain"></div>
  <div class="j-vignette"></div>
</div>

<div class="j-caps" aria-live="off">
  <section class="j-cap j-cap--hero" data-from="-1" data-to="0.06">
    <p class="eyebrow mono"><span class="dot"></span>General contractor · Since 1988</p>
    <h1 class="j-title">One building.<br><em>Every layer.</em></h1>
    <p class="j-lede">Meridian House, 22 storeys on the coast. Scroll to take it apart: the structure, the rooms, down to the piles.</p>
    <div class="j-actions"><a href="#contact" class="btn">Start a project</a><a href="#projects" class="btn btn--ghost">See our work</a></div>
  </section>
  <section class="j-cap j-cap--side" data-from="0.075" data-to="0.19">
    <p class="eyebrow mono">01 · Structure</p>
    <h2>Twenty-two floors, lifted apart.</h2>
    <p>Post-tensioned slabs on a cross-wall frame, every balcony cantilevered from the slab edge.</p>
    <dl class="mono"><div><dt>Slab</dt><dd>225 mm PT</dd></div><div><dt>Floor to floor</dt><dd>3.10 m</dd></div><div><dt>Height</dt><dd>68.2 m</dd></div></dl>
  </section>
  <section class="j-cap j-cap--side" data-from="0.205" data-to="0.27">
    <p class="eyebrow mono">02 · Level 12</p>
    <h2>Through the balcony door.</h2>
  </section>
  <section class="j-cap j-cap--side" data-from="0.32" data-to="0.375">
    <p class="eyebrow mono">03 · Living</p>
    <h2>Open plan, sea on one side.</h2>
    <p>Full-height sliding glass to a 2.4 m balcony. Porcelain floors on acoustic screed throughout.</p>
  </section>
  <section class="j-cap j-cap--side" data-from="0.395" data-to="0.465">
    <p class="eyebrow mono">04 · Dining</p>
    <h2>No downstand beams in sight.</h2>
    <p>The PT slab spans the whole apartment, so the ceiling runs clean from kitchen to balcony.</p>
  </section>
  <section class="j-cap j-cap--side" data-from="0.515" data-to="0.585">
    <p class="eyebrow mono">05 · Bedroom</p>
    <h2>Quiet by design.</h2>
    <p>55 dB separation between apartments, tested on every floor before handover.</p>
  </section>
  <section class="j-cap j-cap--side" data-from="0.605" data-to="0.675">
    <p class="eyebrow mono">06 · Study</p>
    <h2>Every room, finished to the drawing.</h2>
    <p>Joinery, lighting and data checked against the model, room by room.</p>
  </section>
  <section class="j-cap j-cap--side" data-from="0.715" data-to="0.79">
    <p class="eyebrow mono">07 · Section</p>
    <h2>How every floor goes up.</h2>
    <p>One floor every eight working days: core first, then slab, then the balconies, with the crane never idle.</p>
  </section>
  <section class="j-cap j-cap--side" data-from="0.815" data-to="0.89">
    <p class="eyebrow mono">08 · Foundations</p>
    <h2>What it all stands on.</h2>
    <p>Sixty-four bored piles, 18 m into stiff clay, each reinforcement cage tied and inspected on site.</p>
  </section>
  <section class="j-cap j-cap--hero j-cap--end" data-from="0.95" data-to="1.5">
    <p class="eyebrow mono">Handed over</p>
    <h2 class="j-end">Lights on. Every layer signed off.</h2>
    <div class="j-actions"><a href="#projects" class="btn">See finished buildings</a></div>
  </section>
</div>

<aside class="j-hud mono" id="jHud" aria-hidden="true">
  <div><span>Layer</span><b id="jhLayer">Exterior</b></div>
  <div><span>Where</span><b id="jhWhere">Street</b></div>
  <div class="j-hud__bar"><i id="jhBar"></i></div>
</aside>
'''

head = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Northbeam Construction</title>
<meta name="description" content="Northbeam Construction: general contractor and design-and-build partner since 1988. Scroll through one of our buildings, from the street to the foundations.">
<meta name="theme-color" content="#11151b">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;800;900&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/journey.css">
</head>
<body>

<div class="loader" id="loader" aria-hidden="true">
  <div class="loader__inner">
    <div class="loader__mark">NB</div>
    <div class="loader__bar"><span id="loaderBar"></span></div>
    <div class="loader__meta"><span id="loaderText">Setting out the site</span><span id="loaderPct">0%</span></div>
  </div>
</div>

'''
tail = '''
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js"></script>
<script src="js/journey.js"></script>
<script src="js/main.js"></script>
</body>
</html>
'''
html = head + nav + '\n\n' + menu + '\n' + stage + '\n<main id="top">\n' + journey + '\n  ' + content + '    </footer>\n  </div>\n</main>\n' + tail
open(f'{DST}/index.html', 'w', encoding='utf8').write(html)
os.makedirs(f'{DST}/css', exist_ok=True)
shutil.copy(f'{SRC}/css/style.css', f'{DST}/css/style.css')

# ---- main.js: keep the site behaviour, drop the old footage story ----
js = open(f'{SRC}/js/main.js', encoding='utf8').read()
def cut(s, a, b):
    i = s.index(a); j = s.index(b); return s[:i] + s[j:]
js = cut(js, '  /* ---------- Real footage, scrubbed by scroll ---------- */', '  /* ---------- Nav ---------- */')
js = cut(js, '  /* ---------- Story choreography ---------- */', '  /* ---------- Word reveals ---------- */')
# chapter-specific anchor offset no longer needed
js = js.replace("""    // Chapters: land where the panel is fully shown
    if (el && el.classList && el.classList.contains('chapter')) {
      scrollToTarget(el.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.35);
    } else scrollToTarget(el);""", "    scrollToTarget(el);")
# loader waits for the tower photo
js = js.replace("if (loadPct > 0 || performance.now() - started > 6000) { loader", "if (towerReady || performance.now() - started > 8000) { loader")
js = js.replace("'Loading site footage'", "'Loading the building'")
js = js.replace("  const burger = $('#burger'), menu = $('#menu');",
  "  const burger = $('#burger'), menu = $('#menu');\n  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));\n  let towerReady = false;\n  (window.NBJourneyReady || Promise.resolve()).then(() => (towerReady = true));")
# hero intro: animate the journey's opening caption instead
i = js.index('  function heroIntro() {'); j = js.index('\n  }\n', i) + 4
js = js[:i] + """  function heroIntro() {
    if (reduced) return;
    gsap.from('.j-title', { yPercent: 30, autoAlpha: 0, duration: 1.2, ease: 'expo.out' });
    gsap.from('.j-cap--hero .eyebrow, .j-lede, .j-actions .btn', { y: 20, autoAlpha: 0, duration: 0.9, stagger: 0.08, delay: 0.25, ease: 'expo.out' });
    gsap.from('.nav', { yPercent: -100, duration: 1, delay: 0.2, ease: 'expo.out' });
  }
""" + js[j:]
js = js.replace("  measure();\n", "")
open(f'{DST}/js/main.js', 'w', encoding='utf8').write(js)
print('built')
