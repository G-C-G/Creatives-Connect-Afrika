import test, { after } from 'node:test';
const _servers = [];
after(() => _servers.forEach((s) => { try { s.closeAllConnections(); s.close(); } catch {} }));
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDb, loadData, seedContent } from '../src/db.js';
import { createApp } from '../src/server.js';
import { COUNTRIES } from '../src/content.js';

async function boot(envExtra = {}, clock = { t: new Date('2026-11-27T10:00:00Z') }) {
  const db = openDb(':memory:');
  const env = { ADMIN_PASSWORD: 'pw', SESSION_SECRET: 's', BASE_URL: 'https://x.test', EVENT_STARTS_AT: '2026-11-30T08:00:00Z', ...envExtra };
  const srv = createServer(createApp({ db, env, now: () => clock.t, fetchImpl: async () => ({ ok: true }) }));
  await new Promise((r) => srv.listen(0, r));
  _servers.push(srv);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const call = (path, { body, auth = true, json = true, method } = {}) => fetch(base + path, {
    method: method || (body ? 'POST' : 'GET'), redirect: 'manual',
    headers: { ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(json ? { Accept: 'application/json' } : {}),
      ...(auth ? { Authorization: 'Basic ' + Buffer.from('a:pw').toString('base64') } : {}) },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  return { db, call, base, clock, close: () => { srv.closeAllConnections(); srv.close(); } };
}
const takeFields = (stance = 'agree', strength = 3) => Object.fromEntries(['T1', 'T2', 'T3', 'T4', 'T5'].flatMap((id) => [[`t_${id}_stance`, stance], [`t_${id}_strength`, String(strength)], [`t_${id}_say`, 'y'], [`t_${id}_stage`, 'y']]));
const pre = (o = {}) => ({ first_name: 'Ama', surname: 'Mensah', email: 'ama@example.com', country: 'Ghana', sector: 'music', consent_aggregate: '1', ...takeFields(), ...o });
const admin = (ctx) => ({ csrf: null });
async function csrfOf(ctx) { const html = await (await ctx.call('/admin', { json: false })).text(); return /name="csrf" value="([^"]+)"/.exec(html)[1]; }

test('pre-event: number issued, email queued with magic link, takes locked', async () => {
  const c = await boot();
  const r = await c.call('/start', { body: pre() }); const j = await r.json();
  assert.equal(r.status, 200); assert.match(j.redirect, /^\/done\?t=/);
  const p = c.db.prepare('SELECT * FROM participants').get();
  assert.ok(p.number >= 1000 && p.number <= 9999);
  const done = await (await c.call(j.redirect, { json: false })).text();
  assert.ok(done.includes(String(p.number)));
  const mail = c.db.prepare('SELECT * FROM outbox').get();
  assert.ok(mail.body.includes(String(p.number)) && mail.body.includes(`https://x.test/final?t=${p.magic_token}`));
  assert.equal(c.db.prepare('SELECT COUNT(*) c FROM takes WHERE locked=1').get().c, 5);
  c.close();
});

test('validation: consent required, bad country rejected, missing take answer rejected', async () => {
  const c = await boot();
  let r = await c.call('/start', { body: pre({ consent_aggregate: '0' }) }); assert.equal(r.status, 422);
  r = await c.call('/start', { body: pre({ country: 'Narnia' }) }); assert.equal(r.status, 422);
  const b = pre(); delete b.t_T3_stance; r = await c.call('/start', { body: b }); assert.equal(r.status, 422);
  assert.equal(c.db.prepare('SELECT COUNT(*) c FROM participants').get().c, 0);
  c.close();
});

test('same email twice returns the same number, no duplicate row; edits allowed before event, not after', async () => {
  const c = await boot();
  await c.call('/start', { body: pre() });
  const n1 = c.db.prepare('SELECT number FROM participants').get().number;
  const r = await c.call('/start', { body: pre({ email: 'AMA@Example.com ', sector: 'film', ...takeFields('disagree', 5) }) });
  assert.match((await r.json()).redirect, /existing=1/);
  assert.equal(c.db.prepare('SELECT COUNT(*) c FROM participants').get().c, 1);
  assert.equal(c.db.prepare('SELECT number, sector FROM participants').get().sector, 'film');
  assert.equal(c.db.prepare("SELECT stance FROM responses WHERE phase='pre' AND take_id='T1'").get().stance, 'disagree');
  c.clock.t = new Date('2026-11-30T09:00:00Z'); // event started: no more edits
  await c.call('/start', { body: pre({ sector: 'tech' }) });
  assert.equal(c.db.prepare('SELECT sector FROM participants').get().sector, 'film');
  assert.equal(c.db.prepare('SELECT number FROM participants').get().number, n1);
  c.close();
});

test('door version: source=door, no work fields needed', async () => {
  const c = await boot();
  await c.call('/door', { body: pre({ email: '' }) });
  assert.equal(c.db.prepare('SELECT source, email FROM participants').get().source, 'door');
  c.close();
});

async function registered(c, email = 'ama@example.com', stance = 'agree') {
  await c.call('/start', { body: pre({ email, ...takeFields(stance, 4) }) });
  return c.db.prepare('SELECT * FROM participants WHERE lower(email)=?').get(email);
}
const finalBody = (ticket, o = {}) => ({ ticket, ...takeFields('disagree', 2), changed: 'T1', what_shaped: 'a panel', ...o });
async function ticketFor(c, name, number) {
  const html = await (await c.call('/final/lookup', { body: { first_name: name, number: String(number), fails: '0' }, json: false })).text();
  return /name="ticket" value="([^"]+)"/.exec(html)?.[1];
}

