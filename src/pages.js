import { h } from './html.js';
import { t, label } from './i18n.js';
import { COUNTRIES, SECTORS, GOALS, VALUES, FACT_SLOTS, LOGOS, GCG_LOGO, CCA_HERO, sidesOf, detailOf } from './content.js';

let showLogos = true;
export const configure = ({ logos }) => { showLogos = logos; };

const logoRow = (cls = '') => h`<div class="logos ${cls}">${LOGOS.map((l) => h`<img src="/static/logos/${l.file}" alt="${l.alt}">`)}</div>`;
// opening screen: Gold Coast Games top-left, the partners top-right, all the same height
const topLogos = () => h`<div class="logos top"><img src="/static/logos/${GCG_LOGO.file}" alt="${GCG_LOGO.alt}"><span class="tp">${showLogos ? LOGOS.slice(1).map((l) => h`<img src="/static/logos/${l.file}" alt="${l.alt}">`) : ''}</span></div>`;
const heroLogo = () => h`<div class="logos hero"><img src="/static/logos/${LOGOS[0].file}" alt="${LOGOS[0].alt}"></div>`;

// logos: 'none' (game screens stay clean) | 'hero' (opening page: CCA only) | 'row' (opening/closing: CCA first, then partners)
export function layout({ title, body, lang = 'en', main = '', script = '', logos = 'none', bodyClass = '' }) {
  return h`<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<link rel="preload" href="/static/fonts/instrument-serif-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/static/app.css">
<script src="/static/sfx.js" defer></script><script src="/static/app.js" defer></script></head>
<body class="${bodyClass}">${logos === 'opening' || logos === 'row' ? topLogos() : ''}
<main class="${main}">${body}</main>${script ? h`<script src="${script}" defer></script>` : ''}
</body></html>`;
}

const msg = (lang, code) => (code === 'invalid' ? 'Please check this entry.' : code === 'max3' ? t(lang, 'work.values_max') : t(lang, 'err.required'));
const fieldErr = (E, k, lang) => (E[k] ? h`<p class="err" role="alert">${msg(lang, E[k])}</p>` : '');

function select(name, options, S, lang, E, required = true) {
  return h`<select id="f_${name}" name="${name}" ${required ? 'required' : ''}><option value="">${t(lang, 'about.choose')}</option>
  ${options.map((o) => { const id = o.id ?? o; const lab = o.id ? label(o, lang) : o;
    return h`<option value="${id}" ${S.get(name) === id ? 'selected' : ''}>${lab}</option>`; })}</select>`;
}

function textField(name, lab, S, E, lang, { type = 'text', required = false, max = 80, hint = '', autocomplete = '' } = {}) {
  return h`<div class="field"><label for="f_${name}">${lab}</label>
  <input id="f_${name}" name="${name}" type="${type}" maxlength="${max}" value="${S.get(name) ?? ''}" ${required ? 'required' : ''} ${autocomplete ? `autocomplete="${autocomplete}"` : ''}>
  ${hint ? h`<p class="hint">${hint}</p>` : ''}${fieldErr(E, name, lang)}</div>`;
}

const choiceRow = (name, opts, S, { required = true } = {}) => h`<div class="choices ${opts.length === 2 ? 'two' : 'five'}">
  ${opts.map(([v, lab], i) => h`<label class="choice"><input type="radio" name="${name}" value="${v}" ${S.get(name) === v ? 'checked' : ''} ${required && i === 0 ? 'required' : ''}><span>${lab}</span></label>`)}</div>`;

const pick = (name, opts, S, cls = '', required = true) => h`<div class="choices ${cls}" role="radiogroup">${opts.map(([v, lab, sub], i) => h`<label class="choice"><input type="radio" name="${name}" value="${v}" ${S.get(name) === v ? 'checked' : ''} ${required && i === 0 ? 'required' : ''}><span>${lab}${sub ? h`<small>${sub}</small>` : ''}</span></label>`)}</div>`;

