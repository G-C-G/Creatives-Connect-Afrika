// In-browser stand-in for the server, used only by the PREVIEW build. Nothing is sent anywhere; state lives in this browser's localStorage.
(function () {
  var KEY = 'cca-pv';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function reg() { try { return JSON.parse(get(KEY) || 'null'); } catch (e) { return null; } }
  var norm = function (s) { return String(s || '').trim().toLowerCase(); };
  var realFetch = window.fetch.bind(window);
  function json(o, status) { return Promise.resolve(new Response(JSON.stringify(o), { status: status || 200, headers: { 'Content-Type': 'application/json' } })); }
  // a made-up room of 40 players to rank against
  function fakeScores(max, step) { var out = [], x = 7; for (var i = 0; i < 40; i++) { x = (x * 16807) % 2147483647; out.push(Math.round(((x / 2147483647) * 0.8 + 0.1) * (max / step)) * step); } return out; }

  window.fetch = function (url, opts) {
    var path = new URL(url, location.href).pathname, method = ((opts && opts.method) || 'GET').toUpperCase();
    if (method === 'POST') {
      if (/\/(start|door)$/.test(path)) {
        var p = new URLSearchParams(opts.body), code = String(1000 + Math.floor(Math.random() * 9000));
        set(KEY, JSON.stringify({ name: (p.get('first_name') || '').trim(), code: code }));
        return json({ ok: true, redirect: 'done.html' });
      }
      if (/\/play\/check$/.test(path)) {
        var b = JSON.parse(opts.body), me = reg();
        var ok = (me && norm(b.name) === norm(me.name) && String(b.number) === me.code) || String(b.number) === '1234';
        return ok ? json({ ok: true, name: String(b.name).trim() }) : json({ ok: false, message: 'We could not match that name and code.' }, 422);
      }
      if (/\/play\/resend$/.test(path)) return json({ ok: true });
      if (/\/play\/finish$/.test(path)) {
        var body = JSON.parse(opts.body);
        return realFetch('deck.json').then(function (r) { return r.json(); }).then(function (deck) {
          var prev = get('cca-pv-play'), pts = deck.points, max = deck.rounds.length * pts, score, repeat = false;
          if (prev) { score = +prev; repeat = true; }
          else { var c = 0; deck.rounds.forEach(function (R, i) { if (body.answers && body.answers[i] === R.answer) c++; }); score = c * pts; set('cca-pv-play', String(score)); }
          var rank = 1 + fakeScores(max, pts).filter(function (s) { return s > score; }).length;
          return json({ ok: true, score: score, max: max, rank: rank, total: 41, repeat: repeat });
        });
      }
    }
    return realFetch(url, opts);
  };

  document.addEventListener('DOMContentLoaded', function () {
    var me = reg();
    // after onboarding: show the code, and a way into the game
    [].slice.call(document.querySelectorAll('[data-code]')).forEach(function (e) { e.textContent = me ? me.code : '1234'; });
    var cliff = document.querySelector('main.cliff');
    if (cliff) {
      var c7 = cliff.querySelector('.c7'); if (c7) c7.textContent = 'Preview: nothing is emailed or saved. Screenshot your code.';
      var go = document.createElement('p'); go.className = 'cl c8'; go.style.animationDelay = '6.6s';
      go.innerHTML = '<a class="btn big" href="play.html">Preview the welcome game &rarr;</a>'; cliff.appendChild(go);
    }
    // the welcome game: skip retyping if you just did the onboarding
    var play = document.getElementById('play');
    if (play) {
      if (me && !play.getAttribute('data-name')) { play.setAttribute('data-name', me.name || 'You'); play.setAttribute('data-number', me.code); }
      var note = document.createElement('p'); note.className = 'hint'; note.style.cssText = 'margin:28px auto 0;padding:0 24px;max-width:560px';
      note.textContent = 'Preview: sample questions (not yet verified) and a made-up room of 60. Use your own code, or 1234.';
      play.parentNode.insertBefore(note, play.nextSibling);
    }
    // a quiet line at the very bottom of the page (not floating over anything)
    var line = document.createElement('p');
    line.style.cssText = 'text-align:center;font:600 12px/1.4 system-ui,sans-serif;color:#888;margin:0;padding:6px 16px 22px';
    line.innerHTML = 'Preview, nothing saved &middot; <a href="start.html" id="pv-restart" style="color:#B71C25">Restart</a> &middot; <a href="sounds.html" style="color:#B71C25">Sound test</a>';
    if (document.querySelector('main.landing')) { return; }
    if (false) line.style.cssText = 'position:fixed;left:24px;bottom:18px;margin:0;padding:0;text-align:left;font:600 11px/1.4 system-ui,sans-serif;color:#888';
    document.body.appendChild(line);
    document.getElementById('pv-restart').addEventListener('click', function () {
      try { Object.keys(localStorage).filter(function (k) { return /^cca-/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    });
  });
})();
