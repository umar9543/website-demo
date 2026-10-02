(() => {
  const hero = document.querySelector('.cinematic-hero');
  if (!hero) return;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => hero.classList.toggle('hero-paused', !entry.isIntersecting)).observe(hero);
  }
})();

/* On phones the WhatsApp button stays tucked away until the hero has mostly scrolled
   off screen, so it never sits on top of the pitch line or the hero buttons. */
(function () {
    var hero = document.getElementById('hero');
    if (!hero) return;
    var phone = window.matchMedia('(max-width: 767px)');
    var ticking = false;
    function update() {
        ticking = false;
        var tuck = phone.matches && hero.getBoundingClientRect().bottom > window.innerHeight * 0.35;
        document.body.classList.toggle('wa-tucked', tuck);
    }
    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    phone.addEventListener && phone.addEventListener('change', update);
    update();
})();
