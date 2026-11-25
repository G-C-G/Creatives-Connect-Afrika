// Progressive enhancement. Without JS the whole form is one long page and still submits.
(function () {
  var doc = document, root = doc.documentElement;
  var T = { network: 'Could not send. Your answers are saved on this phone. Tap Submit again to retry.', fix: 'Please complete the highlighted question.', max3: 'You can pick 3 at most.' };
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, SFX = window.CCASfx;
  // quiet sound toggle (off by default) on the opening, the questions and the ending
  if (SFX && doc.querySelector('main.wizard, main.landing, main.cliff')) {
    var pill = doc.createElement('button'); pill.type = 'button'; pill.className = 'snd';
    var pillLabel = function () { pill.textContent = SFX.isOn() ? 'Sound on' : 'Sound off'; };
    pill.addEventListener('click', function () { SFX.toggle(); pillLabel(); }); pillLabel(); doc.body.appendChild(pill);
  }
  // the ending: a low note as it starts, one hit as the big question lands
  if (SFX && doc.querySelector('main.cliff') && !calm) { setTimeout(function () { SFX.cliff(); }, 250); setTimeout(function () { SFX.boom(); }, 2800); }

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
    var ack = st.querySelector('.ack'); if (ack) ack.textContent = st.getAttribute('data-ack') || '';
    if (SFX) SFX.lock();
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (x) {}
    setTimeout(function () { st.classList.remove('locking'); if (steps[cur] === st && !valid(st)) show(cur + 1); }, calm ? 160 : 650);
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
})();
