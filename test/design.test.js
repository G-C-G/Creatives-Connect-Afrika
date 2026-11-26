import test, { after } from 'node:test';
const _servers = [];
after(() => _servers.forEach((s) => { try { s.closeAllConnections(); s.close(); } catch {} }));
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';
import { movedStatements } from '../src/metrics.js';

const visibleText = (html) => html.replace(/<(style|script)[\s\S]*?<\/\1>/g, ' ').replace(/<\/?(em|span|b|i|strong)\b[^>]*>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

async function boot(envExtra = {}) {
  const db = openDb(':memory:');
  const env = { ADMIN_PASSWORD: 'pw', SESSION_SECRET: 's', EVENT_STARTS_AT: '2026-11-30T08:00:00Z', ...envExtra };
  const srv = createServer(createApp({ db, env, now: () => new Date('2026-11-27T10:00:00Z'), fetchImpl: async () => ({ ok: true }) }));
  await new Promise((r) => srv.listen(0, r));
  _servers.push(srv);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const call = (path, { body, auth = false } = {}) => fetch(base + path, {
    method: body ? 'POST' : 'GET', redirect: 'manual',
    headers: { ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(auth ? { Authorization: 'Basic ' + Buffer.from('a:pw').toString('base64') } : {}) },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  return { db, call, close: () => { srv.closeAllConnections(); srv.close(); } };
}
const base5 = (o = {}) => Object.fromEntries(['T1', 'T2', 'T3', 'T4', 'T5'].flatMap((id) => [[`t_${id}_stance`, 'agree'], [`t_${id}_strength`, '3'], [`t_${id}_level`, o[id] ?? 'quiet']]));
const reg = (extra = {}, levels = {}) => ({ first_name: 'Ama', surname: 'M', email: 'a@example.com', country: 'Ghana', sector: 'music', role: 'independent', consent_aggregate: '1', ...base5(levels), ...extra });

test('one-tap "how far would you take it" maps to say-aloud / argue-on-stage', async () => {
  const c = await boot();
  await c.call('/start', { body: reg({}, { T1: 'quiet', T2: 'aloud', T3: 'stage', T4: 'quiet', T5: 'aloud' }) });
  const rows = Object.fromEntries(c.db.prepare("SELECT take_id, say_aloud s, speak_on_stage g FROM responses WHERE phase='pre'").all().map((r) => [r.take_id, [r.s, r.g]]));
  assert.deepEqual(rows.T1, [0, 0]); assert.deepEqual(rows.T2, [1, 0]); assert.deepEqual(rows.T3, [1, 1]);
  c.close();
});

test('the older say/stage fields still work (no-JS and existing clients)', async () => {
  const c = await boot();
  const b = reg(); for (const id of ['T1', 'T2', 'T3', 'T4', 'T5']) { delete b[`t_${id}_level`]; b[`t_${id}_say`] = 'y'; b[`t_${id}_stage`] = 'n'; }
  assert.equal((await c.call('/start', { body: b })).status, 303);
  assert.deepEqual({ ...c.db.prepare("SELECT say_aloud s, speak_on_stage g FROM responses WHERE take_id='T1'").get() }, { s: 1, g: 0 });
  c.close();
});

test('logos: first page is CCA only, game screens are clean, and the ending repeats the banner and the CCA mark (no footer mark)', async () => {
  const c = await boot();
  const landing = await (await c.call('/')).text();
  assert.match(landing, /class="logos top band"/); assert.match(landing, /class="cca-hero"/, 'the CCA mark sits clear in the middle');
  assert.ok(landing.indexOf('gcg.png') < landing.indexOf('ghana-arms.png') && landing.indexOf('ghana-arms.png') < landing.indexOf('cca-hero.png') && landing.indexOf('cca-hero.png') < landing.indexOf('class="open"'), 'top row: GCG left then the partners; then the CCA mark; then the headline');
  assert.equal((landing.match(/gcg\.png/g) || []).length, 1, 'GCG appears once on the opening (top-left, not repeated in the footer)');
  assert.doesNotMatch(landing.replace(/<[^>]*>/g, ' '), /gold coast games/i, 'no written GCG name in the visible text (the logo carries it)');
  assert.match(landing, /class="sr">Before we begin\./, 'the opening is a call to action, not a registration page');
  assert.doesNotMatch(await (await c.call('/start')).text(), /class="logos/);
  const loc = (await c.call('/start', { body: reg() })).headers.get('location');
  const done = await (await c.call(loc)).text();
  assert.match(done, /class="logos top band"/, 'the ending carries the same logo banner as the opening'); assert.match(done, /class="end-mark"/, 'and the CCA mark');
  assert.ok(done.indexOf('gcg.png') < done.indexOf('end-mark'), 'GCG sits in the top banner of the ending, never in a footer');
  const text = done.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  for (const line of ['That’s all.', 'For now.', 'What does everyone else think?', 'Come back Monday.', 'Keep it.']) assert.ok(text.includes(line.replace('’', '&#39;')) || text.includes(line), `ending says: ${line}`);
  assert.ok(!/thank you for completing/i.test(text), 'never a thank-you-for-completing page');
  c.close();
});

test('the ending adapts if the event has already started', async () => {
  const c = await boot({ EVENT_STARTS_AT: '2026-11-20T08:00:00Z' });
  const done = (await (await c.call((await c.call('/start', { body: reg() })).headers.get('location'))).text()).replace(/<[^>]*>/g, ' ');
  assert.match(done, /See you at the event/); assert.doesNotMatch(done, /Come back/);
  c.close();
});

test('SHOW_PARTNER_LOGOS=0 hides the partner marks but keeps the GCG mark', async () => {
  const c = await boot({ SHOW_PARTNER_LOGOS: '0' });
  const landing = await (await c.call('/')).text();
  assert.doesNotMatch(landing, /ghana-arms|afcfta|black-star/, 'partner logos switched off'); assert.ok(landing.includes('gcg.png') && landing.includes('cca-hero.png'));
  c.close();
});

test('wizard: country first (a short clip of its song can play); then the statements; then who (name and surname), role, sector, why you are here, an optional memory, email; consent last', async () => {
  const c = await boot();
  const html = await (await c.call('/start')).text();
  const screens = html.split('<section class="step"').slice(1);
  assert.equal(screens.length, 23, 'country + 15 statement screens + who + role + sector + why + memory + email + consent: nothing else');
  const has = (re) => screens.map((x, i) => (re.test(x) ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(has(/name="country"/), [0], 'country is the very first question'); assert.deepEqual(has(/t_T5_stance/), [1]);
  assert.deepEqual(has(/name="first_name"/), [16]); assert.deepEqual(has(/name="surname"/), [16], 'name and surname on one page');
  assert.deepEqual(has(/name="role"/), [17], 'who you are in the tourism picture'); assert.deepEqual(has(/name="sector"/), [18]); assert.deepEqual(has(/name="goal"/), [19], '"why you are here" is its own page');
  assert.deepEqual(has(/name="memory"/), [20], 'the optional creative-past question'); assert.deepEqual(has(/name="email"/), [21]); assert.deepEqual(has(/name="consent_aggregate"/), [22]);
  for (const gone of ['name="project"', 'name="values"', 'name="contact_opt_in"']) assert.ok(!html.includes(gone), `${gone} is no longer asked`);
  assert.ok(/data-auto/.test(screens[19]) && !/data-skippable/.test(screens[19]) && /required/.test(screens[19]), '"why" cannot be skipped');
  screens.forEach((x, i) => assert.ok(((x.match(/<input[^>]*type="(text|email)"|<select|<textarea/g) || []).length) <= (i === 16 ? 2 : 1), `screen ${i}`));
  assert.equal((html.match(/data-auto/g) || []).length, 18, '15 statement taps + role + sector + why');
  assert.equal((html.match(/data-optional/g) || []).length, 2, 'only the memory and the email are skippable');
  const door = (await (await c.call('/door')).text()).split('<section class="step"').slice(1);
  assert.equal(door.length, 23);
  c.close();
});

test('statement screens are built like a game: count + ticks, a build-up line, lock-in line, labelled scale', async () => {
  const c = await boot();
  const html = await (await c.call('/start')).text();
  assert.match(html, /<span class="count">01<i> \/ 05<\/i><\/span>/); assert.ok(html.includes('class="ticks"'));
  for (const line of ['Okay. Let\u2019s start a fight.', 'No fence-sitting.', 'Pick a side.', 'Nearly there.', 'Last one. Make it count.']) assert.ok(html.includes(line), line);
  for (const ack of ['data-ack="Locked."', 'data-ack="Interesting."', 'data-ack="On to the next."', 'data-ack="That\u2019s all five."']) assert.ok(html.includes(ack), ack);
  for (const lab of ['Not very', 'A little', 'Pretty sure', 'Very sure', 'fight you on this', 'Keeping that to myself', 'Give me the microphone']) assert.ok(html.includes(lab), lab);
  assert.doesNotMatch(html, /<p class="kicker">Statement \d of \d/, 'no survey-style "Statement 1 of 5" label');
  // the measurement is unchanged underneath: strength is still 1..5, level still maps to say-aloud / on-stage
  assert.ok(html.includes('name="t_T1_strength" value="1"') && html.includes('name="t_T1_strength" value="5"') && html.includes('name="t_T1_level" value="stage"'));
  c.close();
});

test('Day 3 uses the same scale and measurement but neutral build-up lines (no hint of earlier answers)', async () => {
  const c = await boot({ FINAL_CLOSES_AT: '2026-12-02T12:00:00Z' });
  await c.call('/start', { body: reg() });
  const p = c.db.prepare('SELECT magic_token t FROM participants').get();
  const html = await (await c.call(`/final?t=${p.t}`)).text();
  assert.ok(html.includes('Same five statements.') && !html.includes('start a fight'));
  assert.ok(html.includes('Pretty sure') && html.includes('Give me the microphone'), 'identical response options');
  c.close();
});

test('the display font is self-hosted, cacheable, and declared', async () => {
  const c = await boot();
  const f = await c.call('/static/fonts/instrument-serif-400.woff2');
  assert.equal(f.status, 200); assert.equal(f.headers.get('content-type'), 'font/woff2'); assert.match(f.headers.get('cache-control'), /immutable/);
  assert.ok((await f.arrayBuffer()).byteLength > 10000);
  assert.equal((await c.call('/static/fonts/other.woff2')).status, 404);
  assert.match(await (await c.call('/static/app.css')).text(), /@font-face\{font-family:"Instrument Serif"/);
  c.close();
});

test('movedStatements uses a transparent threshold on matched pairs', () => {
  const P = (id) => ({ id }), R = (pid, ph, tk, st, n) => ({ participant_id: pid, phase: ph, take_id: tk, stance: st, strength: n });
  const data = { takes: [{ id: 'T1' }, { id: 'T2' }], participants: ['a', 'b'].map(P),
    responses: [R('a', 'pre', 'T1', 'agree', 4), R('b', 'pre', 'T1', 'agree', 4), R('a', 'final', 'T1', 'disagree', 1), R('b', 'final', 'T1', 'agree', 4),
      R('a', 'pre', 'T2', 'agree', 3), R('b', 'pre', 'T2', 'agree', 3), R('a', 'final', 'T2', 'agree', 3), R('b', 'final', 'T2', 'agree', 4)] };
  // T1: shifts -5 and 0 -> mean -2.5 (moved). T2: 0 and +1 -> mean +0.5 (moved at the threshold).
  assert.deepEqual(movedStatements(data), { count: 2, total: 2, ids: ['T1', 'T2'], threshold: 0.5 });
  assert.equal(movedStatements(data, 1).count, 1);
});

test('stage final: theatre order (smallest shift first, biggest mover last), counting numbers, sound script, still offline-safe', async () => {
  const c = await boot({ FINAL_CLOSES_AT: '2026-12-02T12:00:00Z' });
  const ins = c.db.prepare("INSERT INTO participants(id,number,first_name,surname,country,sector,consent_aggregate,source) VALUES (?,?,?,?,'Ghana','music',1,'pre_event')");
  const rsp = c.db.prepare('INSERT INTO responses(participant_id,phase,take_id,stance,strength) VALUES (?,?,?,?,?)');
  for (let i = 0; i < 6; i++) {
    ins.run(`p${i}`, 3000 + i, `N${i}`, 'X');
    for (const t of ['T1', 'T2', 'T3', 'T4', 'T5']) {
      rsp.run(`p${i}`, 'pre', t, 'agree', 4);
      // T3 moves a lot, T1 a little, the rest not at all
      rsp.run(`p${i}`, 'final', t, t === 'T3' ? 'disagree' : 'agree', t === 'T3' ? 4 : t === 'T1' && i === 0 ? 3 : 4);
    }
  }
  const page = await (await c.call('/admin/snapshots', { auth: true })).text();
  const csrf = /name="csrf" value="([^"]+)"/.exec(page)[1];
  await c.call('/admin/snapshot', { auth: true, body: { csrf, kind: 'final' } });
  const html = await (await c.call('/stage/final', { auth: true })).text();
  assert.match(visibleText(html), /Did we move\?/); assert.ok(html.includes('data-count="6"'));
  assert.match(html, /The room shifted on/); assert.ok(html.includes('data-count="1"'), 'exactly 1 statement moved: T3 (T1 changed for one person only, average under the 0.5 threshold)');
  const idx = (txt) => html.indexOf(txt);
  const mover = idx('BIGGEST MOVER'), t3 = idx('A big opportunity comes');
  assert.ok(mover > 0 && t3 > 0 && mover < t3 && t3 > idx('Looking back at the end of your life'), 'biggest mover (T3) is the last statement revealed');
  assert.ok(html.indexOf('Looking back at the end of your life') < t3 && html.indexOf('You can only back one') < t3);
  assert.ok(html.includes('CCA_SFX_STAGE') && html.includes('AudioContext'));
  assert.ok(html.includes('<svg class="field flow"') && html.includes('class="a-d"'), 'the imagery: dots, with the people who crossed the room');
  assert.ok(!/https?:\/\//.test(html), 'no network references');
  c.close();
});

test('the optional "creative past" answer: saved, trimmed to one line of 140, shown to admin by country with no names, never required', async () => {
  const c = await boot();
  await c.call('/start', { body: reg({ memory: '  Highlife nights at the old Weija club  ' }) });
  await c.call('/start', { body: reg({ email: 'b@example.com', first_name: 'Kofi', surname: 'Zed', country: 'Kenya', memory: 'x'.repeat(300) }) });
  const ok = await c.call('/start', { body: reg({ email: 'c@example.com' }) });
  assert.equal(ok.status, 303, 'skipping it is fine');
  const rows = c.db.prepare('SELECT country, memory FROM participants ORDER BY country').all();
  assert.equal(rows.find((r) => r.country === 'Ghana' && r.memory)?.memory, 'Highlife nights at the old Weija club');
  assert.equal(rows.find((r) => r.country === 'Kenya').memory.length, 140);
  const page = await (await c.call('/admin/memories', { auth: true })).text();
  assert.match(page, /Highlife nights at the old Weija club/); assert.match(page, /Kenya \(1\)/);
  assert.doesNotMatch(page, /Kofi|Zed|a@example\.com/, 'names and emails are not on the memories page');
  assert.equal((await c.call('/admin/memories')).status, 401, 'admin only');
  c.close();
});

test('the welcome song file is served only if present, with byte ranges (iPhones need them); the opening tap carries its path', async () => {
  const c = await boot();
  const landing = await (await c.call('/')).text();
  assert.match(landing, /class="btn big go" href="\/start" data-theme="\/static\/audio\/welcome-home\.mp3"/);
  assert.equal((await c.call('/static/audio/welcome-home.mp3')).status, 404, 'no file yet: a clean 404, and the page plays its own welcome motif');
  assert.equal((await c.call('/static/audio/other.mp3')).status, 404, 'only the one named file is ever served');
  c.close();
});

test('take 3 is a two-option choice: its own words on the phone buttons, the stage deck and the game; still stored as agree / disagree', async () => {
  const c = await boot();
  const html = await (await c.call('/start')).text();
  const t3 = html.split('<section class="step"').slice(1).find((x) => /name="t_T3_stance"/.test(x));
  assert.match(t3, /Do it for free/); assert.match(t3, /Stand by your price/); assert.doesNotMatch(t3.replace(/<legend[^>]*>.*?<\/legend>/s, ''), />Agree</, 'no Agree / Disagree on this take');
  assert.match(t3, /value="agree"/); assert.match(t3, /value="disagree"/);
  const t1 = html.split('<section class="step"').slice(1).find((x) => /name="t_T4_stance"/.test(x));
  assert.match(t1, />Agree</); assert.match(t1, />Disagree</);
  c.close();
});

test('admin shows what Agree and Disagree mean for the two-option takes (so the Thursday split can be read)', async () => {
  const c = await boot();
  const html = await (await c.call('/admin', { auth: true })).text();
  assert.match(html, /Agree = A life of meaning/); assert.match(html, /Disagree = A life of wealth/); assert.match(html, /Agree = Do it for free/);
  c.close();
});

test('country list: the whole world is offered; the old catch-all is not shown; the hint no longer mentions Outside Africa; any country is accepted', async () => {
  const c = await boot();
  const html = await (await c.call('/start')).text();
  assert.ok(html.includes('>Spain<') && html.includes('>Japan<') && html.includes('>Ghana<') && html.includes('>Nigeria<'));
  assert.ok(!/Outside Africa/i.test(html), 'the internal grouping is never shown to delegates');
  const r = await c.call('/start', { body: reg({ country: 'Spain', email: 's@example.com' }) });
  assert.equal(r.status, 303, 'a delegate from Spain registers fine');
  assert.equal(c.db.prepare("SELECT country FROM participants WHERE email='s@example.com'").get().country, 'Spain');
  c.close();
});

test('role question: required, saved, and admin shows what each group thinks per take (small groups hidden)', async () => {
  const c = await boot();
  assert.equal((await c.call('/start', { body: { ...reg({}), role: '' } })).status, 422, 'role is required');
  for (let i = 0; i < 6; i++) await c.call('/start', { body: reg({ email: `g${i}@example.com`, role: 'government', t_T5_stance: i < 4 ? 'agree' : 'disagree' }) });
  await c.call('/start', { body: reg({ email: 'v@example.com', role: 'visitor' }) });
  assert.equal(c.db.prepare("SELECT COUNT(*) c FROM participants WHERE role='government'").get().c, 6);
  const html = await (await c.call('/admin', { auth: true })).text();
  assert.match(html, /What each group thinks/); assert.match(html, /Government or public body/);
  assert.match(html, /67%/, '4 of 6 government delegates chose the first option on the tourism take');
  assert.match(html, /few/, 'the single visitor is hidden, not shown');
  c.close();
});
