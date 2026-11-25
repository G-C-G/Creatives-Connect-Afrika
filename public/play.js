// Welcome game client. Portrait, one screen at a time, self-paced, no staff needed.
// Entry: first name + code (from the onboarding), or arrive via the onboarding "continue" link (no typing).
(function () {
  var root = document.getElementById('play'); if (!root) return;
  var KEY = 'cca-play:v2';
  function store(v) { try { if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function screen() { root.innerHTML = ''; window.scrollTo(0, 0); return root; }
  var LABEL = { agree: ['Mostly agree', '60% or more agreed'], split: ['Split', 'between 40% and 60% agreed'], disagree: ['Mostly disagree', '60% or more disagreed'] };
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

  function intro(prefill) {
    var r = screen();
    var h = el('h1'); h.innerHTML = 'Welcome <mark>game</mark>'; r.appendChild(h);
    r.appendChild(el('p', 'lead', 'Guess the facts. Predict the room. Points for every right answer. It is all on your device: take your time.'));
    var f = el('form'); f.noValidate = true;
    f.innerHTML = '<div class="field"><label for="n">First name</label><input id="n" autocomplete="given-name" maxlength="80" required></div>' +
      '<div class="field"><label for="num">Your 4-digit code</label><input id="num" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required></div>';
    var err = el('p', 'err'); err.hidden = true; f.appendChild(err);
    var b = el('button', 'btn', 'Start'); b.type = 'submit'; f.appendChild(b);
    if (prefill) { f.querySelector('#n').value = prefill.name || ''; f.querySelector('#num').value = prefill.number || ''; }
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var n = f.querySelector('#n').value.trim(), c = f.querySelector('#num').value.trim();
      if (!n || !/^[0-9]{4}$/.test(c)) { err.textContent = 'Enter your first name and your 4-digit code.'; err.hidden = false; return; }
      b.disabled = true;
      post(root.getAttribute('data-check'), { name: n, number: c }, 2).then(function (j) {
        b.disabled = false;
        if (j.ok) begin(j.name, c);
        else { err.textContent = (j.__status === 429 ? j.message : 'We could not match that. Check your code, or use the options below.'); err.hidden = false; }
      }).catch(function () { b.disabled = false; err.textContent = 'Could not check. Check your connection and try again.'; err.hidden = false; });
    });
    r.appendChild(f);

    var no = el('div', 'cards');
    no.appendChild(el('p', null, 'No code yet? Do the quick onboarding first (about 2 minutes). It takes you straight into the game.'));
    var a = el('a', 'btn ghost', 'Get my code'); a.href = root.getAttribute('data-join'); no.appendChild(a); r.appendChild(no);

    var lost = el('details', 'cards'); lost.appendChild(el('summary', null, 'Lost your code? Email it to me'));
    var lf = el('form'); lf.noValidate = true;
    lf.innerHTML = '<div class="field"><label for="em">Email you registered with</label><input id="em" type="email" autocomplete="email"></div>';
    var lm = el('p', 'hint'); var lb = el('button', 'btn ghost', 'Email my code'); lb.type = 'submit'; lf.appendChild(lb); lf.appendChild(lm);
    lf.addEventListener('submit', function (e) {
      e.preventDefault(); var em = lf.querySelector('#em').value.trim(); if (!em) return;
      post(root.getAttribute('data-resend'), { email: em }, 2).then(function () { lm.textContent = 'If that email is registered, your code is on its way.'; })
        .catch(function () { lm.textContent = 'Could not send right now. Try again in a moment.'; });
    });
    lost.appendChild(lf); r.appendChild(lost);
  }

  function round() {
    if (S.i >= deck.rounds.length) return end();
    var R = deck.rounds[S.i], r = screen(), total = deck.rounds.length;
    var prog = el('p', 'progress', 'Round ' + (S.i + 1) + ' of ' + total);
    var bar = el('div', 'bar'); bar.innerHTML = '<i style="width:' + Math.round(100 * (S.i + 1) / total) + '%"></i>'; prog.appendChild(bar); r.appendChild(prog);
    r.appendChild(el('p', 'kicker', R.type === 'fact' ? 'Guess it' : 'Predict the room'));
    var opts, correctVal = R.answer;
    if (R.type === 'fact') {
      r.appendChild(el('p', 'q', R.question));
      opts = R.options.map(function (o, i) { return { value: i, text: o }; });
    } else {
      r.appendChild(el('p', 'q', '“' + R.statement + '”'));
      r.appendChild(el('p', 'lead', 'We asked ' + R.n + ' delegates before the event. Did most of them agree?'));
      opts = ['agree', 'split', 'disagree'].map(function (k) { return { value: k, text: LABEL[k][0], hint: LABEL[k][1] }; });
    }
    var box = el('div'), after = el('div'); r.appendChild(box); r.appendChild(after);
    var btns = opts.map(function (o) {
      var b = el('button', 'opt', o.text); b.type = 'button';
      if (o.hint) b.appendChild(el('small', null, o.hint));
      b.addEventListener('click', function () { choose(o.value); }); box.appendChild(b); return b;
    });
    function choose(v) {
      S.answers[S.i] = v; var ok = v === correctVal;
      btns.forEach(function (b, i) { b.disabled = true; var o = opts[i];
        if (o.value === correctVal) { b.classList.add('right'); b.insertBefore(document.createTextNode('✓ '), b.firstChild); }
        else if (o.value === v) { b.classList.add('picked'); b.insertBefore(document.createTextNode('✕ '), b.firstChild); } });
      after.appendChild(el('p', 'verdict ' + (ok ? 'ok' : 'no'), ok ? 'Correct! +' + deck.points : 'Not quite. +0'));
      var ex = el('p', 'explain');
      ex.textContent = R.type === 'fact' ? R.explain : 'The room: ' + R.label + ' agreed. That makes it “' + LABEL[R.answer][0] + '”. (Self-selected, so directional only.)';
      after.appendChild(ex);
      var nb = el('button', 'btn', S.i + 1 >= total ? 'See my score' : 'Next'); nb.type = 'button';
      nb.addEventListener('click', function () { S.i++; store(S); round(); }); after.appendChild(nb);
      if (nb.scrollIntoView) nb.scrollIntoView({ block: 'nearest' });
    }
  }

  function localScore() { var c = 0; deck.rounds.forEach(function (R, i) { if (S.answers[i] === R.answer) c++; }); return c * deck.points; }

  function end() {
    var r = screen(), max = deck.rounds.length * deck.points;
    r.appendChild(el('p', 'kicker', 'Your score'));
    var sc = el('p', 'score', localScore() + ' / ' + max); r.appendChild(sc);
    var status = el('p', 'lead', 'Sending your score…'); r.appendChild(status);
    var retry = el('button', 'btn ghost', 'Send my score again'); retry.type = 'button'; retry.hidden = true; r.appendChild(retry);
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
    if (!d.rounds) { screen().appendChild(el('p', 'lead', 'The game has not started yet.')); return; }
    deck = d; var saved = load(), pn = root.getAttribute('data-name'), pc = root.getAttribute('data-number');
    if (saved && saved.deckId === deck.id && (!pc || String(saved.number) === pc)) { S = saved; if (S.done) return end(); if (S.name && S.i > 0) return round(); }
    if (pn && pc) return begin(pn, pc);            // arrived from the onboarding screen: no typing
    intro(null);
  }).catch(function () { screen().appendChild(el('p', 'err', 'Could not load the game. Check your connection and refresh.')); });
})();
