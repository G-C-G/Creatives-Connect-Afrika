import { h } from './html.js';
import { t, label } from './i18n.js';
import { COUNTRIES, SECTORS, GOALS, VALUES, FACT_SLOTS, LOGOS } from './content.js';

let showLogos = true;
export const configure = ({ logos }) => { showLogos = logos; };

export function layout({ title, body, lang = 'en', main = '' }) {
  return h`<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<link rel="stylesheet" href="/static/app.css">
<script src="/static/app.js" defer></script></head>
<body><header class="top">${t(lang, 'brand.name')}</header>
${showLogos ? h`<div class="logos">${LOGOS.map((l) => h`<img src="/static/logos/${l.file}" alt="${l.alt}" height="40" loading="eager">`)}</div>` : ''}
<main class="${main}">${body}</main>
<footer>${t(lang, 'brand.partner')}</footer></body></html>`;
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

function takeStep(take, n, total, S, lang) {
  const k = `t_${take.id}`;
  return h`<section class="step" data-step data-title="${t(lang, 'take.label', { n, total })}">
  <p class="kicker">${t(lang, 'take.label', { n, total })}</p>
  <h2 class="take">${take.text}</h2>
  <fieldset><legend class="sr">${take.text}</legend>
    ${choiceRow(`${k}_stance`, [['agree', t(lang, 'take.agree')], ['disagree', t(lang, 'take.disagree')]], S)}</fieldset>
  <fieldset><legend>${t(lang, 'take.strength')}</legend>
    ${choiceRow(`${k}_strength`, [1, 2, 3, 4, 5].map((i) => [String(i), String(i)]), S)}</fieldset>
  <fieldset><legend>${t(lang, 'take.say_aloud')}</legend>
    ${choiceRow(`${k}_say`, [['y', t(lang, 'yes')], ['n', t(lang, 'no')]], S, { required: false })}</fieldset>
  <fieldset><legend>${t(lang, 'take.on_stage')}</legend>
    ${choiceRow(`${k}_stage`, [['y', t(lang, 'yes')], ['n', t(lang, 'no')]], S, { required: false })}</fieldset>
  </section>`;
}

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
  <p class="progress" data-progress hidden></p>
  <p class="err summary" role="alert" data-error hidden></p>
  ${steps}
  <div class="nav" data-nav hidden><button type="button" class="btn ghost" data-back>${t(lang, 'nav.back')}</button>
    <button type="button" class="btn" data-next>${t(lang, 'nav.next')}</button></div>
  <noscript><button class="btn" type="submit">${t(lang, 'nav.submit')}</button></noscript>
  <button class="btn" type="submit" data-submit hidden>${t(lang, 'nav.submit')}</button>
  </form>`;
}

const consentStep = (S, E, lang) => h`<section class="step" data-step data-title="${t(lang, 'consent.title')}">
  <h2>${t(lang, 'consent.title')}</h2><p class="consent">${t(lang, 'consent.text')}</p>
  <label class="check"><input type="checkbox" name="consent_aggregate" value="1" required ${S.get('consent_aggregate') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.aggregate')}</span></label>
  ${fieldErr(E, 'consent_aggregate', lang)}</section>`;

export function landingPage(lang = 'en') {
  return layout({ lang, title: `${t(lang, 'landing.title')} | Gold Coast Games`, main: 'narrow', body: h`
  <h1>Where does the <mark>room</mark> stand?</h1><p class="lead">${t(lang, 'landing.lead')}</p>
  <ol class="how"><li>${t(lang, 'landing.step1')}</li><li>${t(lang, 'landing.step2')}</li><li>${t(lang, 'landing.step3')}</li></ol>
  <p class="hint">${t(lang, 'landing.time')}</p>
  <p class="consent">${t(lang, 'consent.text')}</p>
  <a class="btn" href="/start">${t(lang, 'landing.start')}</a>` });
}

export function preForm({ takes, facts = [], S = new URLSearchParams(), E = {}, short = false, lang = 'en' }) {
  const action = short ? '/door' : '/start';
  const about = h`<section class="step" data-step data-title="${t(lang, 'about.title')}"><h2>${t(lang, 'about.title')}</h2>
    ${textField('first_name', t(lang, 'about.first'), S, E, lang, { required: true, autocomplete: 'given-name' })}
    ${textField('surname', t(lang, 'about.surname'), S, E, lang, { required: true, autocomplete: 'family-name' })}
    ${textField('email', t(lang, 'about.email'), S, E, lang, { type: 'email', max: 254, hint: t(lang, 'about.email_hint'), autocomplete: 'email' })}
    <div class="field"><label for="f_country">${t(lang, 'about.country')}</label>${select('country', COUNTRIES, S, lang, E)}${fieldErr(E, 'country', lang)}</div>
    <div class="field"><label for="f_sector">${t(lang, 'about.sector')}</label>${select('sector', SECTORS, S, lang, E)}${fieldErr(E, 'sector', lang)}</div></section>`;
  const work = short ? '' : h`<section class="step" data-step data-title="${t(lang, 'work.title')}"><h2>${t(lang, 'work.title')}</h2>
    ${textField('project', t(lang, 'work.project'), S, E, lang, { max: 140 })}
    <div class="field"><label for="f_goal">${t(lang, 'work.goal')}</label>${select('goal', GOALS, S, lang, E, false)}</div>
    <fieldset class="field" data-maxcheck="3"><legend>${t(lang, 'work.values')}</legend>
      <div class="chips">${VALUES.map((v) => h`<label class="chip"><input type="checkbox" name="values" value="${v.id}" ${S.getAll('values').includes(v.id) ? 'checked' : ''}><span>${label(v, lang)}</span></label>`)}</div>
      <p class="hint" data-maxmsg></p>${fieldErr(E, 'values', lang)}</fieldset>
    <label class="check"><input type="checkbox" name="contact_opt_in" value="1" ${S.get('contact_opt_in') === '1' ? 'checked' : ''}><span>${t(lang, 'work.contact')}</span></label></section>`;
  const byId = new Map(facts.map((f) => [f.id, f]));
  const steps = [about, work];
  takes.forEach((tk, i) => {
    steps.push(takeStep(tk, i + 1, takes.length, S, lang));
    const f = !short && byId.get(FACT_SLOTS[i + 1]);
    if (f) steps.push(factStep(f, S, lang));
  });
  steps.push(consentStep(S, E, lang));
  const top = short ? h`<h1>${t(lang, 'door.title')}</h1><p class="lead">${t(lang, 'door.lead')}</p>
    ${facts.length ? h`<div class="cards"><h2>${t(lang, 'door.facts')}</h2>${facts.map((f) => h`<p class="card">${f.text}</p>`)}</div>` : ''}` : '';
  return layout({ lang, title: 'Gold Coast Games | CCA', main: 'narrow', body: wizard({ action, id: short ? 'door' : 'pre', steps, lang, E, extraTop: top }) });
}

export function donePage({ participant, existing = false, emailQueued = false, lang = 'en' }) {
  return layout({ lang, title: 'Your number', main: 'narrow center', body: h`
  <h1>${t(lang, 'done.title')}</h1>
  ${existing ? h`<p class="note">${t(lang, 'done.existing')}</p>` : ''}
  <p class="kicker">${t(lang, 'done.number')}</p><p class="bignum" aria-label="${t(lang, 'done.number')}">${participant.number}</p>
  <p class="lead">${t(lang, 'done.screenshot')}</p>
  <p class="hint">${participant.email ? (emailQueued ? t(lang, 'done.email_pending') : t(lang, 'done.emailed')) : t(lang, 'done.no_email')}</p>` });
}

export function finalIdentityPage({ fails = 0, error = false, lang = 'en', state = 'open' }) {
  if (state !== 'open') return finalClosedPage(state, lang);
  return layout({ lang, title: 'Day 3 | Gold Coast Games', main: 'narrow', body: h`
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
  if (postOnly) {
    steps.push(h`<section class="step" data-step data-title="${t(lang, 'final.details')}"><h2>${t(lang, 'final.details')}</h2>
      ${textField('first_name', t(lang, 'about.first'), S, E, lang, { required: true })}
      <div class="field"><label for="f_country">${t(lang, 'about.country')}</label>${select('country', COUNTRIES, S, lang, E)}${fieldErr(E, 'country', lang)}</div>
      <div class="field"><label for="f_sector">${t(lang, 'about.sector')}</label>${select('sector', SECTORS, S, lang, E)}${fieldErr(E, 'sector', lang)}</div>
      <p class="consent">${t(lang, 'consent.text')}</p>
      <label class="check"><input type="checkbox" name="consent_aggregate" value="1" required ${S.get('consent_aggregate') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.aggregate')}</span></label>${fieldErr(E, 'consent_aggregate', lang)}</section>`);
  }
  takes.forEach((tk, i) => steps.push(takeStep(tk, i + 1, takes.length, S, lang)));
  steps.push(h`<section class="step" data-step data-title="${t(lang, 'final.changed')}"><h2>${t(lang, 'final.changed')}</h2>
    <fieldset class="field" data-nonegroup><div class="chips stack">
    ${takes.map((tk) => h`<label class="chip"><input type="checkbox" name="changed" value="${tk.id}" ${S.getAll('changed').includes(tk.id) ? 'checked' : ''}><span>${tk.text}</span></label>`)}
    <label class="chip"><input type="checkbox" name="changed_none" value="1" ${S.get('changed_none') === '1' ? 'checked' : ''}><span>${t(lang, 'final.changed_none')}</span></label></div>
    ${fieldErr(E, 'changed', lang)}</fieldset>
    <div class="field"><label for="f_shaped">${t(lang, 'final.shaped')}</label><textarea id="f_shaped" name="what_shaped" maxlength="500" rows="4">${S.get('what_shaped') ?? ''}</textarea></div></section>`);
  steps.push(h`<section class="step" data-step data-title="${t(lang, 'final.story_title')}"><h2>${t(lang, 'final.story_title')}</h2>
    <div class="field"><label for="f_story">${t(lang, 'final.story')}</label><textarea id="f_story" name="story" maxlength="800" rows="6">${S.get('story') ?? ''}</textarea></div>
    <label class="check"><input type="checkbox" name="story_anon_ok" value="1" ${S.get('story_anon_ok') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.story_anon')}</span></label>
    <label class="check"><input type="checkbox" name="story_name_ok" value="1" ${S.get('story_name_ok') === '1' ? 'checked' : ''}><span>${t(lang, 'consent.story_name')}</span></label></section>`);
  return layout({ lang, title: 'Day 3 | Gold Coast Games', main: 'narrow', body: wizard({ action: '/final', id: 'final', steps, hidden: { ticket }, lang, E,
    extraTop: h`<h1>Day 3: has the room <mark>moved</mark>?</h1>` }) });
}

export function finalDonePage(lang = 'en') {
  return layout({ lang, title: 'Thank you', main: 'narrow center', body: h`<h1>${t(lang, 'final.done_title')}</h1><p class="lead">${t(lang, 'final.done_body')}</p>` });
}

export function messagePage(title, text, lang = 'en') {
  return layout({ lang, title, main: 'narrow center', body: h`<h1>${title}</h1><p class="lead">${text}</p>` });
}
