import test, { after } from 'node:test';
const _servers = [];
after(() => _servers.forEach((s) => { try { s.closeAllConnections(); s.close(); } catch {} }));
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';
import { buildDeck, classify, scoreAnswers, POINTS } from '../src/play.js';
import { setSetting } from '../src/db.js';

async function boot() {
  const db = openDb(':memory:');
  const env = { ADMIN_PASSWORD: 'pw', SESSION_SECRET: 's', EVENT_STARTS_AT: '2026-11-30T08:00:00Z' };
  const srv = createServer(createApp({ db, env, now: () => new Date('2026-11-30T10:00:00Z'), fetchImpl: async () => ({ ok: true }) }));
  await new Promise((r) => srv.listen(0, r));
  _servers.push(srv);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const call = (path, { body, json, auth = true } = {}) => fetch(base + path, {
    method: body ? 'POST' : 'GET', redirect: 'manual',
    headers: { ...(body ? { 'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded' } : {}), ...(auth ? { Authorization: 'Basic ' + Buffer.from('a:pw').toString('base64') } : {}) },
    body: body ? (json ? JSON.stringify(body) : new URLSearchParams(body).toString()) : undefined,
  });
  const csrf = async () => /name="csrf" value="([^"]+)"/.exec(await (await call('/admin/play')).text())[1];
  return { db, call, csrf, close: () => { srv.closeAllConnections(); srv.close(); } };
}
// 6 delegates: T2 split 3/3, T4 mostly agree 5/6
function seed(db) {
  const ins = db.prepare("INSERT INTO participants(id,number,first_name,surname,country,sector,consent_aggregate,source) VALUES (?,?,?,?,'Ghana','music',1,'pre_event')");
  const rsp = db.prepare("INSERT INTO responses(participant_id,phase,take_id,stance,strength) VALUES (?,'pre',?,?,3)");
  for (let i = 0; i < 6; i++) {
    ins.run(`p${i}`, 2000 + i, `Name${i}`, 'X');
    for (const t of ['T1', 'T2', 'T3', 'T4', 'T5']) rsp.run(`p${i}`, t, t === 'T2' ? (i < 3 ? 'agree' : 'disagree') : t === 'T4' ? (i < 5 ? 'agree' : 'disagree') : 'agree');
  }
}

test('classify thresholds match the colour-card rule', () => {
  assert.equal(classify(0.6), 'agree'); assert.equal(classify(0.59), 'split');
  assert.equal(classify(0.4), 'disagree'); assert.equal(classify(0.41), 'split'); assert.equal(classify(0.5), 'split');
});

test('deck: unverified facts are left out; verified ones included in order; predict rounds last and use the frozen pre-event split', () => {
  const db = openDb(':memory:'); seed(db);
  setSetting(db, 'icebreaker_takes', JSON.stringify(['T2', 'T4']));
  let deck = buildDeck(db);
  assert.deepEqual(deck.rounds.map((r) => r.type), ['predict', 'predict']); // no verified facts yet
  assert.deepEqual(deck.rounds.map((r) => r.answer), ['split', 'agree']);
  assert.equal(deck.rounds[1].agree, 5); assert.equal(deck.rounds[1].n, 6);
  db.prepare("UPDATE facts SET verified=1 WHERE id IN ('F5','F4','F2','F1')").run(); // F1 is an original example kept out of the game (game:false)
  deck = buildDeck(db);
  assert.deepEqual(deck.rounds.map((r) => r.type), ['fact', 'fact', 'fact', 'predict', 'predict']); // story arc: facts in order, predict the room last
  assert.deepEqual(deck.rounds.map((r) => r.id), ['F4', 'F5', 'F2', 'T2', 'T4'], 'story order; Burna Boy (F2) is in, Armstrong (F1) is not');
  assert.equal(deck.rounds[0].answer, 2); assert.match(deck.rounds[0].question, /In 2022/);
  assert.match(deck.rounds[1].question, /2021 mapping/, 'dated: the UNESCO figures are from 2021, never "currently"');
  assert.ok(!JSON.stringify(deck).includes('VERIFY'));
});