// One statement = three screens, one tap each: the statement (agree/disagree), how sure you are, how far you would take it.
// Tapping locks the choice (the others recede), a line acknowledges it, then it moves on. phase picks the build-up lines.
function takeSteps(take, n, total, S, lang, phase = 'pre') {
  const k = `t_${take.id}`, kick = t(lang, 'take.label', { n, total });
  const levelNow = S.get(`${k}_level`) || (S.get(`${k}_stage`) === 'y' ? 'stage' : S.get(`${k}_say`) === 'y' ? 'aloud' : S.get(`${k}_say`) === 'n' ? 'quiet' : '');
  const S2 = { get: (name) => (name === `${k}_level` ? levelNow : S.get(name)) };
  const pad = (x) => String(x).padStart(2, '0');
  const meta = h`<div class="meta"><span class="count">${pad(n)}<i> / ${pad(total)}</i></span>
    <span class="ticks" aria-hidden="true">${Array.from({ length: total }, (_, i) => h`<i class="${i < n - 1 ? 'done' : i === n - 1 ? 'now' : ''}"></i>`)}</span></div>`;
  const opener = t(lang, `opener.${phase}.${n}`);
  const dt = detailOf(take.id), shown = dt ? dt.stem : take.text;   // two-option takes show a short question; the good and bad sit on the tiles
  const tile = (side) => dt ? [side === 'agree' ? 'agree' : 'disagree', sidesOf(take.id)[side], h`${dt[side].eg ? h`<i class="eg">${dt[side].eg}</i>` : ''}<i class="g">${dt[side].good}</i><i class="b">${dt[side].bad}</i>`] : null;
  const ackLevel = t(lang, n === total ? 'ack.level.last' : 'ack.level');
  return [
    h`<section class="step" data-step data-auto data-ack="${t(lang, 'ack.stance')}" data-title="${kick}">${meta}<p class="opener">${opener}</p>${dt?.setup ? h`<p class="setup">${dt.setup}</p>` : ''}<h2 class="take">${shown}</h2>
      <fieldset><legend class="sr">${take.text}</legend>${pick(`${k}_stance`, dt ? [tile('agree'), tile('disagree')] : [['agree', sidesOf(take.id)?.agree ?? t(lang, 'take.agree')], ['disagree', sidesOf(take.id)?.disagree ?? t(lang, 'take.disagree')]], S, `two big serif${sidesOf(take.id) ? ' lab' : ''}${dt ? ' detail' : ''}`)}</fieldset><p class="ack" aria-live="polite"></p></section>`,
    h`<section class="step" data-step data-auto data-ack="${t(lang, 'ack.strength')}" data-title="${kick}">${meta}<p class="echo">${shown}</p>
      <h2 class="ask">${t(lang, 'strength.ask')}</h2>
      <fieldset><legend class="sr">${t(lang, 'strength.ask')}</legend>${pick(`${k}_strength`, [1, 2, 3, 4, 5].map((i) => [String(i), t(lang, `strength.${i}`)]), S, 'stack words')}</fieldset><p class="ack" aria-live="polite"></p></section>`,
    h`<section class="step" data-step data-auto data-ack="${ackLevel}" data-title="${kick}">${meta}<p class="echo">${shown}</p>
      <h2 class="ask">${t(lang, 'level.ask')}</h2>
      <fieldset><legend class="sr">${t(lang, 'level.ask')}</legend>${pick(`${k}_level`, [['quiet', t(lang, 'level.quiet')], ['aloud', t(lang, 'level.aloud')], ['stage', t(lang, 'level.stage')]], S2, 'stack words')}</fieldset><p class="ack" aria-live="polite"></p></section>`,
  ];
}

// One question per screen: small label, one big headline, one input, one short line. Back/Continue sit at the bottom.
function ask({ k, title, hint = '', body, optional = false, auto = false, skip = false }, lang) {
  return h`<section class="step" data-step ${auto ? 'data-auto' : ''} ${optional ? 'data-optional' : ''} ${skip ? 'data-skippable' : ''} data-title="${title}">
    <p class="kicker">${k}</p><h2 class="ask">${title}</h2>${hint ? h`<p class="hint">${hint}</p>` : ''}${body}</section>`;
}
const bigInput = (name, S, E, lang, { type = 'text', required = false, max = 80, autocomplete = '', label: lab = '' } = {}) => h`<div class="field">
  ${lab ? h`<label for="f_${name}">${lab}</label>` : ''}<input id="f_${name}" name="${name}" type="${type}" maxlength="${max}" value="${S.get(name) ?? ''}" ${required ? 'required' : ''} ${autocomplete ? `autocomplete="${autocomplete}"` : ''}>${fieldErr(E, name, lang)}</div>`;