test('Day 3 links by first name + number, case-insensitive and trimmed', async () => {
  const c = await boot({ FINAL_CLOSES_AT: '2026-12-02T12:00:00Z' });
  const p = await registered(c);
  c.clock.t = new Date('2026-12-02T09:00:00Z');
  const ticket = await ticketFor(c, '  aMA ', p.number);
  assert.ok(ticket);
  const r = await c.call('/final', { body: finalBody(ticket, { story: 'my story', story_anon_ok: '1' }) });
  assert.equal((await r.json()).ok, true);
  const part = (await import('../src/metrics.js')).participation(loadData(c.db));
  assert.equal(part.matched, 1); assert.equal(part.postOnly, 0);
  assert.equal(c.db.prepare('SELECT COUNT(*) c FROM participants').get().c, 1);
  c.close();
});

test('Day 3 links by magic link; Day 3 does not reveal earlier answers', async () => {
  const c = await boot();
  const p = await registered(c);
  const html = await (await c.call(`/final?t=${p.magic_token}`, { json: false })).text();
  assert.match(html, /name="ticket"/);
  assert.doesNotMatch(html, /checked/); // earlier answers not pre-filled (no anchoring)
  c.close();
});

test('wrong name/number: no ticket; after 2 failures post-only is offered and flagged', async () => {
  const c = await boot();
  const p = await registered(c);
  assert.equal(await ticketFor(c, 'Wrong', p.number), undefined);
  const fail2 = await (await c.call('/final/lookup', { body: { first_name: 'Nope', number: '1234', fails: '1' }, json: false })).text();
  assert.match(fail2, /Continue without a number/);
  const fail1 = await (await c.call('/final/lookup', { body: { first_name: 'Nope', number: '1234', fails: '0' }, json: false })).text();
  assert.doesNotMatch(fail1, /Continue without a number/);
  // post-only refused before 2 failures
  const early = await (await c.call('/final/lookup', { body: { mode: 'postonly', fails: '0' }, json: false })).text();
  assert.doesNotMatch(early, /name="ticket"/);
  const po = await (await c.call('/final/lookup', { body: { mode: 'postonly', fails: '2' }, json: false })).text();
  const ticket = /name="ticket" value="([^"]+)"/.exec(po)[1];
  const r = await c.call('/final', { body: finalBody(ticket, { first_name: 'Kofi', country: 'Ghana', sector: 'tech', consent_aggregate: '1' }) });
  assert.equal((await r.json()).ok, true);
  assert.equal(c.db.prepare("SELECT COUNT(*) c FROM participants WHERE source='final_only'").get().c, 1);
  const part = (await import('../src/metrics.js')).participation(loadData(c.db));
  assert.equal(part.postOnly, 1); assert.equal(part.matched, 0);
  c.close();
});

test('a forged ticket is rejected', async () => {
  const c = await boot();
  const r = await c.call('/final', { body: finalBody('m.someone.9999999999.AAAA') });
  assert.equal(r.status, 400);
  c.close();
});

