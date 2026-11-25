import test, { after } from 'node:test';
const _servers = [];
after(() => _servers.forEach((s) => { try { s.closeAllConnections(); s.close(); } catch {} }));
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';
import { movedStatements } from '../src/metrics.js';

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
const reg = (extra = {}, levels = {}) => ({ first_name: 'Ama', surname: 'M', email: 'a@example.com', country: 'Ghana', sector: 'music', consent_aggregate: '1', ...base5(levels), ...extra });

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

test('logos: first page is CCA only, game screens are clean, closing screens carry the full row (CCA first)', async () => {
  const c = await boot();
  const landing = await (await c.call('/')).text();
  assert.match(landing, /class="logos hero"/); assert.equal((landing.match(/static\/logos\/(?!gcg)/g) || []).length, 1);
  assert.ok(landing.includes('creatives-connect-afrika.png'));
  assert.doesNotMatch(landing.replace(/<[^>]*>/g, ' '), /gold coast games/i, 'no written GCG name in the visible text (the logo carries it)');
  const start = await (await c.call('/start')).text();
  assert.doesNotMatch(start, /class="logos/);
  const loc = (await c.call('/start', { body: reg() })).headers.get('location');
  const done = await (await c.call(loc)).text();
  const order = [...done.matchAll(/static\/logos\/([a-z-]+)\.png/g)].map((m) => m[1]).filter((n) => n !== 'gcg');
  assert.deepEqual(order, ['creatives-connect-afrika', 'ghana-arms', 'black-star', 'africa-tourism-partners', 'afcfta']);
  assert.ok(done.includes('/static/logos/gcg.png') && done.includes('In partnership with Creatives Connect Afrika'));
  c.close();
});

test('SHOW_PARTNER_LOGOS=0 hides the partner marks but keeps the GCG mark', async () => {
  const c = await boot({ SHOW_PARTNER_LOGOS: '0' });
  const landing = await (await c.call('/')).text();
  assert.doesNotMatch(landing, /class="logos/); assert.ok(landing.includes('gcg.png'));
  c.close();
});

test('wizard: statements first, then ONE question per screen, optional extras skippable, consent last', async () => {
  const c = await boot();
  const html = await (await c.call('/start')).text();
  const screens = html.split('<section class="step"').slice(1);
  assert.equal(screens.length, 25, '15 statement screens + name, surname, email, country, sector + 4 optional + consent');
  const has = (re) => screens.map((x, i) => (re.test(x) ? i : -1)).filter((i) => i >= 0);
  assert.deepEqual(has(/t_T1_stance/), [0]); assert.deepEqual(has(/name="first_name"/), [15]); assert.deepEqual(has(/name="surname"/), [16]);
  assert.deepEqual(has(/name="email"/), [17]); assert.deepEqual(has(/name="country"/), [18]); assert.deepEqual(has(/name="sector"/), [19]);
  assert.deepEqual(has(/name="project"/), [20]); assert.deepEqual(has(/name="consent_aggregate"/), [24]);
  // no screen asks for more than one thing (a screen has at most one text/select field)
  for (const x of screens) assert.ok(((x.match(/<input[^>]*type="(text|email)"|<select|<textarea/g) || []).length) <= 1);
  assert.equal((html.match(/data-auto/g) || []).length, 18, '15 statement taps + sector + goal + contact');
  assert.equal((html.match(/data-optional/g) || []).length, 3 /* email, project, values */);
  // the door version skips the optional extras
  const door = (await (await c.call('/door')).text()).split('<section class="step"').slice(1);
  assert.equal(door.length, 21);
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
  assert.match(html, /Did we move\?/); assert.ok(html.includes('data-count="6"'));
  assert.match(html, /The room shifted on/); assert.ok(html.includes('data-count="1"'), 'exactly 1 statement moved: T3 (T1 changed for one person only, average under the 0.5 threshold)');
  const idx = (txt) => html.indexOf(txt);
  const mover = idx('BIGGEST MOVER'), t3 = idx('African creatives should give up equity');
  assert.ok(mover > 0 && t3 > 0 && mover < t3 && t3 > idx('The biggest winners of African festivals'), 'biggest mover (T3) is the last statement revealed');
  assert.ok(html.indexOf('The biggest winners') < t3 && html.indexOf('Gaming will do more') < t3);
  assert.ok(html.includes('CCA_SFX_STAGE') && html.includes('AudioContext'));
  assert.ok(!/https?:\/\//.test(html), 'no network references');
  c.close();
});