const chipPick = (name, options, S, lang, required = true) => h`<div class="chips">${options.map((o, i) => h`<label class="chip"><input type="radio" name="${name}" value="${o.id}" ${S.get(name) === o.id ? 'checked' : ''} ${required && i === 0 ? 'required' : ''}><span>${label(o, lang)}</span></label>`)}</div>`;

function factStep(f, S, lang) {
  if (f.kind === 'true_false') {
    return h`<section class="step" data-step data-title="${t(lang, 'fact.title')}"><p class="kicker">${t(lang, 'fact.title')}</p>
    <p class="fact">${f.text}</p>
    ${choiceRow(`fact_${f.id}`, [['y', t(lang, 'fact.true')], ['n', t(lang, 'fact.false')]], S, { required: false })}
    <p class="reveal" data-reveal hidden>${f.reveal_text}</p></section>`;
  }
  return h`<section class="step" data-step data-title="${t(lang, 'fact.title')}"><p class="kicker">${t(lang, 'fact.title')}</p>
  <p class="fact">${f.text}</p><p class="hint">${f.reveal_text}</p></section>`;
}

function wizard({ action, id, steps, hidden = {}, lang, E = {}, extraTop = '' }) {
  const nErr = Object.keys(E).length;
  return h`<form method="post" action="${action}" data-wizard data-draft="${id}" data-steps="${steps.length}" data-audio="/static/audio/countries/" data-fx="/static/audio/fx/">
  ${Object.entries(hidden).map(([k, v]) => h`<input type="hidden" name="${k}" value="${v}">`)}
  ${extraTop}
  ${nErr ? h`<p class="err summary" role="alert">${t(lang, 'err.summary')}</p>` : ''}
  <div class="progress sr" data-progress></div>
  <p class="err summary" role="alert" data-error hidden></p>
  ${steps}
  <div class="nav" data-nav hidden><button type="button" class="btn ghost" data-back>${t(lang, 'nav.back')}</button>
    <button type="button" class="btn" data-next>${t(lang, 'nav.next')}</button>
    <button class="btn" type="submit" data-submit hidden>${t(lang, 'nav.submit')}</button></div>
  <noscript><button class="btn" type="submit">${t(lang, 'nav.submit')}</button></noscript>
  </form>`;
}

const consentStep = (S, E, lang) => h`<section class="step" data-step data-title="${t(lang, 'consent.title')}">
  <h2>${t(lang, 'consent.title')}</h2><p class="consent">${t(lang, 'consent.text')}</p>
  <label class="check"><input type="checkbox" name="consent_aggregate" value="1" required ${S.get('consent_aggregate') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.aggregate')}</span></label>
  ${fieldErr(E, 'consent_aggregate', lang)}</section>`;

export function landingPage(lang = 'en') {
  return layout({ lang, logos: 'opening', title: 'Before we begin | CCA 2026', main: 'narrow landing', body: h`
  <div class="stage"><img class="cca-hero" src="/static/logos/${CCA_HERO.file}" alt="${CCA_HERO.alt}">
  <h1 class="open">${t(lang, 'open.h1a')} ${t(lang, 'open.h1b')}</h1>
  <p class="lead">${t(lang, 'open.sub')}<br>${t(lang, 'open.sub2')}</p></div>
  <a class="btn big go" href="/start" data-theme="/static/audio/welcome-home.mp3">${t(lang, 'open.go')} &rarr;</a>` });
}