test('Day 3 refuses after final_closes_at, and before it opens', async () => {
  const c = await boot({ FINAL_OPENS_AT: '2026-12-02T06:00:00Z', FINAL_CLOSES_AT: '2026-12-02T12:00:00Z' });
  const p = await registered(c);
  c.clock.t = new Date('2026-12-02T09:00:00Z');
  const ticket = await ticketFor(c, 'Ama', p.number);
  c.clock.t = new Date('2026-12-02T12:00:01Z');
  let r = await c.call('/final', { body: finalBody(ticket) });
  assert.equal(r.status, 403);
  assert.equal(c.db.prepare("SELECT COUNT(*) c FROM responses WHERE phase='final'").get().c, 0);
  c.clock.t = new Date('2026-12-02T05:00:00Z');
  assert.match(await (await c.call('/final', { json: false })).text(), /not open yet/);
  c.close();
});

test('admin is inaccessible without the password; disabled when none is set; CSRF enforced', async () => {
  const c = await boot();
  assert.equal((await c.call('/admin', { auth: false })).status, 401);
  assert.equal((await c.call('/stage/final', { auth: false })).status, 401);
  assert.equal((await c.call('/admin/export/all.csv', { auth: false })).status, 401);
  assert.equal((await c.call('/admin')).status, 200);
  assert.equal((await c.call('/admin/settings', { body: { final_closes_at: '2026-12-02T12:00' } })).status, 403); // no csrf
  const tok = await csrfOf(c);
  assert.equal((await c.call('/admin/settings', { body: { csrf: tok, final_closes_at: '2026-12-02T12:00' } })).status, 303);
  assert.equal(c.db.prepare("SELECT value FROM settings WHERE key='final_closes_at'").get().value, '2026-12-02T12:00:00Z');
  c.close();
  const d = await boot({ ADMIN_PASSWORD: '' });
  assert.equal((await d.call('/admin', { auth: false })).status, 403);
  d.close();
});

test('aggregate CSV has no names or emails; private CSV does', async () => {
  const c = await boot({ FINAL_CLOSES_AT: '2026-12-02T12:00:00Z' });
  const p = await registered(c, 'zed@example.com');
  c.clock.t = new Date('2026-12-02T09:00:00Z');
  await c.call('/final', { body: finalBody(await ticketFor(c, 'Ama', p.number), { story: 'secret story' }) });
  const agg = await (await c.call('/admin/export/aggregate.csv')).text();
  for (const bad of ['Ama', 'Mensah', 'zed@example.com', 'secret story', '@']) assert.ok(!agg.includes(bad), `aggregate leaks ${bad}`);
  assert.match(agg, /participation,,,matched,1/);
  const all = await (await c.call('/admin/export/all.csv')).text();
  assert.ok(all.includes('Mensah') && all.includes('zed@example.com'));
  c.close();
});

test('CSV cells starting with = are neutralised', async () => {
  const c = await boot();
  await c.call('/start', { body: pre({ first_name: '=HYPERLINK("x")', email: 'e@example.com' }) });
  const all = await (await c.call('/admin/export/all.csv')).text();
  assert.ok(all.includes(`"'=HYPERLINK(""x"")"`));
  c.close();
});

test('stored XSS is escaped in admin pages', async () => {
  const c = await boot();
  await c.call('/start', { body: pre({ first_name: '<script>alert(1)</script>', surname: 'X' }) });
  const html = await (await c.call('/admin/lookup?q=script', { json: false })).text();
  assert.ok(!html.includes('<script>alert(1)</script>') && html.includes('&lt;script&gt;'));
  c.close();
});

