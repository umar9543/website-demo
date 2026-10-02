/* Smooth scrolling.
   Wheel scrolling is animated with Lenis on desktop pointers only. Touch keeps the
   native scroll, and anyone on prefers-reduced-motion keeps the native scroll too.
   window.lenisScrollTo is the single entry point for anchor jumps, and it falls back
   to the browser's own smooth scroll whenever Lenis is not running. */
(function () {
    function nativeScrollTo(target) {
        if (typeof target === 'number') {
            window.scrollTo({ top: target, behavior: 'smooth' });
            return;
        }
        var el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    window.lenisScrollTo = function (target) {
        if (window.lenis) {
            /* Lenis already honours scroll-margin-top, which is what keeps section
               headings clear of the fixed nav. No extra offset needed here. */
            window.lenis.scrollTo(target);
        } else {
            nativeScrollTo(target);
        }
    };

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (reduceMotion || !finePointer || typeof Lenis === 'undefined') return;

    var lenis = new Lenis({
        duration: 1.5,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1,
        autoRaf: false
    });

    window.lenis = lenis;

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    /* Anything that opens a scroll-locking overlay should pause Lenis, otherwise the
       page keeps gliding behind the modal. */
    var body = document.body;
    new MutationObserver(function () {
        if (body.style.overflow === 'hidden') lenis.stop();
        else lenis.start();
    }).observe(body, { attributes: true, attributeFilter: ['style'] });
})();