export function preForm({ takes, facts = [], S = new URLSearchParams(), E = {}, short = false, lang = 'en' }) {
  const action = short ? '/door' : '/start';
  const q = [
    // name, surname and country share one page; sector, and "why you are here", each get their own
    ask({ k: t(lang, 'who.k'), title: t(lang, 'q.name.t'), hint: t(lang, 'q.name.h'),
      body: h`${bigInput('first_name', S, E, lang, { required: true, autocomplete: 'given-name', label: t(lang, 'about.first') })}
        ${bigInput('surname', S, E, lang, { required: true, autocomplete: 'family-name', label: t(lang, 'about.surname') })}` }, lang),
    ask({ k: t(lang, 'q.sector.k'), title: t(lang, 'q.sector.t'), auto: true, body: h`${chipPick('sector', SECTORS, S, lang)}${fieldErr(E, 'sector', lang)}` }, lang),
    ask({ k: t(lang, 'q.goal.k'), title: t(lang, 'q.goal.t'), hint: t(lang, 'q.goal.h'), auto: true, body: chipPick('goal', GOALS, S, lang, true) }, lang),
    ask({ k: t(lang, 'q.memory.k'), title: t(lang, 'q.memory.t'), hint: t(lang, 'q.memory.h'), optional: true, body: bigInput('memory', S, E, lang, { max: 140, label: t(lang, 'about.memory') }) }, lang),
    ask({ k: t(lang, 'q.email.k'), title: t(lang, 'q.email.t'), hint: t(lang, 'q.email.h'), optional: true, body: bigInput('email', S, E, lang, { type: 'email', max: 254, autocomplete: 'email', label: t(lang, 'about.email') }) }, lang),
  ];
  const consent = ask({ k: t(lang, 'consent.k'), title: t(lang, 'consent.t'), body: h`<p class="consent">${t(lang, 'consent.text')}</p>
    <label class="check"><input type="checkbox" name="consent_aggregate" value="1" required ${S.get('consent_aggregate') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.aggregate')}</span></label>${fieldErr(E, 'consent_aggregate', lang)}` }, lang);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const steps = [ask({ k: t(lang, 'q.country.k'), title: t(lang, 'q.country.t'), hint: t(lang, 'q.country.h'),
    body: h`<div class="field"><label for="f_country" class="sr">${t(lang, 'about.country')}</label>${select('country', COUNTRIES, S, lang, E)}${fieldErr(E, 'country', lang)}</div>` }, lang)];
  takes.forEach((tk, i) => {
    steps.push(...takeSteps(tk, i + 1, takes.length, S, lang));
    const f = !short && byId.get(FACT_SLOTS[i + 1]);
    if (f) steps.push(factStep(f, S, lang));
  });
  steps.push(...q, consent);
  const top = short ? h`<h1>${t(lang, 'door.title')}</h1><p class="lead">${t(lang, 'door.lead')}</p>
    ${facts.length ? h`<div class="cards"><h2>${t(lang, 'door.facts')}</h2>${facts.map((f) => h`<p class="card">${f.text}</p>`)}</div>` : ''}` : '';
  return layout({ lang, title: 'Creatives Connect Afrika | Game', main: 'narrow wizard', body: wizard({ action, id: short ? 'door' : 'pre', steps, lang, E, extraTop: top }) });
}

export function donePage({ participant, existing = false, emailQueued = false, nextPlay = null, comeBack = null, lang = 'en' }) {
  if (nextPlay) { // at the event: the code, then straight into the game
    return layout({ lang, logos: 'row', title: 'Your number', main: 'narrow center', body: h`
    <h1>${t(lang, 'done.title')}</h1>
    ${existing ? h`<p class="note">${t(lang, 'done.existing')}</p>` : ''}
    <p class="kicker">${t(lang, 'done.number')}</p><p class="bignum" aria-label="${t(lang, 'done.number')}">${participant.number}</p>
    <p class="lead">${t(lang, 'done.screenshot')}</p>
    <p class="hint">${participant.email ? (emailQueued ? t(lang, 'done.email_pending') : t(lang, 'done.emailed')) : t(lang, 'done.no_email')}</p>
    ${nextPlay === 'open' ? h`<p><a class="btn" href="/play?t=${participant.magic_token}">Continue to the welcome game</a></p>` : ''}
    ${nextPlay === 'wait' ? h`<p class="lead">The welcome game opens shortly. Keep this number: it is your code.</p>` : ''}` });
  }
  const day = comeBack;
  return layout({ lang, bodyClass: 'night', title: 'Locked in', main: 'narrow cliff', body: h`
    ${existing ? h`<p class="cl hint c0">${t(lang, 'cliff.existing')}</p>` : ''}
    <p class="cl c1 display">${t(lang, 'cliff.1a')} <em>${t(lang, 'cliff.1b')}</em></p>
    <p class="cl c2 lead">${t(lang, 'cliff.2')}</p>
    <p class="cl c3 lead">${t(lang, 'cliff.3')}</p>
    <p class="cl c4 display">${t(lang, 'cliff.4')}</p>
    <p class="cl c5 lead">${day ? t(lang, 'cliff.5', { day }) : t(lang, 'cliff.5.now')}</p>
    <div class="cl c6 codecard"><p class="kicker">${t(lang, 'cliff.code')}</p><p class="bignum" aria-label="${t(lang, 'cliff.code')}">${participant.number}</p><p class="lead">${t(lang, 'cliff.keep')}</p></div>
    <p class="cl c7 hint">${participant.email ? (emailQueued ? t(lang, 'done.email_pending') : t(lang, 'cliff.email')) : t(lang, 'done.no_email')}</p>
    <p class="cl c8 display small">${day ? t(lang, 'cliff.bye', { day }) : t(lang, 'cliff.bye.now')}</p>` });
}