test('snapshot is self-contained, stories need consent AND vetted AND use_in_room, unverified facts never appear', async () => {
  const c = await boot({ FINAL_CLOSES_AT: '2026-12-02T12:00:00Z' });
  const a = await registered(c, 'a@example.com'), b = await registered(c, 'b@example.com');
  c.db.prepare("UPDATE participants SET first_name='Bea', surname='Boateng' WHERE id=?").run(b.id);
  c.clock.t = new Date('2026-12-02T09:00:00Z');
  await c.call('/final', { body: finalBody(await ticketFor(c, 'Ama', a.number), { story: 'UNVETTED STORY', story_anon_ok: '1' }) });
  await c.call('/final', { body: finalBody(await ticketFor(c, 'Bea', b.number), { story: 'VETTED NAMED STORY', story_anon_ok: '1', story_name_ok: '1' }) });
  const tok = await csrfOf(c);
  const snap = async () => { await c.call('/admin/snapshot', { body: { csrf: tok, kind: 'final' } }); return (await (await c.call('/stage/final', { json: false })).text()); };
  let html = await snap();
  assert.ok(!html.includes('STORY'), 'nothing vetted yet');
  c.db.prepare("UPDATE final_reflections SET vetted=1, use_in_room=1 WHERE participant_id=?").run(b.id);
  c.db.prepare("UPDATE final_reflections SET use_in_room=1 WHERE participant_id=?").run(a.id); // not vetted
  html = await snap();
  assert.ok(html.includes('VETTED NAMED STORY') && html.includes('Bea Boateng'));
  assert.ok(!html.includes('UNVETTED STORY'));
  for (const f of c.db.prepare('SELECT text FROM facts').all()) assert.ok(!html.includes(f.text.slice(0, 30)), 'fact on stage');
  assert.ok(!/https?:\/\//.test(html.replace(/<[^>]*xmlns[^>]*>/g, '')), 'snapshot makes no external references');
  assert.ok(html.includes('Snapshot 20'));
  const rows = c.db.prepare("SELECT id FROM snapshots WHERE kind='final' ORDER BY id").all();
  assert.equal(rows.length, 2);
  assert.ok((await (await c.call('/stage/final?prev=1', { json: false })).text()).includes('Snapshot 20'));
  c.close();
});

test('facts: hidden until verified, shown in the form after verification', async () => {
  const c = await boot();
  const text = c.db.prepare("SELECT text FROM facts WHERE id='F1'").get().text;
  const frag = text.slice(0, 25);
  assert.ok(!(await (await c.call('/start', { json: false })).text()).includes(frag));
  assert.ok(!(await (await c.call('/door', { json: false })).text()).includes(frag));
  c.db.prepare("UPDATE facts SET verified=1 WHERE id='F1'").run();
  assert.ok((await (await c.call('/start', { json: false })).text()).includes('Did you know?'));
  c.close();
});

test('take wording is immutable once locked; unverified reset when fact text changes', () => {
  const db = openDb(':memory:');
  const warns = [];
  db.exec("UPDATE takes SET locked=1"); 
  seedContent(db, { takes: [{ id: 'T1', position: 1, text: 'REWORDED', theme_tag: null }], facts: [], warn: (m) => warns.push(m) });
  assert.notEqual(db.prepare("SELECT text FROM takes WHERE id='T1'").get().text, 'REWORDED');
  assert.equal(warns.length, 1);
  db.prepare("UPDATE facts SET verified=1 WHERE id='F1'").run();
  seedContent(db, { takes: [], facts: [{ id: 'F1', position: 1, kind: 'info', text: 'changed', reveal_text: 'r', answer_bool: null }] });
  assert.equal(db.prepare("SELECT verified FROM facts WHERE id='F1'").get().verified, 0);
});

test('desk lookup finds by name and email; story moderation cannot put unvetted story in room', async () => {
  const c = await boot({ FINAL_CLOSES_AT: '2026-12-02T12:00:00Z' });
  const p = await registered(c, 'find@example.com');
  assert.ok((await (await c.call('/admin/lookup?q=find@exa', { json: false })).text()).includes(String(p.number)));
  assert.ok((await (await c.call('/admin/lookup?q=mensah', { json: false })).text()).includes(String(p.number)));
  c.clock.t = new Date('2026-12-02T09:00:00Z');
  await c.call('/final', { body: finalBody(await ticketFor(c, 'Ama', p.number), { story: 's', story_anon_ok: '1' }) });
  const tok = await csrfOf(c);
  await c.call('/admin/story', { body: { csrf: tok, participant_id: p.id, field: 'use_in_room', value: '1' } });
  assert.equal(c.db.prepare('SELECT use_in_room FROM final_reflections').get().use_in_room, 0);
  await c.call('/admin/story', { body: { csrf: tok, participant_id: p.id, field: 'vetted', value: '1' } });
  await c.call('/admin/story', { body: { csrf: tok, participant_id: p.id, field: 'use_in_room', value: '1' } });
  assert.equal(c.db.prepare('SELECT use_in_room FROM final_reflections').get().use_in_room, 1);
  c.close();
});

test('pages render for all participant and admin routes', async () => {
  const c = await boot();
  for (const p of ['/', '/start', '/door', '/final', '/final/done', '/healthz', '/static/app.js', '/static/app.css',
    '/admin', '/admin/icebreaker', '/admin/final', '/admin/stories', '/admin/volunteers', '/admin/lookup', '/admin/snapshots', '/admin/report']) {
    assert.equal((await c.call(p, { json: false })).status, 200, p);
  }
  assert.equal((await c.call('/stage/final')).status, 404); // no snapshot yet
  assert.equal((await c.call('/nope', { json: false })).status, 404);
  assert.ok(COUNTRIES.length === 55);
  c.close();
});
