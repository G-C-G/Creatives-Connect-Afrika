// Progressive enhancement. Without JS the whole form is one long page and still submits.
(function () {
  var doc = document, root = doc.documentElement;
  var T = { network: 'Could not send. Your answers are saved on this phone. Tap Submit again to retry.', fix: 'Please complete the highlighted question.', max3: 'You can pick 3 at most.' };
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

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
    progress.innerHTML = '';
    var t = doc.createElement('span'); t.textContent = 'Step ' + (cur + 1) + ' of ' + steps.length;
    var bar = doc.createElement('div'); bar.className = 'bar'; bar.innerHTML = '<i style="width:' + Math.round(100 * (cur + 1) / steps.length) + '%"></i>';
    progress.appendChild(t); progress.appendChild(bar);
    back.style.visibility = cur === 0 ? 'hidden' : 'visible';
    var last = cur === steps.length - 1; next.hidden = last; submit.hidden = !last;
    errBox.hidden = true; saveDraft();
    if (steps[cur].scrollIntoView) window.scrollTo(0, 0);
  }
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