export function finalIdentityPage({ fails = 0, error = false, lang = 'en', state = 'open' }) {
  if (state !== 'open') return finalClosedPage(state, lang);
  return layout({ lang, title: 'Day 3 | Creatives Connect Afrika', main: 'narrow', body: h`
  <h1>Day 3: has the room <mark>moved</mark>?</h1><p class="lead">${t(lang, 'final.lead')}</p>
  <form method="post" action="/final/lookup"><input type="hidden" name="fails" value="${fails}">
    ${error ? h`<p class="err" role="alert">${t(lang, 'final.no_match')}</p>` : ''}
    <div class="field"><label for="fn">${t(lang, 'final.first')}</label><input id="fn" name="first_name" required maxlength="80" autocomplete="given-name"></div>
    <div class="field"><label for="num">${t(lang, 'final.number')}</label><input id="num" name="number" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"></div>
    <button class="btn" type="submit">${t(lang, 'final.go')}</button>
    ${fails >= 2 ? h`<div class="cards"><p>${t(lang, 'final.postonly_offer')}</p><button class="btn ghost" name="mode" value="postonly" type="submit" formnovalidate>${t(lang, 'final.postonly_btn')}</button></div>` : ''}
  </form><p class="hint">${t(lang, 'final.lost')}</p>` });
}

export function finalClosedPage(state, lang = 'en') {
  return layout({ lang, title: 'Day 3', main: 'narrow center', body: h`<h1>${t(lang, state === 'closed' ? 'final.closed' : 'final.not_open')}</h1>` });
}

