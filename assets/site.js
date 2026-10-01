/* ProductGurus: motion layer. No dependencies. Respects prefers-reduced-motion. */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Headline words rise in once, on load. Wraps words in spans; keeps inline markup. */
  var h1 = document.querySelector('main h1, header h1');
  if (h1 && !reduce) {
    var i = 0;
    var walk = function(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(n){
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function(part){
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'w'; s.textContent = part;
            s.style.animationDelay = (60 + i * 55) + 'ms'; i++; frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
      });
    };
    walk(h1);
  }

  /* 2. Reveal on scroll, short and once */
  var els = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        var el = e.target, parent = el.parentNode;
        var sibs = Array.prototype.filter.call(parent.children, function(c){ return c.hasAttribute('data-reveal') && !c.classList.contains('in'); });
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 4) * 60 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: .08, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function(el){ io.observe(el); });
    document.querySelectorAll('.grid3, .stats, .svc, .work, .steps, .faq, .deliv, .nums, .cs-rel, .pg-work, .art-related').forEach(function(g){
      Array.prototype.forEach.call(g.children, function(c){
        if (c.hasAttribute('data-reveal')) return;
        c.setAttribute('data-reveal', '');
        io.observe(c);
      });
    });
  }

  /* 3. The italic phrase gets its amber rule drawn in when it enters view */
  var hls = document.querySelectorAll('.hl, .grad, .pg-em');
  if (reduce || !('IntersectionObserver' in window)) {
    hls.forEach(function(el){ el.classList.add('lit'); });
  } else {
    var hio = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('lit'); hio.unobserve(e.target); } });
    }, { threshold: .9 });
    hls.forEach(function(el){ hio.observe(el); });
  }

  /* 4. Numbers count up when they scroll into view */
  var nums = document.querySelectorAll('.stat b, .nums b, .pg-fig b');
  if (!reduce && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, raw = el.textContent.trim(), m = raw.match(/^([^\d]*)(\d[\d,]*)(.*)$/);
        if (!m) return;
        var pre = m[1], target = parseInt(m[2].replace(/,/g,''), 10), post = m[3], start = performance.now(), dur = 800;
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

  /* 5. Share row on articles */
  var copyBtn = document.querySelector('.share-btn[data-share="copy"]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function(){
      var url = location.href.split('#')[0], title = document.title;
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { navigator.share({ title: title, url: url }).catch(function(){}); return; }
      var done = function(){ copyBtn.textContent = 'Link copied'; copyBtn.classList.add('done'); setTimeout(function(){ copyBtn.textContent = 'Copy link'; copyBtn.classList.remove('done'); }, 2200); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function(){ prompt('Copy this link', url); });
      else prompt('Copy this link', url);
    });
  }

  /* 6. Work page filter */
  var btns = document.querySelectorAll('.pg-fbtn');
  if (btns.length) {
    btns.forEach(function(b){ b.addEventListener('click', function(){
      btns.forEach(function(x){ x.classList.remove('act'); }); b.classList.add('act');
      var f = b.getAttribute('data-filter');
      document.querySelectorAll('.pg-wcard').forEach(function(c){ c.classList.toggle('hide', f !== 'all' && c.getAttribute('data-cat') !== f); });
    }); });
  }
})();
