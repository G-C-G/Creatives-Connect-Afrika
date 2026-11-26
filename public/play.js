// Welcome game client. Portrait, one big thing per screen, self-paced, no staff needed.
// Entry: first name + code (from the onboarding), or arrive via the onboarding "continue" link (no typing).
(function () {
  var root = document.getElementById('play'); if (!root) return;
  var KEY = 'cca-play:v3';
  function store(v) { try { if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function mood(m) { document.body.classList.remove('win', 'miss', 'night'); if (m) document.body.classList.add(m); }
  function edge(show) { var l = document.querySelector('.logos.edge'); if (l) l.hidden = !show; }
  function screen(m, showLogos) { mood(m || null); edge(!!showLogos); root.innerHTML = ''; window.scrollTo(0, 0); return root; }
  var SFX = window.CCASfx || { tick: function () {}, rise: function () {}, chime: function () {}, miss: function () {}, toggle: function () { return false; }, isOn: function () { return false; } };
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function countUp(node, to, ms, pre, suf, ticks) {
    if (calm || !to) { node.textContent = pre + to + suf; return; }
    var t0 = null, last = -1;
    function f(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / ms), v = Math.round(to * k); node.textContent = pre + v + suf;
      if (ticks && v !== last) { last = v; SFX.tick(); } if (k < 1) requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }
  var sb = el('button', 'snd'); sb.type = 'button';
  function sbLabel() { sb.textContent = SFX.isOn() ? 'Sound on' : 'Sound off'; }
  sb.addEventListener('click', function () { SFX.toggle(); sbLabel(); }); sbLabel(); document.body.appendChild(sb);
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  var LABEL = { agree: ['Mostly agree', '60% or more agreed'], split: ['Split', 'between 40% and 60% agreed'], disagree: ['Mostly disagree', '60% or more disagreed'] };
  // either-or statements carry their own side names ("Take the free work" / "Stand by your rate") instead of agree / disagree
  function labelOf(R, k) {
    if (k === 'agree' && R.sideA) return ['Mostly: ' + R.sideA.toLowerCase(), '60% or more chose it'];
    if (k === 'disagree' && R.sideD) return ['Mostly: ' + R.sideD.toLowerCase(), '60% or more chose it'];
    if (k === 'split' && (R.sideA || R.sideD)) return ['Split', 'between 40% and 60% each way'];
    return LABEL[k];
  }
  // Draft wit: one little wink per moment, never a joke on every screen.
  var WIN = ['You know your stuff.', 'That was clean.', 'Nobody taught you that in a panel.', 'Okay, show-off.'];
  var MISS_ROOM = ['The room had other plans.', 'The room keeps its secrets.'];
  var deck, S = { name: '', number: '', i: 0, answers: [], deckId: null, done: null };

  function post(url, body, tries) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (r.status >= 500 && tries > 0) throw new Error('retry'); return r.json().then(function (j) { j.__status = r.status; return j; }); })
      .catch(function (e) { if (tries <= 0) throw e; return new Promise(function (res) { setTimeout(res, (4 - tries) * 1000); }).then(function () { return post(url, body, tries - 1); }); });
  }
  function getDeck(tries) {
    return fetch(root.getAttribute('data-deck')).then(function (r) { if (r.status >= 500 && tries > 0) throw new Error('retry'); return r.json().then(function (j) { j.__status = r.status; return j; }); })
      .catch(function (e) { if (tries <= 0) throw e; return new Promise(function (res) { setTimeout(res, (4 - tries) * 1000); }).then(function () { return getDeck(tries - 1); }); });
  }
  function begin(name, number) { S = { name: name, number: number, i: 0, answers: [], deckId: deck.id, done: null }; store(S); round(); }

  function intro() {
    var r = screen(null, true), cols = el('div', 'intro'), c1 = el('div'), c2 = el('div'); cols.appendChild(c1); cols.appendChild(c2); r.appendChild(cols);
    var h = el('h1'); h.innerHTML = 'Ready to <mark>play</mark>?'; r.appendChild(h);
    r.appendChild(el('p', 'lead', 'Guess the facts. Predict the room. Points for every right answer.'));
    var f = el('form'); f.noValidate = true;
    f.innerHTML = '<div class="field"><label for="n">First name</label><input id="n" autocomplete="given-name" maxlength="80" required></div>' +
      '<div class="field"><label for="num">Your 4-digit code</label><input id="num" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required></div>';
    var err = el('p', 'err'); err.hidden = true; f.appendChild(err);
    var b = el('button', 'btn big', 'Let’s play →'); b.type = 'submit'; f.appendChild(b);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var n = f.querySelector('#n').value.trim(), c = f.querySelector('#num').value.trim();
      if (!n || !/^[0-9]{4}$/.test(c)) { err.textContent = 'Enter your first name and your 4-digit code.'; err.hidden = false; return; }
      b.disabled = true;
      post(root.getAttribute('data-check'), { name: n, number: c }, 2).then(function (j) {
        b.disabled = false;
        if (j.ok) begin(j.name, c); else { err.textContent = (j.__status === 429 ? j.message : 'We could not match that. Check your code, or use the options below.'); err.hidden = false; }
      }).catch(function () { b.disabled = false; err.textContent = 'Could not check. Check your connection and try again.'; err.hidden = false; });
    });
    c1.appendChild(f);

    var no = el('div', 'cards');
    no.appendChild(el('p', 'hint', 'No code yet? Do the quick onboarding first (about 2 minutes). It takes you straight into the game.'));
    var a = el('a', 'btn ghost', 'Get my code'); a.href = root.getAttribute('data-join'); no.appendChild(a); c2.appendChild(no);

    var lost = el('details', 'cards'); lost.appendChild(el('summary', null, 'Lost your code? Email it to me'));
    var lf = el('form'); lf.noValidate = true;
    lf.innerHTML = '<div class="field" style="margin-top:12px"><label for="em">Email you registered with</label><input id="em" type="email" autocomplete="email"></div>';
    var lm = el('p', 'hint'); var lb = el('button', 'btn ghost', 'Email my code'); lb.type = 'submit'; lf.appendChild(lb); lf.appendChild(lm);
    lf.addEventListener('submit', function (e) {
      e.preventDefault(); var em = lf.querySelector('#em').value.trim(); if (!em) return;
      post(root.getAttribute('data-resend'), { email: em }, 2).then(function () { lm.textContent = 'If that email is registered, your code is on its way.'; })
        .catch(function () { lm.textContent = 'Could not send right now. Try again in a moment.'; });
    });
    lost.appendChild(lf); c2.appendChild(lost);
  }

  function dots(i, total) {
    var d = el('div', 'dots'); d.setAttribute('role', 'img'); d.setAttribute('aria-label', 'Round ' + (i + 1) + ' of ' + total);
    for (var k = 0; k < total; k++) d.appendChild(el('i', k < i ? 'done' : k === i ? 'now' : ''));
    return d;
  }

  function round() {
    if (S.i >= deck.rounds.length) return end();
    var R = deck.rounds[S.i], r = screen(null, false), total = deck.rounds.length;
    r.appendChild(dots(S.i, total));
    var qa = el('div', 'qa'), qcol = el('div', 'qcol'), ocol = el('div', 'ocol'); qa.appendChild(qcol); qa.appendChild(ocol); r.appendChild(qa);
    qcol.appendChild(el('p', 'kicker', R.type === 'fact' ? 'Guess it' : 'Predict the room'));
    var opts;
    if (R.type === 'fact') {
      qcol.appendChild(el('p', 'q', R.question));
      opts = R.options.map(function (o, i) { return { value: i, text: o }; });
    } else {
      qcol.appendChild(el('p', 'q', '“' + R.statement + '”'));
      qcol.appendChild(el('p', 'lead', 'We asked ' + R.n + ' delegates. Did most of them agree?'));
      opts = ['agree', 'split', 'disagree'].map(function (k) { var l = labelOf(R, k); return { value: k, text: l[0], hint: l[1] }; });
    }
    var box = ocol;
    var btns = opts.map(function (o) {
      var b = el('button', 'opt', o.text); b.type = 'button';
      if (o.hint) b.appendChild(el('small', null, o.hint));
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.disabled = true; if (x !== b) x.classList.add('fade'); }); b.classList.add('locked');
        S.answers[S.i] = o.value; SFX.tick(); buzz(15);
        var w = el('p', 'wait', 'Wait for it'); ocol.appendChild(w); SFX.rise();
        setTimeout(function () { reveal(R, o.value); }, calm ? 300 : 1000);
      });
      box.appendChild(b); return b;
    });
  }

  // The reveal is a full-screen colour moment: gold when right, red when not. Big thing on one side, the rest on the other when sideways.
  function reveal(R, v) {
    var ok = v === R.answer, r = screen(ok ? 'win' : 'miss', false), wrap = el('div', 'stage-wrap'), hero = el('div', 'hero'), rest = el('div', 'rest');
    wrap.appendChild(hero); wrap.appendChild(rest); r.appendChild(wrap);
    buzz(ok ? 30 : [10, 40, 10]); if (ok) SFX.chime(); else SFX.miss();
    if (R.type === 'fact') {
      hero.appendChild(el('p', 'kicker', 'Guess it'));
      hero.appendChild(el('h2', 'verdict pop', ok ? 'Correct.' : 'Not quite.'));
      if (ok) { var pl = el('p', 'plus pop', '+0'); hero.appendChild(pl); countUp(pl, deck.points, 450, '+', '', true); rest.appendChild(el('p', 'wink d1', R.wink || WIN[S.i % WIN.length])); }
      else { hero.appendChild(el('p', 'answer d1', 'It was ' + R.options[R.answer] + '.')); rest.appendChild(el('p', 'wink d2', R.wink || 'The next one is yours.')); }
      rest.appendChild(el('p', 'explain d3', R.explain));
    } else {
      var small = R.n < 20;
      hero.appendChild(el('p', 'kicker', 'The room said'));
      var st = el('p', 'stat pop', '0'); hero.appendChild(st);
      if (small) countUp(st, R.agree, 700, '', ' of ' + R.n, true); else countUp(st, Math.round(100 * R.agree / R.n), 800, '', '%', true);
      hero.appendChild(el('p', 'answer d1', (R.sideA ? 'chose \u201c' + R.sideA.toLowerCase() + '\u201d' : 'agreed') + (small ? '' : ' (' + R.agree + ' of ' + R.n + ')')));
      rest.appendChild(el('h2', 'verdict d2', ok ? 'You read the room. +' + deck.points : MISS_ROOM[(S.i >> 1) % MISS_ROOM.length]));
      rest.appendChild(el('p', 'explain d3', 'That makes it “' + labelOf(R, R.answer)[0] + '”. These are delegates who chose to answer, so it is directional only.'));
    }
    var last = S.i + 1 >= deck.rounds.length;
    var nb = el('button', 'btn big d3', last ? 'See my score →' : 'Next →'); nb.type = 'button';
    nb.addEventListener('click', function () { S.i++; store(S); round(); }); rest.appendChild(nb);
  }

  function localScore() { var c = 0; deck.rounds.forEach(function (R, i) { if (S.answers[i] === R.answer) c++; }); return c * deck.points; }

  function end() {
    var r = screen('night', true), max = deck.rounds.length * deck.points, pts = localScore();
    var wrap = el('div', 'stage-wrap'), hero = el('div', 'hero'), rest = el('div', 'rest'); wrap.appendChild(hero); wrap.appendChild(rest); r.appendChild(wrap);
    var kk = el('p', 'kicker', 'Your score'); kk.style.color = '#F2A81D'; hero.appendChild(kk);
    var sc = el('p', 'score pop', '0 / ' + max); hero.appendChild(sc); countUp(sc, pts, 1100, '', ' / ' + max, true);
    rest.appendChild(el('p', 'wink', pts === max ? 'Flawless.' : pts * 2 >= max ? 'Strong showing.' : 'The room keeps its secrets.'));
    var status = el('p', 'lead', 'Sending your score…'); status.style.color = '#ffffff'; rest.appendChild(status);
    var retry = el('button', 'btn', 'Send my score again'); retry.type = 'button'; retry.hidden = true; rest.appendChild(retry);
    function send() {
      retry.hidden = true; status.textContent = 'Sending your score…';
      post(root.getAttribute('data-finish'), { deck_id: deck.id, name: S.name, number: S.number, answers: S.answers }, 3).then(function (j) {
        if (j.ok) { sc.textContent = j.score + ' / ' + j.max; status.textContent = 'You are #' + j.rank + ' of ' + j.total + ' so far.' + (j.repeat ? ' Your first play is the one that counts.' : ''); S.done = j; store(S); }
        else { status.textContent = j.message || 'Could not save your score.'; }
      }).catch(function () { status.textContent = 'Could not send. Your answers are saved on this device.'; retry.hidden = false; });
    }
    retry.addEventListener('click', send);
    if (S.done) status.textContent = 'You are #' + S.done.rank + ' of ' + S.done.total + ' so far.'; else send();
  }

  getDeck(3).then(function (d) {
    if (!d.rounds) { screen(null, true).appendChild(el('p', 'lead', 'The game has not started yet.')); return; }
    deck = d; var saved = load(), pn = root.getAttribute('data-name'), pc = root.getAttribute('data-number');
    if (saved && saved.deckId === deck.id && (!pc || String(saved.number) === pc)) { S = saved; if (S.done) return end(); if (S.name && S.i > 0) return round(); }
    if (pn && pc) return begin(pn, pc);
    intro();
  }).catch(function () { screen(null, true).appendChild(el('p', 'err', 'Could not load the game. Check your connection and refresh.')); });
})();
