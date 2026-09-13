/* ProductGurus: motion layer. No dependencies. Respects prefers-reduced-motion. */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* 1. Reveal on scroll, staggered inside each section */
  var els = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        var el = e.target, parent = el.parentNode;
        var sibs = Array.prototype.filter.call(parent.children, function(c){ return c.hasAttribute('data-reveal') && !c.classList.contains('in'); });
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 5) * 70 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: .08, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function(el){ io.observe(el); });
    /* children of grids reveal one by one */
    document.querySelectorAll('.grid3, .stats, .svc, .work, .steps, .faq, .deliv, .nums, .cs-rel, .pg-work, .art-related').forEach(function(g){
      Array.prototype.forEach.call(g.children, function(c, i){
        if (c.hasAttribute('data-reveal')) return;
        c.setAttribute('data-reveal', '');
        io.observe(c);
      });
    });
  }

  /* 2. Numbers count up when they scroll into view */
  var nums = document.querySelectorAll('.stat b, .nums b');
  if (!reduce && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, raw = el.textContent.trim(), m = raw.match(/^([^\d]*)(\d[\d,]*)(.*)$/);
        if (!m) return;
        var pre = m[1], target = parseInt(m[2].replace(/,/g,''), 10), post = m[3], start = performance.now(), dur = 900;
        if (isNaN(target) || target === 0) return;
        el.style.fontVariantNumeric = 'tabular-nums';
        (function step(now){
          var p = Math.min(1, (now - start) / dur), ease = 1 - Math.pow(1 - p, 3);
          el.textContent = pre + Math.round(ease * target).toLocaleString('en-CA') + post;
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: .6 });
    nums.forEach(function(el){ cio.observe(el); });
  }

  /* 3. Homepage hero card: cycle through the five stages */
  var rows = document.querySelectorAll('.deck-row');
  if (rows.length && !reduce) {
    var i = 0, timer;
    function tick(){ rows[i].classList.remove('on'); i = (i + 1) % rows.length; rows[i].classList.add('on'); }
    function start(){ if (!timer) timer = setInterval(tick, 2200); }
    function stop(){ clearInterval(timer); timer = null; }
    start();
    document.addEventListener('visibilitychange', function(){ document.hidden ? stop() : start(); });
  }

  /* 4. Cards tilt gently toward the pointer (desktop only) */
  if (fine && !reduce) {
    document.querySelectorAll('.work a, a.card, a.stat, .svcfam a, .pg-wcard').forEach(function(card){
      var raf;
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - .5) * -3, ry = ((e.clientX - r.left) / r.width - .5) * 4;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function(){ card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-3px)'; });
      });
      card.addEventListener('mouseleave', function(){ cancelAnimationFrame(raf); card.style.transform = ''; });
    });
  }

  /* 5. Page-specific hooks that used to live inline */
  var btns = document.querySelectorAll('.pg-fbtn');
  if (btns.length) {
    btns.forEach(function(b){ b.addEventListener('click', function(){
      btns.forEach(function(x){ x.classList.remove('act'); }); b.classList.add('act');
      var f = b.getAttribute('data-filter');
      document.querySelectorAll('.pg-wcard').forEach(function(c){ c.classList.toggle('hide', f !== 'all' && c.getAttribute('data-cat') !== f); });
    }); });
  }
})();
