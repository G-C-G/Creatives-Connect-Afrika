import { h } from './html.js';
import { t, label } from './i18n.js';
import { COUNTRIES, SECTORS, GOALS, VALUES, FACT_SLOTS, LOGOS, GCG_LOGO } from './content.js';

let showLogos = true;
export const configure = ({ logos }) => { showLogos = logos; };

const logoRow = (cls = '') => h`<div class="logos ${cls}">${LOGOS.map((l) => h`<img src="/static/logos/${l.file}" alt="${l.alt}">`)}</div>`;
const heroLogo = () => h`<div class="logos hero"><img src="/static/logos/${LOGOS[0].file}" alt="${LOGOS[0].alt}"></div>`;

// logos: 'none' (game screens stay clean) | 'hero' (opening page: CCA only) | 'row' (opening/closing: CCA first, then partners)
export function layout({ title, body, lang = 'en', main = '', script = '', logos = 'none' }) {
  return h`<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<link rel="stylesheet" href="/static/app.css">
<script src="/static/sfx.js" defer></script><script src="/static/app.js" defer></script></head>
<body>${showLogos ? (logos === 'hero' ? heroLogo() : logos === 'row' ? logoRow() : '') : ''}
<main class="${main}">${body}</main>${script ? h`<script src="${script}" defer></script>` : ''}
<footer><span>${t(lang, 'brand.partner')}</span><img class="gcg" src="/static/logos/${GCG_LOGO.file}" alt="${GCG_LOGO.alt}" width="84"></footer></body></html>`;
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

// One statement = three screens, one tap each, auto-advancing: stance, strength, how far you would take it.
function takeSteps(take, n, total, S, lang) {
  const k = `t_${take.id}`, kick = t(lang, 'take.label', { n, total });
  const levelNow = S.get(`${k}_level`) || (S.get(`${k}_stage`) === 'y' ? 'stage' : S.get(`${k}_say`) === 'y' ? 'aloud' : S.get(`${k}_say`) === 'n' ? 'quiet' : '');
  const S2 = { get: (name) => (name === `${k}_level` ? levelNow : S.get(name)) };
  return [
    h`<section class="step" data-step data-auto data-title="${kick}"><p class="kicker">${kick}</p><h2 class="take">${take.text}</h2>
      <fieldset><legend class="sr">${take.text}</legend>${pick(`${k}_stance`, [['agree', t(lang, 'take.agree')], ['disagree', t(lang, 'take.disagree')]], S, 'two big')}</fieldset></section>`,
    h`<section class="step" data-step data-auto data-title="${kick}"><p class="kicker">${kick}</p><p class="echo">${take.text}</p>
      <h2 class="ask">${t(lang, 'take.how_strong')}</h2>
      <fieldset><legend class="sr">${t(lang, 'take.how_strong')}</legend>${pick(`${k}_strength`, [1, 2, 3, 4, 5].map((i) => [String(i), String(i)]), S, 'five big')}
      <p class="ends"><span>${t(lang, 'take.little')}</span><span>${t(lang, 'take.completely')}</span></p></fieldset></section>`,
    h`<section class="step" data-step data-auto data-title="${kick}"><p class="kicker">${kick}</p><p class="echo">${take.text}</p>
      <h2 class="ask">${t(lang, 'take.how_far')}</h2>
      <fieldset><legend class="sr">${t(lang, 'take.how_far')}</legend>${pick(`${k}_level`, [['quiet', t(lang, 'take.quiet')], ['aloud', t(lang, 'take.aloud')], ['stage', t(lang, 'take.stage')]], S2, 'stack big')}</fieldset></section>`,
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
  return h`<form method="post" action="${action}" data-wizard data-draft="${id}" data-steps="${steps.length}">
  ${Object.entries(hidden).map(([k, v]) => h`<input type="hidden" name="${k}" value="${v}">`)}
  ${extraTop}
  ${nErr ? h`<p class="err summary" role="alert">${t(lang, 'err.summary')}</p>` : ''}
  <div class="progress" data-progress hidden></div>
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
  return layout({ lang, logos: 'hero', title: 'Welcome to the game | Creatives Connect Afrika', main: 'narrow landing', body: h`
  <h1>Welcome to the <mark>game</mark></h1>
  <p class="lead">${t(lang, 'landing.lead')}</p>
  <p class="hint">${t(lang, 'landing.share')}</p>
  <a class="btn big" href="/start">${t(lang, 'landing.start')} &rarr;</a>` });
}

export function preForm({ takes, facts = [], S = new URLSearchParams(), E = {}, short = false, lang = 'en' }) {
  const action = short ? '/door' : '/start';
  const q = [
    // name, surname and country share one page; sector, and "why you are here", each get their own
    ask({ k: t(lang, 'q.name.k'), title: t(lang, 'q.name.t'), hint: t(lang, 'q.name.h'),
      body: h`${bigInput('first_name', S, E, lang, { required: true, autocomplete: 'given-name', label: t(lang, 'about.first') })}
        ${bigInput('surname', S, E, lang, { required: true, autocomplete: 'family-name', label: t(lang, 'about.surname') })}
        <div class="field"><label for="f_country">${t(lang, 'about.country')}</label>${select('country', COUNTRIES, S, lang, E)}${fieldErr(E, 'country', lang)}</div>` }, lang),
    ask({ k: t(lang, 'q.sector.k'), title: t(lang, 'q.sector.t'), auto: true, body: h`${chipPick('sector', SECTORS, S, lang)}${fieldErr(E, 'sector', lang)}` }, lang),
    ask({ k: t(lang, 'q.goal.k'), title: t(lang, 'q.goal.t'), hint: t(lang, 'q.goal.h'), auto: true, body: chipPick('goal', GOALS, S, lang, true) }, lang),
    ask({ k: t(lang, 'q.email.k'), title: t(lang, 'q.email.t'), hint: t(lang, 'q.email.h'), optional: true, body: bigInput('email', S, E, lang, { type: 'email', max: 254, autocomplete: 'email', label: t(lang, 'about.email') }) }, lang),
  ];
  const extras = short ? [] : [
    ask({ k: t(lang, 'q.project.k'), title: t(lang, 'q.project.t'), hint: t(lang, 'q.project.h'), optional: true, body: bigInput('project', S, E, lang, { max: 140 }) }, lang),
    ask({ k: t(lang, 'q.values.k'), title: t(lang, 'q.values.t'), hint: t(lang, 'q.values.h'), optional: true,
      body: h`<fieldset class="field" data-maxcheck="3"><div class="chips">${VALUES.map((v) => h`<label class="chip"><input type="checkbox" name="values" value="${v.id}" ${S.getAll('values').includes(v.id) ? 'checked' : ''}><span>${label(v, lang)}</span></label>`)}</div><p class="hint" data-maxmsg></p>${fieldErr(E, 'values', lang)}</fieldset>` }, lang),
    ask({ k: t(lang, 'q.contact.k'), title: t(lang, 'q.contact.t'), hint: t(lang, 'q.contact.h'), auto: true, skip: true,
      body: pick('contact_opt_in', [['1', t(lang, 'q.contact.yes')], ['0', t(lang, 'q.contact.no')]], S, 'two big', false) }, lang),
  ];
  const consent = ask({ k: t(lang, 'q.consent.k'), title: t(lang, 'q.consent.t'), body: h`<p class="consent">${t(lang, 'consent.text')}</p>
    <label class="check"><input type="checkbox" name="consent_aggregate" value="1" required ${S.get('consent_aggregate') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.aggregate')}</span></label>${fieldErr(E, 'consent_aggregate', lang)}` }, lang);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const steps = [];
  takes.forEach((tk, i) => {
    steps.push(...takeSteps(tk, i + 1, takes.length, S, lang));
    const f = !short && byId.get(FACT_SLOTS[i + 1]);
    if (f) steps.push(factStep(f, S, lang));
  });
  steps.push(...q, ...extras, consent);
  const top = short ? h`<h1>${t(lang, 'door.title')}</h1><p class="lead">${t(lang, 'door.lead')}</p>
    ${facts.length ? h`<div class="cards"><h2>${t(lang, 'door.facts')}</h2>${facts.map((f) => h`<p class="card">${f.text}</p>`)}</div>` : ''}` : '';
  return layout({ lang, title: 'Creatives Connect Afrika | Game', main: 'narrow wizard', body: wizard({ action, id: short ? 'door' : 'pre', steps, lang, E, extraTop: top }) });
}

export function donePage({ participant, existing = false, emailQueued = false, nextPlay = null, lang = 'en' }) {
  return layout({ lang, logos: 'row', title: 'Your number', main: 'narrow center', body: h`
  <h1>${t(lang, 'done.title')}</h1>
  ${existing ? h`<p class="note">${t(lang, 'done.existing')}</p>` : ''}
  <p class="kicker">${t(lang, 'done.number')}</p><p class="bignum" aria-label="${t(lang, 'done.number')}">${participant.number}</p>
  <p class="lead">${t(lang, 'done.screenshot')}</p>
  <p class="hint">${participant.email ? (emailQueued ? t(lang, 'done.email_pending') : t(lang, 'done.emailed')) : t(lang, 'done.no_email')}</p>
  ${nextPlay === 'open' ? h`<p><a class="btn" href="/play?t=${participant.magic_token}">Continue to the welcome game</a></p>` : ''}
  ${nextPlay === 'wait' ? h`<p class="lead">The welcome game opens shortly. Keep this number: it is your code.</p>` : ''}` });
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
  takes.forEach((tk, i) => steps.push(...takeSteps(tk, i + 1, takes.length, S, lang)));
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