test('score is recomputed from the deck: wrong, missing and junk answers score 0', () => {
  const deck = { points: POINTS, rounds: [{ answer: 2 }, { answer: 'split' }, { answer: 0 }] };
  assert.deepEqual(scoreAnswers(deck, [2, 'split', 1]), { score: 20, max: 30 });
  assert.deepEqual(scoreAnswers(deck, [9, 'x']), { score: 0, max: 30 });
  assert.deepEqual(scoreAnswers(deck, null), { score: 0, max: 30 });
});

test('game is closed until a deck is frozen AND opened; admin controls need the password', async () => {
  const c = await boot(); seed(c.db); setSetting(c.db, 'icebreaker_takes', '["T2","T4"]');
  assert.match(await (await c.call('/play', { auth: false })).text(), /not started/);
  assert.equal((await c.call('/play/deck.json', { auth: false })).status, 404);
  assert.equal((await c.call('/admin/play', { auth: false })).status, 401);
  const tok = await c.csrf();
  assert.equal((await c.call('/admin/play/freeze', { body: { csrf: 'bad' } })).status, 403);
  await c.call('/admin/play/freeze', { body: { csrf: tok } });
  assert.equal((await c.call('/play/deck.json', { auth: false })).status, 404, 'frozen but not opened');
  await c.call('/admin/play/open', { body: { csrf: tok, value: '1' } });
  const page = await (await c.call('/play', { auth: false })).text();
  assert.ok(page.includes('id="play"') && page.includes('/static/play.js'));
  const deck = await (await c.call('/play/deck.json', { auth: false })).json();
  assert.equal(deck.rounds.length, 2);
  await c.call('/admin/play/open', { body: { csrf: tok, value: '0' } });
  assert.equal((await c.call('/play/deck.json', { auth: false })).status, 404);
  c.close();
});

const answersFor = (c) => c; // (readability only)

async function openGame(c) {
  seed(c.db); setSetting(c.db, 'icebreaker_takes', '["T2","T4"]');
  const tok = await c.csrf();
  await c.call('/admin/play/freeze', { body: { csrf: tok } });
  await c.call('/admin/play/open', { body: { csrf: tok, value: '1' } });
  return (await (await c.call('/play/deck.json', { auth: false })).json());
}

test('finish: code required, server scores, one play per person, rank, no guests', async () => {
  const c = await boot(); const deck = await openGame(c);
  const fin = (b) => c.call('/play/finish', { json: true, auth: false, body: { deck_id: deck.id, ...b } });
  // T2 round correct ('split'), T4 round wrong; client-sent score is ignored
  let j = await (await fin({ name: ' name0 ', number: '2000', answers: ['split', 'disagree'], score: 9999 })).json();
  assert.deepEqual([j.ok, j.score, j.max, j.rank, j.total], [true, 10, 20, 1, 1]);
  j = await (await fin({ name: 'Name0', number: '2000', answers: ['split', 'agree'] })).json();
  assert.equal(j.repeat, true); assert.equal(j.score, 10); // first play stands
  j = await (await fin({ name: 'Name1', number: '2001', answers: ['split', 'agree'] })).json();
  assert.deepEqual([j.score, j.rank, j.total], [20, 1, 2]);
  // no guest play: wrong code, no code, wrong name are all refused
  assert.equal((await fin({ name: 'Name2', number: '9999', answers: [] })).status, 422);
  assert.equal((await fin({ name: 'Name2', number: '', answers: [] })).status, 422);
  assert.equal((await fin({ name: 'Nope', number: '2002', answers: [] })).status, 422);
  assert.equal((await c.call('/play/finish', { json: true, auth: false, body: { deck_id: 999, name: 'Name2', number: '2002', answers: [] } })).status, 409);
  assert.equal(c.db.prepare('SELECT COUNT(*) c FROM game_plays').get().c, 2);
  assert.ok((await (await c.call('/admin/play')).text()).includes('Name1'));
  assert.ok(!(await (await c.call('/play/deck.json', { auth: false })).text()).includes('Name1'));
  c.close();
});

test('check endpoint: matches name+number case-insensitively, refuses others', async () => {
  const c = await boot(); await openGame(c);
  const chk = (b) => c.call('/play/check', { json: true, auth: false, body: b });
  assert.equal((await (await chk({ name: ' NAME3 ', number: '2003' })).json()).name, 'Name3');
  assert.equal((await chk({ name: 'Name3', number: '2004' })).status, 422);
  assert.equal((await chk({ name: 'Name3' })).status, 422);
  c.close();
});

