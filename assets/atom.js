/* ProductGurus — atom scroll indicator: spins with scroll, outer ring = page progress, click = back to top. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var css = [
    '#pg-atom{position:fixed;right:26px;bottom:26px;width:62px;height:62px;z-index:60;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .5s ease,transform .3s ease;background:rgba(10,10,12,.55);border-radius:50%;backdrop-filter:blur(6px);border:none;padding:0}',
    '#pg-atom.on{opacity:1;pointer-events:auto}',
    '#pg-atom:hover{transform:scale(1.12)}',
    '#pg-atom svg{display:block;width:100%;height:100%}',
    '@media (max-width:767px){#pg-atom{display:none}}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var atom = document.createElement('button');
  atom.id = 'pg-atom';
  atom.setAttribute('aria-label', 'Scroll progress — click to return to top');
  atom.title = 'Back to top';
  atom.innerHTML =
    '<svg viewBox="0 0 100 100" fill="none" aria-hidden="true">' +
    '<circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,.1)" stroke-width="3"/>' +
    '<circle id="pg-prog" cx="50" cy="50" r="46" stroke="#FFC321" stroke-width="3" stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="289" transform="rotate(-90 50 50)"/>' +
    '<g id="pg-spin">' +
    '<ellipse cx="50" cy="50" rx="30" ry="11" stroke="rgba(255,195,33,.75)" stroke-width="2.4"/>' +
    '<ellipse cx="50" cy="50" rx="30" ry="11" stroke="rgba(121,208,191,.7)" stroke-width="2.4" transform="rotate(60 50 50)"/>' +
    '<ellipse cx="50" cy="50" rx="30" ry="11" stroke="rgba(255,255,255,.28)" stroke-width="2" transform="rotate(120 50 50)"/>' +
    '<circle cx="80" cy="50" r="4.2" fill="#FFC321"/>' +
    '<circle cx="35" cy="76" r="3.6" fill="#79D0BF"/>' +
    '<circle cx="35" cy="24" r="3" fill="#f4f4f6"/>' +
    '</g>' +
    '<circle cx="50" cy="50" r="6" fill="#FFC321"/>' +
    '<circle cx="48" cy="48" r="2" fill="#fff3d0"/>' +
    '</svg>';
  document.body.appendChild(atom);

  atom.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  var spin = atom.querySelector('#pg-spin'),
      prog = atom.querySelector('#pg-prog'),
      C = 289, ticking = false;

  function paint() {
    ticking = false;
    var y = window.scrollY || 0;
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(y / max, 1) : 0;
    atom.classList.toggle('on', y > 200);
    spin.setAttribute('transform', 'rotate(' + (y * 0.35).toFixed(1) + ' 50 50)');
    prog.setAttribute('stroke-dashoffset', (C * (1 - p)).toFixed(1));
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(paint); }
  }, { passive: true });
  paint();
})();