export function finalForm({ takes, ticket, postOnly, S = new URLSearchParams(), E = {}, lang = 'en' }) {
  const steps = [];
  takes.forEach((tk, i) => steps.push(...takeSteps(tk, i + 1, takes.length, S, lang, 'final')));
  steps.push(ask({ k: t(lang, 'q.changed.k'), title: t(lang, 'q.changed.t'), body: h`<fieldset class="field" data-nonegroup><div class="chips stack">
    ${takes.map((tk) => h`<label class="chip"><input type="checkbox" name="changed" value="${tk.id}" ${S.getAll('changed').includes(tk.id) ? 'checked' : ''}><span>${tk.text}</span></label>`)}
    <label class="chip"><input type="checkbox" name="changed_none" value="1" ${S.get('changed_none') === '1' ? 'checked' : ''}><span>${t(lang, 'final.changed_none')}</span></label></div>${fieldErr(E, 'changed', lang)}</fieldset>` }, lang));
  steps.push(ask({ k: t(lang, 'q.shaped.k'), title: t(lang, 'q.shaped.t'), optional: true, body: h`<div class="field"><textarea id="f_shaped" name="what_shaped" maxlength="500" rows="5">${S.get('what_shaped') ?? ''}</textarea></div>` }, lang));
  steps.push(ask({ k: t(lang, 'q.story.k'), title: t(lang, 'q.story.t'), optional: true, body: h`<div class="field"><textarea id="f_story" name="story" maxlength="800" rows="6">${S.get('story') ?? ''}</textarea></div>
    <label class="check"><input type="checkbox" name="story_anon_ok" value="1" ${S.get('story_anon_ok') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.story_anon')}</span></label>
    <label class="check"><input type="checkbox" name="story_name_ok" value="1" ${S.get('story_name_ok') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.story_name')}</span></label>` }, lang));
  if (postOnly) {
    steps.push(
      ask({ k: t(lang, 'q.name.k'), title: t(lang, 'q.name.t'), body: bigInput('first_name', S, E, lang, { required: true, label: t(lang, 'about.first') }) }, lang),
      ask({ k: t(lang, 'q.country.k'), title: t(lang, 'q.country.t'), body: h`<div class="field">${select('country', COUNTRIES, S, lang, E)}${fieldErr(E, 'country', lang)}</div>` }, lang),
      ask({ k: t(lang, 'q.sector.k'), title: t(lang, 'q.sector.t'), auto: true, body: h`${chipPick('sector', SECTORS, S, lang)}${fieldErr(E, 'sector', lang)}` }, lang),
      ask({ k: t(lang, 'q.consent.k'), title: t(lang, 'q.consent.t'), body: h`<p class="consent">${t(lang, 'consent.text')}</p>
        <label class="check"><input type="checkbox" name="consent_aggregate" value="1" required ${S.get('consent_aggregate') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.aggregate')}</span></label>${fieldErr(E, 'consent_aggregate', lang)}` }, lang));
  }
  return layout({ lang, title: 'Day 3 | Creatives Connect Afrika', main: 'narrow wizard', body: wizard({ action: '/final', id: 'final', steps, hidden: { ticket }, lang, E }) });
}

export function finalDonePage(lang = 'en') {
  return layout({ lang, logos: 'row', title: 'Thank you', main: 'narrow center', body: h`<h1>${t(lang, 'final.done_title')}</h1><p class="lead">${t(lang, 'final.done_body')}</p>` });
}

export function messagePage(title, text, lang = 'en') {
  return layout({ lang, title, main: 'narrow center', body: h`<h1>${title}</h1><p class="lead">${text}</p>` });
}

export function playPage(lang = 'en', ident = null) {
  return layout({ lang, title: 'Welcome game | Creatives Connect Afrika', main: 'narrow play', script: '/static/play.js', body: h`
  ${showLogos ? logoRow('edge') : ''}
  <div id="play" data-deck="/play/deck.json" data-check="/play/check" data-resend="/play/resend" data-finish="/play/finish" data-join="/door" ${ident ? h`data-name="${ident.name}" data-number="${ident.number}"` : ''}><p class="lead">Loading\u2026</p></div>
  <noscript><p class="lead">This game needs JavaScript. Please use your phone or tablet browser.</p></noscript>` });
}

export function myIdentityPage({ error = false, lang = 'en' }) {
  return layout({ lang, title: 'What you said', main: 'narrow', body: h`
  <h1>What did you <em>say</em>?</h1><p class="lead">First name and your code, and we will show you.</p>
  <form method="post" action="/me/lookup">${error ? h`<p class="err" role="alert">${t(lang, 'final.no_match')}</p>` : ''}
    <div class="field"><label for="fn">${t(lang, 'final.first')}</label><input id="fn" name="first_name" required maxlength="80" autocomplete="given-name"></div>
    <div class="field"><label for="num">${t(lang, 'final.number')}</label><input id="num" name="number" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"></div>
    <button class="btn big" type="submit">${t(lang, 'final.go')}</button></form>` });
}

export function myAnswersPage({ participant, rows, lang = 'en' }) {
  return layout({ lang, title: 'What you said', main: 'narrow mine', body: h`
  <p class="eyebrow">${participant.first_name}</p><h1>What you said</h1><p class="lead">Find someone who said the opposite.</p>
  ${rows.map((r) => h`<div class="row"><p class="echo">${r.text}</p><p class="ask">${sidesOf(r.takeId)?.[r.stance] ?? t(lang, r.stance === 'agree' ? 'take.agree' : 'take.disagree')}</p>
    <p class="hint">${t(lang, `strength.${r.strength}`)}${r.level !== 'unknown' ? h` · ${t(lang, `level.${r.level}`)}` : ''}</p></div>`)}` });
}