test('no code: door onboarding hands straight into the game (button only once the game is open)', async () => {
  const c = await boot(); seed(c.db); setSetting(c.db, 'icebreaker_takes', '["T2","T4"]');
  const take = Object.fromEntries(['T1', 'T2', 'T3', 'T4', 'T5'].flatMap((id) => [[`t_${id}_stance`, 'agree'], [`t_${id}_strength`, '3']]));
  const door = async (email) => (await (await c.call('/door', { auth: false, body: { first_name: 'Kojo', surname: 'A', email, country: 'Ghana', sector: 'film', role: 'visitor', consent_aggregate: '1', ...take } })).headers.get('location'));
  let loc = await door('kojo@example.com');
  assert.match(loc, /next=play/);
  assert.match(await (await c.call(loc, { auth: false })).text(), /opens shortly/);
  const tok = await c.csrf();
  await c.call('/admin/play/freeze', { body: { csrf: tok } }); await c.call('/admin/play/open', { body: { csrf: tok, value: '1' } });
  const done = await (await c.call(loc, { auth: false })).text();
  const token = /\/play\?t=([^"]+)"/.exec(done)[1];
  const pt = c.db.prepare("SELECT number FROM participants WHERE magic_token=?").get(token);
  const page = await (await c.call(`/play?t=${token}`, { auth: false })).text();
  assert.ok(page.includes('data-name="Kojo"') && page.includes(`data-number="${pt.number}"`), 'no typing needed');
  assert.ok(!(await (await c.call('/play?t=bogus', { auth: false })).text()).includes('data-name='));
  // the normal pre-event link does not push people into a game that is not for them yet
  const pre = await (await c.call('/start', { auth: false, body: { first_name: 'Esi', surname: 'B', email: 'esi@example.com', country: 'Ghana', sector: 'film', role: 'visitor', consent_aggregate: '1', ...take } })).headers.get('location');
  assert.doesNotMatch(pre, /next=play/);
  c.close();
});

test('lost code: email me my code is self-serve, never reveals who is registered, rate limited', async () => {
  const c = await boot(); await openGame(c);
  c.db.prepare("UPDATE participants SET email='lost@example.com', magic_token='tok' WHERE number=2005").run();
  const resend = async (email) => (await c.call('/play/resend', { json: true, auth: false, body: { email } })).json();
  assert.deepEqual(await resend('LOST@example.com'), { ok: true });
  assert.deepEqual(await resend('nobody@example.com'), { ok: true }); // identical answer
  const mails = c.db.prepare('SELECT to_email, body FROM outbox').all();
  assert.equal(mails.length, 1); assert.ok(mails[0].body.includes('2005'));
  for (let i = 0; i < 4; i++) await resend('lost@example.com');
  assert.equal(c.db.prepare('SELECT COUNT(*) c FROM outbox').get().c, 3, 'max 3 per hour per email');
  c.close();
});

test('an older database (snapshots without deck support) upgrades itself and keeps its snapshots', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { mkdtempSync } = await import('node:fs'); const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
  const path = join(mkdtempSync(join(tmpdir(), 'cca-')), 'old.db');
  const old = new DatabaseSync(path);
  old.exec("CREATE TABLE snapshots(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK (kind IN ('icebreaker','final')), taken_at TEXT NOT NULL, data_json TEXT NOT NULL, html TEXT NOT NULL)");
  old.prepare("INSERT INTO snapshots(kind,taken_at,data_json,html) VALUES ('final','2026-11-29T10:00:00Z','{}','<p>old</p>')").run(); old.close();
  const db = openDb(path);
  assert.equal(db.prepare('SELECT html FROM snapshots').get().html, '<p>old</p>');
  db.prepare("INSERT INTO snapshots(kind,taken_at,data_json,html) VALUES ('deck','2026-11-30T10:00:00Z','{}','')").run();
  db.prepare("INSERT INTO snapshots(kind,taken_at,data_json,html) VALUES ('conference','2026-11-30T11:00:00Z','{}','')").run();
  assert.equal(db.prepare('SELECT COUNT(*) c FROM snapshots').get().c, 3);
});
