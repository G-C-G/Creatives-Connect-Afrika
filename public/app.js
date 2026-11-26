// Progressive enhancement. Without JS the whole form is one long page and still submits.
(function () {
  var doc = document, root = doc.documentElement;
  var T = { network: 'Could not send. Your answers are saved on this phone. Tap Submit again to retry.', fix: 'Please complete the highlighted question.', max3: 'You can pick 3 at most.' };
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, SFX = window.CCASfx;
  // a small Sound pill on the questions and the ending (the opening has its own line instead)
  function ensurePill() {
    if (!SFX || doc.querySelector('.snd') || !doc.querySelector('main.wizard, main.cliff')) return;
    var pill = doc.createElement('button'); pill.type = 'button'; pill.className = 'snd';
    var pillLabel = function () { pill.textContent = SFX.isOn() ? 'Sound on' : 'Sound off'; };
    pill.addEventListener('click', function () { SFX.toggle(); pillLabel(); }); pillLabel(); doc.body.appendChild(pill);
  }
  ensurePill();
  // the opening title says "Before we begin" in one written African language after another. Edit this list freely; every line needs a native speaker's check before launch.
  var GREET = [['Before we begin', 'English', 'en'], ['Kabla ya kuanza', 'Swahili', 'sw'], ['K\u00ed a t\u00f3 b\u1eb9\u0300r\u1eb9\u0300', 'Yoruba', 'yo'], ['Avant de commencer', 'French', 'fr'],
    ['Kafin mu fara', 'Hausa', 'ha'], ['Ngaphambi kokuba siqale', 'Zulu', 'zu'], ['\u0642\u0628\u0644 \u0623\u0646 \u0646\u0628\u062f\u0623', 'Arabic', 'ar', 1], ['Ansa na y\u025br\u025bhy\u025b ase\u025b', 'Twi', 'tw'],
    ['\u12a8\u121d\u1300\u1218\u122b\u127b\u1295 \u1260\u134a\u1275', 'Amharic', 'am'], ['Tupu any\u1ecb amalite', 'Igbo', 'ig'], ['Antes de come\u00e7armos', 'Portuguese', 'pt'], ['Phambi kokuba siqale', 'Xhosa', 'xh'],
    ['Balaa nu t\u00e0mbalee', 'Wolof', 'wo'], ['Ka hor intaynaan bilaabin', 'Somali', 'so'], ['Mbere yo gutangira', 'Kinyarwanda', 'rw'], ['Voordat ons begin', 'Afrikaans', 'af'], ['Liboso ya kobanda', 'Lingala', 'ln'], ['Pele re qala', 'Sesotho', 'st']];
  var cyc = doc.querySelector('.cyc');
  if (cyc && !calm) {
    var ct = cyc.querySelector('.cyc-text'), cl = cyc.querySelector('.cyc-lang'), gi = 0;
    // every language stays on ONE line: shrink the type a little until it fits
    var fit = function () { ct.style.fontSize = ''; var fs = parseFloat(getComputedStyle(ct).fontSize); while (ct.getBoundingClientRect().width > cyc.clientWidth && fs > 15) { fs -= 1; ct.style.fontSize = fs + 'px'; } };
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fit); fit();
    setInterval(function () {
      cyc.classList.add('out');
      setTimeout(function () {
        gi = (gi + 1) % GREET.length; var g = GREET[gi];
        ct.textContent = g[0]; cl.textContent = g[1]; ct.setAttribute('lang', g[2]); ct.setAttribute('dir', g[3] ? 'rtl' : 'ltr');
        fit(); cyc.classList.remove('out');
      }, 320);
    }, 2800);
  }
  // the opening: "Sound on · Tap here for the full experience". Tapping plays the welcome motif so people can check their phone is ready.
  var sl = doc.querySelector('[data-soundline]');
  if (sl && SFX) {
    var slLabel = function () { sl.textContent = SFX.isOn() ? 'Sound on \u00b7 Tap here for the full experience' : 'Turn sound on \u00b7 Tap here for the full experience'; };
    slLabel(); sl.addEventListener('click', function () { SFX.set(true); if (SFX.themePlaying()) { slLabel(); return; } SFX.welcome(); slLabel(); startSong(); });
  }
  // the welcome song plays as soon as the link opens. Phones usually refuse sound before a touch, so if it is refused it starts on the very first touch anywhere
  // (except the Let's go button, which ends the song). It stops when the questions begin.
  var theme = doc.querySelector('main.landing a.go');
  function startSong() { if (SFX && theme && SFX.isOn() && !SFX.themePlaying()) SFX.theme(theme.getAttribute('data-theme'), true); }
  if (SFX && theme) {
    startSong();
    var first = function (e) { if (e.target && e.target.closest && e.target.closest('a.go')) return; startSong(); };
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { doc.addEventListener(ev, first, { once: true, capture: true }); });
  }
  // the ending: a low note as it starts, one hit as the big question lands
  if (SFX && doc.querySelector('main.cliff') && !calm) { setTimeout(function () { SFX.cliff(); }, 250); setTimeout(function () { SFX.boom(); }, 2800); }

  function initWizard() {
  var form = doc.querySelector('form[data-wizard]');
  if (!form) return;
  root.classList.add('js');
  form.noValidate = true;
  var steps = [].slice.call(form.querySelectorAll('[data-step]'));
  var progress = form.querySelector('[data-progress]'), nav = form.querySelector('[data-nav]');
  var back = form.querySelector('[data-back]'), next = form.querySelector('[data-next]');
  var submit = form.querySelector('[data-submit]'), errBox = form.querySelector('[data-error]');
  var key = 'cca-draft:' + form.getAttribute('data-draft'), cur = 0, sending = false;

  // ---- draft ----
  function serialize() {
    var o = {};
    [].slice.call(form.elements).forEach(function (el) {
      if (!el.name || el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return;
      if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else if (el.type === 'checkbox') { (o[el.name] = o[el.name] || []); if (el.checked) o[el.name].push(el.value); }
      else o[el.name] = el.value;
    });
    return o;
  }
  function saveDraft() { store(key, JSON.stringify({ v: serialize(), s: cur })); }
  function restore() {
    var raw = load(key); if (!raw) return;
    try {
      var d = JSON.parse(raw), v = d.v || {};
      [].slice.call(form.elements).forEach(function (el) {
        if (!el.name || !(el.name in v)) return;
        if (el.type === 'radio') el.checked = v[el.name] === el.value;
        else if (el.type === 'checkbox') el.checked = (v[el.name] || []).indexOf(el.value) > -1;
        else if (!el.value) el.value = v[el.name];
      });
      cur = Math.min(d.s || 0, steps.length - 1);
    } catch (e) {}
  }
  form.addEventListener('input', saveDraft); form.addEventListener('change', saveDraft);
  // picking a country plays a short clip of its song (a file you add: public/audio/countries/<country>.mp3). No file, no sound. Moving on stops it.
  var countrySel = form.querySelector('select[name=country]'), audioBase = form.getAttribute('data-audio');
  function slug(c) { return String(c).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  var AFRICAN = {"algeria":1,"angola":1,"benin":1,"botswana":1,"burkina-faso":1,"burundi":1,"cabo-verde":1,"cameroon":1,"central-african-republic":1,"chad":1,"comoros":1,"congo-republic":1,"cote-d-ivoire":1,"djibouti":1,"dr-congo":1,"egypt":1,"equatorial-guinea":1,"eritrea":1,"eswatini":1,"ethiopia":1,"gabon":1,"gambia":1,"ghana":1,"guinea":1,"guinea-bissau":1,"kenya":1,"lesotho":1,"liberia":1,"libya":1,"madagascar":1,"malawi":1,"mali":1,"mauritania":1,"mauritius":1,"morocco":1,"mozambique":1,"namibia":1,"niger":1,"nigeria":1,"rwanda":1,"sao-tome-and-principe":1,"senegal":1,"seychelles":1,"sierra-leone":1,"somalia":1,"south-africa":1,"south-sudan":1,"sudan":1,"tanzania":1,"togo":1,"tunisia":1,"uganda":1,"zambia":1,"zimbabwe":1};
  var react = form.querySelector('[data-country-react]');
  if (countrySel && react) countrySel.addEventListener('change', function () {
    if (!countrySel.value) { react.textContent = ''; return; }
    react.textContent = countrySel.value.toUpperCase() + '. ' + (AFRICAN[slug(countrySel.value)] ? react.getAttribute('data-line') : '');
    react.classList.remove('pop'); void react.offsetWidth; react.classList.add('pop');
  });
  if (countrySel && SFX && audioBase) countrySel.addEventListener('change', function () { if (countrySel.value) SFX.snippet(audioBase + (AFRICAN[slug(countrySel.value)] ? slug(countrySel.value) : 'ghana') + '.mp3'); else SFX.stopSnippet(); });   // non-African countries quietly get the Ghana clip

  // ---- values: max 3 ----
  [].slice.call(form.querySelectorAll('[data-maxcheck]')).forEach(function (g) {
    var max = +g.getAttribute('data-maxcheck'), msg = g.querySelector('[data-maxmsg]');
    var boxes = [].slice.call(g.querySelectorAll('input[type=checkbox]'));
    function upd() { var n = boxes.filter(function (b) { return b.checked; }).length;
      boxes.forEach(function (b) { b.disabled = n >= max && !b.checked; });
      if (msg) msg.textContent = n >= max ? T.max3 : ''; }
    boxes.forEach(function (b) { b.addEventListener('change', upd); }); upd();
  });
  // ---- "none changed" excludes the others ----
  [].slice.call(form.querySelectorAll('[data-nonegroup]')).forEach(function (g) {
    var none = g.querySelector('input[name=changed_none]'), others = [].slice.call(g.querySelectorAll('input[name=changed]'));
    g.addEventListener('change', function (e) {
      if (e.target === none && none.checked) others.forEach(function (o) { o.checked = false; });
      else if (e.target !== none && e.target.checked) none.checked = false; });
  });
  // ---- fact reveal ----
  [].slice.call(form.querySelectorAll('[data-reveal]')).forEach(function (r) {
    r.parentNode.addEventListener('change', function () { r.hidden = false; });
  });


  // ---- "Where do you play?": search, pick many, add your own, A to Z ----
  [].slice.call(form.querySelectorAll('[data-acts]')).forEach(function (box) {
    var q = box.querySelector('[data-acts-q]'), list = box.querySelector('[data-acts-list]'), sel = box.querySelector('[data-acts-sel]'),
      none = box.querySelector('[data-acts-none]'), custom = box.querySelector('[data-acts-custom]'), az = box.querySelector('[data-acts-az]');
    var rows = [].slice.call(list.querySelectorAll('.act')), heads = [].slice.call(list.querySelectorAll('.acts-h'));
    var ok = doc.createElement('input'); ok.type = 'text'; ok.className = 'sr'; ok.tabIndex = -1; ok.setAttribute('aria-hidden', 'true'); ok.required = true; ok.name = '_acts_ok'; box.appendChild(ok);
    var addRow = doc.createElement('button'); addRow.type = 'button'; addRow.className = 'act-add'; addRow.hidden = true; list.insertBefore(addRow, list.firstChild);
    function norm(x) { return (x || '').trim().replace(/\s+/g, ' '); }
    function customs() { return [].slice.call(custom.querySelectorAll('input')); }
    function refresh() {
      sel.textContent = '';
      var n = 0;
      rows.forEach(function (r) { var c = r.querySelector('input'); if (c.checked) { n++; chip(r.getAttribute('data-label'), r.textContent, function () { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }); } });
      customs().forEach(function (i) { n++; chip(i.value, i.value.slice(7), function () { i.parentNode.removeChild(i); refresh(); form.dispatchEvent(new Event('change', { bubbles: true })); }); });
      ok.value = n ? '1' : '';
    }
    function chip(key, label, remove) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'act-chip'; b.textContent = label.trim() + ' \u00d7'; b.setAttribute('aria-label', 'Remove ' + label.trim()); b.addEventListener('click', remove); sel.appendChild(b);
    }
    function addCustom(text) {
      text = norm(text).slice(0, 60); if (!text) return;
      var exists = customs().some(function (i) { return i.value.toLowerCase() === ('custom:' + text).toLowerCase(); });
      if (!exists) { var i = doc.createElement('input'); i.type = 'hidden'; i.name = 'activity'; i.value = 'custom:' + text; custom.appendChild(i); }
      q.value = ''; filter(); refresh(); form.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function filter() {
      var v = norm(q.value).toLowerCase(), shown = 0, exact = false;
      rows.forEach(function (r) { var l = r.getAttribute('data-label'), m = !v || l.indexOf(v) > -1; r.hidden = !m; if (m) shown++; if (l === v) exact = true; });
      heads.forEach(function (h) { var any = false, n = h.nextElementSibling; while (n && !n.classList.contains('acts-h')) { if (n.classList.contains('act') && !n.hidden) any = true; n = n.nextElementSibling; } h.hidden = !any; });
      none.hidden = true; az.style.visibility = v ? 'hidden' : 'visible';
      if (v && !exact) { addRow.hidden = false; addRow.textContent = 'Add \u201c' + norm(q.value) + '\u201d as your own'; } else addRow.hidden = true;
    }
    q.addEventListener('input', filter);
    q.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return; e.preventDefault(); e.stopPropagation();
      var v = norm(q.value).toLowerCase(); if (!v) return;
      var first = rows.filter(function (r) { return !r.hidden; })[0];
      if (first && first.getAttribute('data-label') === v) { var c = first.querySelector('input'); c.checked = !c.checked; c.dispatchEvent(new Event('change', { bubbles: true })); q.value = ''; filter(); }
      else addCustom(q.value);
    });
    addRow.addEventListener('click', function () { addCustom(q.value); q.focus(); });
    list.addEventListener('change', function () { refresh(); });
    az.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-jump]'); if (!b) return; var h = list.querySelector('[data-letter="' + b.getAttribute('data-jump') + '"]'); if (h) list.scrollTop = h.offsetTop; });
    refresh(); filter();
  });

  // ---- "pick as many as you like" groups that need at least one ----
  [].slice.call(form.querySelectorAll('[data-atleast]')).forEach(function (box) {
    var ok = doc.createElement('input'); ok.type = 'text'; ok.className = 'sr'; ok.tabIndex = -1; ok.setAttribute('aria-hidden', 'true'); ok.required = true; ok.name = '_atleast'; box.appendChild(ok);
    function upd() { ok.value = box.querySelector('input[type=checkbox]:checked') ? '1' : ''; }
    box.addEventListener('change', upd); upd();
    var other = box.querySelector('[data-goal-other]'), oc = box.querySelector('input[name=goal][value=other]');
    if (other && oc) oc.addEventListener('change', function () { other.hidden = !oc.checked; if (oc.checked) { var t = other.querySelector('input'); if (t) setTimeout(function () { t.focus(); try { other.scrollIntoView({ block: 'nearest' }); } catch (e) {} }, 50); } });
  });

  // ---- wizard ----
  function valid(step) {
    var bad = null;
    [].slice.call(step.querySelectorAll('input,select,textarea')).forEach(function (el) {
      if (!bad && !el.checkValidity()) bad = el;
    });
    return bad;
  }
  function show(i) {
    cur = Math.max(0, Math.min(i, steps.length - 1));
    steps.forEach(function (s, j) { s.classList.toggle('on', j === cur); });
    progress.hidden = false; nav.hidden = false;
    progress.textContent = 'Step ' + (cur + 1) + ' of ' + steps.length; // screen readers only; the visible progress is the count and ticks
    [].slice.call(steps[cur].querySelectorAll('.fade,.locked')).forEach(function (n) { n.classList.remove('fade', 'locked'); });
    var ackEl = steps[cur].querySelector('.ack'); if (ackEl) ackEl.textContent = '';
    back.style.visibility = cur === 0 ? 'hidden' : 'visible';
    var last = cur === steps.length - 1, auto = steps[cur].hasAttribute('data-auto'), skippable = steps[cur].hasAttribute('data-skippable');
    next.hidden = last || (auto && !skippable); submit.hidden = !last;
    nav.classList.toggle('solo', auto && !skippable);
    refreshSkip();
    errBox.hidden = true; saveDraft();
    if (SFX && SFX.stopSnippet) SFX.stopSnippet();   // moving on ends the country snippet
    if (steps[cur].scrollIntoView) window.scrollTo(0, 0);
  }
  // optional step: the button says Skip until something is filled in
  function refreshSkip() {
    var st = steps[cur]; if (!st || !(st.hasAttribute('data-optional') || st.hasAttribute('data-skippable'))) { next.textContent = next.getAttribute('data-label') || next.textContent; return; }
    if (!next.getAttribute('data-label')) next.setAttribute('data-label', next.textContent);
    var filled = [].slice.call(st.querySelectorAll('input,select,textarea')).some(function (el) {
      return (el.type === 'checkbox' || el.type === 'radio') ? el.checked : !!el.value; });
    next.textContent = filled ? next.getAttribute('data-label') : 'Skip';
  }
  form.addEventListener('keydown', function (e) {
    var t = e.target; if (e.key !== 'Enter' || !t || t.tagName !== 'INPUT' || /^(checkbox|radio|submit|button)$/.test(t.type)) return;
    e.preventDefault(); if (cur < steps.length - 1) next.click(); else submit.click();
  });
  form.addEventListener('input', refreshSkip); form.addEventListener('change', refreshSkip);
  // one-tap screens: the choice LOCKS (it fills, the others recede), a line acknowledges it, then it moves on.
  // click also fires when re-tapping an already chosen answer, so going Back and tapping again still works.
  form.addEventListener('click', function (e) {
    var st = steps[cur];
    if (!st || !st.hasAttribute('data-auto') || !e.target || e.target.type !== 'radio' || !st.contains(e.target) || st.classList.contains('locking')) return;
    st.classList.add('locking');
    var chosen = e.target.closest('label');
    [].slice.call(st.querySelectorAll('label.choice, label.chip')).forEach(function (l) { l.classList.toggle('fade', l !== chosen); });
    if (chosen) chosen.classList.add('locked');
    var ack = st.querySelector('.ack'), amap = {}; try { amap = JSON.parse(st.getAttribute('data-acks') || '{}'); } catch (x) {}
    var line = amap[e.target.value] || st.getAttribute('data-ack') || '';
    if (st.getAttribute('data-last') && amap[e.target.value]) line = amap[e.target.value] + ' ' + st.getAttribute('data-last');
    if (ack) ack.textContent = line;
    // a small sound for how strongly they mean it, and for saying it on the stage
    if (SFX) { var nm0 = e.target.name; if (/_strength$/.test(nm0) && e.target.value === '5') setTimeout(function () { SFX.boom(); }, 60); if (/_level$/.test(nm0) && e.target.value === 'stage') setTimeout(function () { SFX.drum(); }, 60); }
    if (SFX) {   // a voice expression for this answer if you added one (public/audio/fx/<slot>.mp3), otherwise the synthesised lock sound
      var nm = e.target.name.replace(/^t_T\d+_/, ''), slot = /^(role|sector|goal)$/.test(nm) ? nm : nm + '-' + e.target.value, fxBase = form.getAttribute('data-fx');
      SFX.answer(fxBase ? fxBase + slot + '.mp3' : null);
    }
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (x) {}
    setTimeout(function () { st.classList.remove('locking'); if (steps[cur] === st && !valid(st)) show(cur + 1); }, calm ? 160 : (/_(strength|level)$/.test(e.target.name) ? 1000 : 750));
  });
  next.addEventListener('click', function () {
    var bad = valid(steps[cur]);
    if (bad) { errBox.textContent = T.fix; errBox.hidden = false; bad.focus(); return; }
    show(cur + 1);
  });
  back.addEventListener('click', function () { show(cur - 1); });

  function stepOf(name) { var el = form.elements[name]; el = el && el.length && !el.tagName ? el[0] : el;
    for (var i = 0; i < steps.length; i++) if (el && steps[i].contains(el)) return i; return -1; }

  function post(body, tries) {
    return fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: body })
      .then(function (r) { if (r.status >= 500 && tries > 0) throw new Error('retry'); return r.json().then(function (j) { j.status = r.status; return j; }); })
      .catch(function (e) { if (tries <= 0) throw e;
        return new Promise(function (res) { setTimeout(res, (4 - tries) * 1000); }).then(function () { return post(body, tries - 1); }); });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); if (sending) return;
    for (var i = 0; i < steps.length; i++) { var bad = valid(steps[i]); if (bad) { show(i); errBox.textContent = T.fix; errBox.hidden = false; bad.focus(); return; } }
    sending = true; submit.disabled = true;
    var body = new URLSearchParams(new FormData(form)).toString();
    post(body, 3).then(function (j) {
      if (j && j.ok) { store(key, null); location.href = j.redirect; return; }
      if (j && j.errors) { var first = Object.keys(j.errors)[0], si = stepOf(first); if (si > -1) show(si);
        errBox.textContent = (j.message || T.fix); errBox.hidden = false; return; }
      errBox.textContent = (j && j.message) || T.network; errBox.hidden = false;
    }).catch(function () { errBox.textContent = T.network; errBox.hidden = false; })
      .then(function () { sending = false; submit.disabled = false; });
  });

  restore(); show(cur);
  }
  initWizard();

  // The opening tap: start the welcome song inside this tap (phones only allow sound after a tap), then bring the questions into the SAME page
  // so the song keeps playing. If anything fails it falls back to a normal page load.
  var go = doc.querySelector('main.landing a.go');
  if (go) go.addEventListener('click', function (e) {
    e.preventDefault();
    var href = go.getAttribute('href');
    // a fresh start: nothing is ticked, even if an earlier try left answers behind on this phone
    try { Object.keys(localStorage).filter(function (k) { return /^cca-draft:/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (x) {}
    if (SFX) { SFX.themeStop(); SFX.set(true); }   // the welcome song belongs to the opening page: it stops here. Pressing Let's go turns the sound on (this tap also unlocks audio on phones)
    fetch(href, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('x'); return r.text(); }).then(function (t) {
      var d = new DOMParser().parseFromString(t, 'text/html'), m = d.querySelector('main'), cur = doc.querySelector('main');
      if (!m || !cur) throw new Error('x');
      cur.className = m.className; cur.innerHTML = m.innerHTML; doc.body.className = d.body.className;   // the question screens bring their own page colour
      var lg = doc.querySelector('.logos.top'); if (lg) lg.remove();
      doc.title = d.title; try { history.pushState({}, '', href); } catch (x) {}
      window.scrollTo(0, 0); initWizard(); ensurePill();
    }).catch(function () { location.href = href; });
  });
})();
