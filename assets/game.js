/* ProductGurus pitch: a 1v1 pixel football game.
   Banner mode plays itself (two AIs). "Play me" opens the modal and hands the left player to you.
   No libraries, no assets, no network. Sounds are WebAudio beeps, off until you unmute. */
(function () {
  'use strict';
  var W = 480, H = 112, GROUND = 98, GOAL_W = 26, BAR = 36, FIRST_TO = 3;
  var C = { sky: '#141412', sky2: '#1C1B18', grass: '#2F7A3E', grass2: '#2A6E37', line: '#FAF5EA', post: '#FAF5EA',
            ink: '#141412', cream: '#FAF5EA', amber: '#FFC321', skin: '#E9B98A', skin2: '#C98C5B', hoard: '#FAF5EA', hoardTxt: '#141412',
            red: '#D04B3A', blue: '#3D6CE8' };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- tiny 3x5 pixel font ---------- */
  var FONT = {
    '0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001','5':'111100111001111',
    '6':'111100111101111','7':'111001001001001','8':'111101111101111','9':'111101111001111',
    'A':'010101111101101','B':'110101110101110','C':'111100100100111','D':'110101101101110','E':'111100110100111','F':'111100110100100',
    'G':'111100101101111','H':'101101111101101','I':'111010010010111','J':'001001001101111','K':'101110100110101','L':'100100100100111',
    'M':'101111111101101','N':'110101101101101','O':'111101101101111','P':'111101111100100','Q':'111101101111001','R':'111101110101101',
    'S':'111100111001111','T':'111010010010010','U':'101101101101111','V':'101101101101010','W':'101101111111101','X':'101101010101101',
    'Y':'101101111010010','Z':'111001010100111',':':'000010000010000','.':'000000000000010','!':'010010010000010','-':'000000111000000',
    ' ':'000000000000000','/':'001001010100100','>':'100010001010100','<':'001010100010001'
  };
  function text(ctx, s, x, y, color, scale) {
    scale = scale || 1; ctx.fillStyle = color;
    for (var i = 0; i < s.length; i++) {
      var g = FONT[s[i].toUpperCase()] || FONT[' '];
      for (var p = 0; p < 15; p++) if (g[p] === '1') ctx.fillRect(x + i * 4 * scale + (p % 3) * scale, y + Math.floor(p / 3) * scale, scale, scale);
    }
  }
  function textW(s, scale) { return s.length * 4 * (scale || 1) - (scale || 1); }

  /* ---------- sprites ---------- */
  var RUN = [
    ['..HH..','.HHHH.','..HH..','.SSSS.','SSSSSS','.SSSS.','.PPPP.','.L..L.','.L..L.','.B..B.'],
    ['..HH..','.HHHH.','..HH..','.SSSS.','SSSSSS','.SSSS.','.PPPP.','..LL..','.L..L.','B....B'],
    ['..HH..','.HHHH.','..HH..','.SSSS.','SSSSSS','.SSSS.','.PPPP.','.L..L.','L....L','B....B']
  ];
  function drawPlayer(ctx, p) {
    var f = p.onGround && Math.abs(p.vx) > 0.2 ? RUN[1 + (Math.floor(p.anim / 6) % 2)] : (p.onGround ? RUN[0] : RUN[2]);
    var x0 = Math.round(p.x) - 6, y0 = Math.round(p.y) - 20;
    var col = { H: p.skin, S: p.shirt, P: p.shorts, L: p.skin, B: C.ink };
    for (var r = 0; r < f.length; r++) for (var c = 0; c < 6; c++) {
      var ch = f[r][c]; if (ch === '.') continue;
      var cc = p.dir < 0 ? 5 - c : c;
      ctx.fillStyle = col[ch]; ctx.fillRect(x0 + cc * 2, y0 + r * 2, 2, 2);
    }
    if (p.shirt === C.amber) { ctx.fillStyle = C.ink; ctx.fillRect(x0 + 4, y0 + 8, 4, 2); } // the PG mark on the amber shirt
  }
  function drawBall(ctx, b) {
    var x = Math.round(b.x) - 3, y = Math.round(b.y) - 3;
    ctx.fillStyle = C.cream; ctx.fillRect(x + 1, y, 4, 6); ctx.fillRect(x, y + 1, 6, 4);
    ctx.fillStyle = C.ink; var sp = Math.floor(b.spin) % 4; ctx.fillRect(x + 1 + (sp % 2) * 2, y + 1 + Math.floor(sp / 2) * 2, 2, 2);
  }

  /* ---------- sound ---------- */
  var audio = { ctx: null, on: false };
  function beep(freq, dur, type, vol) {
    if (!audio.on) return;
    try {
      if (!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
      o.type = type || 'square'; o.frequency.value = freq; g.gain.value = vol || 0.04;
      o.connect(g); g.connect(audio.ctx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audio.ctx.currentTime + dur); o.stop(audio.ctx.currentTime + dur);
    } catch (e) {}
  }
  function whistle() { beep(1800, 0.25, 'square', 0.03); setTimeout(function () { beep(2200, 0.35, 'square', 0.03); }, 220); }
  function goalSound() { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { beep(f, 0.18, 'square', 0.05); }, i * 110); }); }

  /* ---------- the game ---------- */
  function Game(canvas, mode, width) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.mode = mode; // 'banner' | 'play'
    this.W = W = width || 480; canvas.width = W; canvas.height = H; this.ctx.imageSmoothingEnabled = false;
    this.crowd = []; for (var i = 0; i < 900; i++) this.crowd.push({ x: Math.random() * W, y: 8 + Math.random() * 40, c: Math.random() });
    this.keys = {}; this.touch = { l: false, r: false, j: false, k: false };
    this.last = 0; this.raf = 0; this.running = false; this.onState = null;
    this.reset(true);
  }
  Game.prototype.reset = function (full) {
    W = this.W;
    this.p1 = { x: 90, y: GROUND, vx: 0, vy: 0, dir: 1, onGround: true, anim: 0, shirt: C.amber, shorts: C.ink, skin: C.skin, kickT: 0, ai: this.mode === 'banner', react: 0 };
    this.p2 = { x: W - 90, y: GROUND, vx: 0, vy: 0, dir: -1, onGround: true, anim: 0, shirt: C.ink, shorts: C.cream, skin: C.skin2, kickT: 0, ai: true, react: 0 };
    this.ball = { x: W / 2, y: GROUND - 3, vx: 0, vy: 0, spin: 0 };
    if (full) { this.score = [0, 0]; this.state = this.mode === 'banner' ? 'live' : 'ready'; this.msg = ''; this.msgT = 0; this.winner = 0; }
    this.kickoffT = this.mode === 'banner' ? 0 : 0.6;
  };
  Game.prototype.start = function () { if (this.running) return; this.running = true; this.last = performance.now(); var g = this; this.raf = requestAnimationFrame(function (t) { g.frame(t); }); };
  Game.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };
  Game.prototype.frame = function (t) {
    if (!this.running) return;
    var dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    this.update(dt); this.draw();
    var g = this; this.raf = requestAnimationFrame(function (t2) { g.frame(t2); });
  };
  Game.prototype.kickoff = function () {
    if (this.state === 'ready' || this.state === 'over') { if (this.state === 'over') this.reset(true); this.state = 'live'; this.msg = 'GO!'; this.msgT = 1; whistle(); this.emit(); }
  };
  Game.prototype.emit = function () { if (this.onState) this.onState(this.state, this.score, this.winner); };

  Game.prototype.input = function (p) {
    if (p.ai) return this.think(p);
    var k = this.keys, t = this.touch;
    var left = k.ArrowLeft || k.a || k.A || t.l, right = k.ArrowRight || k.d || k.D || t.r;
    var jump = k.ArrowUp || k.w || k.W || t.j, kick = k[' '] || k.x || k.X || t.k;
    return { left: left, right: right, jump: jump, kick: kick };
  };
  Game.prototype.think = function (p) {
    W = this.W;
    var b = this.ball, home = p === this.p1 ? 0 : W, attackDir = p === this.p1 ? 1 : -1;
    p.react -= 1;
    if (p.react <= 0) { p.react = 6 + Math.random() * 10; p.plan = Math.random(); }
    // stand slightly on the home side of the ball, so a kick sends it the right way
    var want = b.x - attackDir * 10, dead = 2.5;
    var ballComing = (b.vx * attackDir) < -1.2 && Math.abs(b.x - p.x) < 60;
    if (ballComing && p.plan < 0.5) want = b.x - attackDir * 22;
    var left = want < p.x - dead, right = want > p.x + dead;
    var near = Math.abs(b.x - p.x) < 17;
    var jump = near && b.y < GROUND - 24 && p.onGround && p.plan > 0.2;
    var kick = near && Math.abs(b.y - p.y) < 24 && (attackDir > 0 ? b.x >= p.x - 2 : b.x <= p.x + 2) && p.plan > 0.12;
    if (this.mode === 'play' && p === this.p2 && p.plan < 0.35 && Math.abs(b.x - p.x) > 30) { left = right = false; } // the opponent hesitates sometimes; it is beatable
    return { left: left, right: right, jump: jump, kick: kick };
  };

  Game.prototype.update = function (dt) {
    W = this.W;
    var s = dt * 60; // normalise to 60fps units
    if (this.msgT > 0) this.msgT -= dt;
    if (this.state !== 'live') { this.ball.spin += 0.1 * s; return; }
    if (this.kickoffT > 0) { this.kickoffT -= dt; }
    var b = this.ball, g = this, ps = [this.p1, this.p2];
    ps.forEach(function (p) {
      var inp = g.kickoffT > 0 ? { left: 0, right: 0, jump: 0, kick: 0 } : g.input(p);
      var acc = 0.45, max = 1.9;
      if (inp.left) { p.vx -= acc * s; p.dir = -1; } if (inp.right) { p.vx += acc * s; p.dir = 1; }
      if (!inp.left && !inp.right) p.vx *= Math.pow(0.78, s);
      p.vx = Math.max(-max, Math.min(max, p.vx));
      if (inp.jump && p.onGround) { p.vy = -4.4; p.onGround = false; }
      p.vy += 0.26 * s; p.x += p.vx * s; p.y += p.vy * s;
      if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
      p.x = Math.max(12, Math.min(W - 12, p.x));
      p.anim += Math.abs(p.vx) * s; p.kickT = Math.max(0, p.kickT - dt);
      // touching the ball nudges it
      var dx = b.x - p.x, dy = b.y - (p.y - 10);
      if (Math.abs(dx) < 8 && Math.abs(dy) < 13) { b.vx += (dx >= 0 ? 1 : -1) * 0.6 + p.vx * 0.4; b.vy -= 0.4; }
      if (inp.kick && p.kickT === 0 && Math.abs(dx) < 16 && Math.abs(dy) < 22) {
        var d = dx >= 0 ? 1 : -1; if ((p.dir > 0) !== (d > 0)) d = p.dir; // kick the way you face
        b.vx = d * (3.4 + Math.abs(p.vx) * 0.6); b.vy = -2.4 - (inp.jump ? 0.8 : 0); p.kickT = 0.35; beep(220, 0.06, 'square', 0.05);
      }
    });
    // ball physics
    b.vy += 0.2 * s; b.x += b.vx * s; b.y += b.vy * s; b.spin += Math.abs(b.vx) * 0.5 * s;
    if (b.y > GROUND - 3) { b.y = GROUND - 3; b.vy = -b.vy * 0.55; b.vx *= 0.96; if (Math.abs(b.vy) < 0.3) b.vy = 0; }
    b.vx *= Math.pow(0.995, s);
    if (b.y < 4) { b.y = 4; b.vy = Math.abs(b.vy) * 0.5; }
    // crossbar
    [GOAL_W, W - GOAL_W].forEach(function (gx) { if (Math.abs(b.x - gx) < 3 && Math.abs(b.y - (GROUND - BAR)) < 3 && b.vy < 0) { b.vy = Math.abs(b.vy) * 0.6; beep(900, 0.05, 'triangle', 0.04); } });
    // goals and walls
    if (b.x < 2) { if (b.y > GROUND - BAR) return this.goal(1); b.x = 2; b.vx = Math.abs(b.vx) * 0.6; }
    if (b.x > W - 2) { if (b.y > GROUND - BAR) return this.goal(0); b.x = W - 2; b.vx = -Math.abs(b.vx) * 0.6; }
    // players do not walk through each other
    var p1 = this.p1, p2 = this.p2;
    if (Math.abs(p1.x - p2.x) < 11 && Math.abs(p1.y - p2.y) < 18) { var mid = (p1.x + p2.x) / 2; p1.x = mid - 5.5; p2.x = mid + 5.5; p1.vx *= -0.3; p2.vx *= -0.3; }
    // idle banner: never let a dead ball sit
    if (this.mode === 'banner' && Math.abs(b.vx) < 0.05 && b.vy === 0 && Math.abs(b.x - this.p1.x) > 30 && Math.abs(b.x - this.p2.x) > 30) b.vx = (Math.random() - 0.5) * 2;
  };
  Game.prototype.goal = function (who) {
    this.score[who]++; goalSound();
    var yours = this.mode === 'play' && who === 0;
    this.msg = this.mode === 'banner' ? 'GOAL!' : (yours ? 'GOAL! ' : 'ABHAY SCORES '); this.msgT = 1.6;
    if (this.score[who] >= FIRST_TO && this.mode === 'play') { this.state = 'over'; this.winner = who; this.emit(); return; }
    if (this.score[who] >= FIRST_TO) this.score = [0, 0];
    var g = this; this.reset(false); this.kickoffT = 1.6; this.emit();
  };

  Game.prototype.draw = function () {
    W = this.W;
    var ctx = this.ctx, t = performance.now() / 1000;
    ctx.fillStyle = C.sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.sky2; ctx.fillRect(0, 48, W, 8);
    // crowd
    var cols = [C.cream, C.amber, C.ink, '#8A8577', '#D9CFB8', C.red, C.blue];
    for (var i = 0; i < this.crowd.length; i++) {
      var q = this.crowd[i], flicker = reduced ? 0 : (Math.sin(t * 3 + i) > 0.985 ? 1 : 0);
      ctx.fillStyle = flicker ? C.cream : cols[Math.floor(q.c * cols.length)]; ctx.fillRect(Math.floor(q.x), Math.floor(q.y) - flicker, 2, 2);
    }
    // floodlights
    ctx.fillStyle = C.cream; [40, W - 40].forEach(function (x) { ctx.fillRect(x - 6, 2, 12, 2); ctx.fillRect(x - 1, 4, 2, 4); });
    // hoardings
    ctx.fillStyle = C.hoard; ctx.fillRect(0, 56, W, 9);
    for (var hx = ((t * 12) % 80) - 80; hx < W; hx += 80) { text(ctx, 'PRODUCTGURUS.AI', Math.round(hx), 58, C.hoardTxt, 1); }
    ctx.fillStyle = C.amber; ctx.fillRect(0, 65, W, 1);
    // pitch
    for (var gy = 66; gy < H; gy += 6) { ctx.fillStyle = (Math.floor(gy / 6) % 2) ? C.grass : C.grass2; ctx.fillRect(0, gy, W, 6); }
    ctx.fillStyle = C.line; ctx.fillRect(0, GROUND, W, 1); ctx.fillRect(W / 2, 66, 1, GROUND - 66);
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.ellipse(W / 2, GROUND - 5, 22, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillRect(0, 66, 1, GROUND - 66); ctx.fillRect(W - 1, 66, 1, GROUND - 66);
    // goals
    var self = this;
    [GOAL_W, W - GOAL_W].forEach(function (gx, i) {
      var s = i === 0 ? 1 : -1;
      ctx.fillStyle = C.post; ctx.fillRect(gx - 1, GROUND - BAR, 2, BAR); ctx.fillRect(i === 0 ? 0 : gx, GROUND - BAR - 1, GOAL_W, 2);
      ctx.fillStyle = 'rgba(250,245,234,.22)';
      for (var ny = GROUND - BAR; ny < GROUND; ny += 4) for (var nx = (i === 0 ? 1 : gx + 2); nx < (i === 0 ? gx - 1 : W - 1); nx += 4) ctx.fillRect(nx, ny, 1, 1);
    });
    // scoreboard
    var sb = this.mode === 'banner' ? 'PG' : 'YOU', sc = this.score;
    ctx.fillStyle = C.ink; ctx.fillRect(W / 2 - 46, 40, 92, 12); ctx.fillStyle = C.amber; ctx.fillRect(W / 2 - 46, 51, 92, 1);
    text(ctx, sb, W / 2 - 42, 44, C.amber, 1);
    text(ctx, 'ABHAY', W / 2 + 42 - textW('ABHAY'), 44, C.cream, 1);
    ctx.fillStyle = C.cream; ctx.fillRect(W / 2 - 13, 41, 26, 10);
    text(ctx, sc[0] + ':' + sc[1], W / 2 - 5, 43, C.ink, 1);
    // actors
    drawPlayer(ctx, this.p1); drawPlayer(ctx, this.p2); drawBall(ctx, this.ball);
    // messages
    if (this.msgT > 0 && this.msg) { var m = this.msg.trim(); text(ctx, m, Math.round(W / 2 - textW(m, 2) / 2), 20, C.amber, 2); }
    if (this.state === 'live' && this.kickoffT > 0 && this.msgT <= 0) { text(ctx, 'READY', Math.round(W / 2 - textW('READY', 2) / 2), 20, C.cream, 2); }
    if (this.mode === 'banner') { var pm = 'PLAY ME >'; ctx.fillStyle = C.amber; ctx.fillRect(W - textW(pm) - 10, H - 13, textW(pm) + 8, 10); text(ctx, pm, W - textW(pm) - 6, H - 11, C.ink, 1); }
  };

  /* ---------- modal ---------- */
  function openModal(bannerGame) {
    if (document.querySelector('.game-modal')) return;
    var m = document.createElement('div'); m.className = 'game-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Football, first to 3 wins');
    m.innerHTML =
      '<div class="game-box">' +
      '<div class="game-bar"><span>Football · first to 3 wins</span><span class="game-btns"><button type="button" class="game-mute" aria-label="Sound off">&#9834; off</button><button type="button" class="game-close" aria-label="Close">&times;</button></span></div>' +
      '<div class="game-stage"><canvas class="game-canvas" aria-label="Pixel football game"></canvas>' +
      '<div class="game-overlay"><div class="game-sub">You vs Abhay</div><div class="game-title">First to 3 goals wins</div><button type="button" class="game-go">Kick off</button><div class="game-hint">Space or Enter</div></div></div>' +
      '<div class="game-keys"><span><kbd>&larr;</kbd><kbd>&rarr;</kbd> / <kbd>A</kbd><kbd>D</kbd> move</span><span><kbd>&uarr;</kbd> / <kbd>W</kbd> jump</span><span><kbd>Space</kbd> / <kbd>X</kbd> kick</span></div>' +
      '<div class="game-touch" aria-hidden="true"><button data-t="l">&larr;</button><button data-t="r">&rarr;</button><span></span><button data-t="j">Jump</button><button data-t="k" class="is-kick">Kick</button></div>' +
      '</div>';
    document.body.appendChild(m); document.body.classList.add('game-open');
    var canvas = m.querySelector('.game-canvas'), overlay = m.querySelector('.game-overlay'), game = new Game(canvas, 'play', window.innerWidth < 600 ? 320 : 480);
    var title = m.querySelector('.game-title'), sub = m.querySelector('.game-sub'), go = m.querySelector('.game-go');
    game.onState = function (state, score, winner) {
      if (state === 'live') { overlay.hidden = true; return; }
      if (state === 'over') {
        overlay.hidden = false; sub.textContent = score[0] + ' : ' + score[1];
        title.textContent = winner === 0 ? 'You win. Fancy a call?' : 'Abhay wins. Again?'; go.textContent = 'Play again';
        try { gtag('event', 'game_over', { winner: winner === 0 ? 'you' : 'abhay' }); } catch (e) {}
      }
    };
    var keyDown = function (e) {
      if (e.key === 'Escape') return close();
      if ((e.key === ' ' || e.key === 'Enter') && game.state !== 'live') { e.preventDefault(); game.kickoff(); }
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0) e.preventDefault();
      game.keys[e.key] = true;
    }, keyUp = function (e) { game.keys[e.key] = false; };
    function close() { game.stop(); document.removeEventListener('keydown', keyDown); document.removeEventListener('keyup', keyUp); m.remove(); document.body.classList.remove('game-open'); if (bannerGame) bannerGame.start(); }
    document.addEventListener('keydown', keyDown); document.addEventListener('keyup', keyUp);
    m.querySelector('.game-close').addEventListener('click', close);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    go.addEventListener('click', function () { game.kickoff(); go.blur(); });
    var mute = m.querySelector('.game-mute');
    mute.addEventListener('click', function () { audio.on = !audio.on; mute.innerHTML = audio.on ? '&#9834; on' : '&#9834; off'; mute.setAttribute('aria-label', audio.on ? 'Sound on' : 'Sound off'); if (audio.on) beep(880, 0.08, 'square', 0.04); });
    m.querySelectorAll('.game-touch button').forEach(function (b) {
      var k = b.getAttribute('data-t');
      var on = function (e) { e.preventDefault(); game.touch[k] = true; if (game.state !== 'live') game.kickoff(); }, off = function (e) { e.preventDefault(); game.touch[k] = false; };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
    if (bannerGame) bannerGame.stop();
    game.draw(); game.start(); go.focus();
    try { gtag('event', 'game_open', { location: 'hero' }); } catch (e) {}
  }

  /* ---------- banner ---------- */
  function init() {
    var holder = document.querySelector('[data-pitch]'); if (!holder) return;
    var canvas = document.createElement('canvas'); canvas.className = 'pitch-canvas'; canvas.setAttribute('aria-hidden', 'true');
    holder.insertBefore(canvas, holder.firstChild);
    var game = new Game(canvas, 'banner');
    var btn = holder.querySelector('.pitch-play');
    var open = function () { openModal(game); };
    canvas.addEventListener('click', open); if (btn) btn.addEventListener('click', open);
    game.draw();
    if (reduced) return; // one still frame; no autoplay for people who asked for less motion
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting && !document.querySelector('.game-modal')) game.start(); else if (!e.isIntersecting) game.stop(); }); }) : null;
    if (io) io.observe(canvas); else game.start();
    document.addEventListener('visibilitychange', function () { if (document.hidden) game.stop(); else if (!document.querySelector('.game-modal')) game.start(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
