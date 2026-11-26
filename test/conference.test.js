import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';
const _servers = [];
after(() => _servers.forEach((s) => { try { s.closeAllConnections(); s.close(); } catch {} }));

const visibleText = (html) => html.replace(/<(style|script)[\s\S]*?<\/\1>/g, ' ').replace(/<\/?(em|span|b|i|strong)\b[^>]*>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

async function boot() {
  const db = openDb(':memory:');
  const env = { ADMIN_PASSWORD: 'pw', SESSION_SECRET: 's', EVENT_STARTS_AT: '2026-11-30T08:00:00Z' };
  const srv = createServer(createApp({ db, env, now: () => new Date('2026-12-01T10:00:00Z'), fetchImpl: async () => ({ ok: true }) }));
  await new Promise((r) => srv.listen(0, r)); _servers.push(srv);
  const base = `http://127.0.0.1:${srv.address().port}`;
  const call = (path, { body, auth = false } = {}) => fetch(base + path, {
    method: body ? 'POST' : 'GET', redirect: 'manual',
    headers: { ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(auth ? { Authorization: 'Basic ' + Buffer.from('a:pw').toString('base64') } : {}) },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const csrf = async () => /name="csrf" value="([^"]+)"/.exec(await (await call('/admin/casting', { auth: true })).text())[1];
  return { db, call, csrf };
}
// 6 delegates, T1 split 3/3. Ama(agree,5,mic) Bo(agree,4,loud) Cy(agree,5,quiet) vs Di(disagree,3,mic) Eli(disagree,5,mic) Fu(disagree,2,quiet)
const PEOPLE = [['a', 1001, 'Ama', 'agree', 5, 1, 1], ['b', 1002, 'Bo', 'agree', 4, 1, 0], ['c', 1003, 'Cy', 'agree', 5, 0, 0], ['d', 1004, 'Di', 'disagree', 3, 1, 1], ['e', 1005, 'Eli', 'disagree', 5, 1, 1], ['f', 1006, 'Fu', 'disagree', 2, 0, 0]];
function seed(db) {
  const ins = db.prepare("INSERT INTO participants(id,number,first_name,surname,country,sector,consent_aggregate,magic_token,source) VALUES (?,?,?,?,'Ghana','music',1,?,'pre_event')");
  const rsp = db.prepare("INSERT INTO responses(participant_id,phase,take_id,stance,strength,say_aloud,speak_on_stage) VALUES (?,'pre',?,?,?,?,?)");
  for (const [id, n, first, st, sg, say, stage] of PEOPLE) {
    ins.run(id, n, first, 'Surname', `tok-${id}`);
    for (const t of ['T1', 'T2', 'T3', 'T4', 'T5']) rsp.run(id, t, t === 'T1' ? st : 'agree', t === 'T1' ? sg : 3, say, stage);
  }
}

test('casting: admin only; suggests opposing volunteers; remembers who was called and stops suggesting them', async () => {
  const c = await boot(); seed(c.db);
  assert.equal((await c.call('/admin/casting')).status, 401);
  let html = await (await c.call('/admin/casting?take=T1', { auth: true })).text();
  assert.ok(html.includes('Ama Surname') && html.includes('Eli Surname'), 'suggested pair is the most passionate microphone volunteer on each side');
  assert.ok(html.includes('Suggested pairs'));
  const pairsPart = html.slice(html.indexOf('Suggested pairs'), html.indexOf('Everyone on this statement'));
  assert.ok(!pairsPart.includes('Cy Surname') && !pairsPart.includes('Fu Surname'), 'quiet people are never suggested');
  const tok = await c.csrf();
  assert.equal((await c.call('/admin/casting/call', { auth: true, body: { csrf: 'bad', participant_id: 'a', take_id: 'T1' } })).status, 403);
  await c.call('/admin/casting/call', { auth: true, body: { csrf: tok, participant_id: 'a', take_id: 'T1' } });
  assert.equal(c.db.prepare('SELECT COUNT(*) c FROM casting_calls').get().c, 1);
  html = await (await c.call('/admin/casting?take=T1', { auth: true })).text();
  const pairs2 = html.slice(html.indexOf('Suggested pairs'), html.indexOf('Everyone on this statement'));
  assert.ok(!pairs2.includes('Ama Surname') && pairs2.includes('Bo Surname'), 'already-called Ama is replaced by the next volunteer');
  assert.ok(html.includes('Called'), 'shows the called state');
  await c.call('/admin/casting/undo', { auth: true, body: { csrf: tok, participant_id: 'a', take_id: 'T1' } });
  assert.equal(c.db.prepare('SELECT COUNT(*) c FROM casting_calls').get().c, 0);
});

test('conference stage deck: aggregates only (no names), most divisive first, opposite + timer slides, offline-safe', async () => {
  const c = await boot(); seed(c.db);
  assert.equal((await c.call('/stage/conference', { auth: true })).status, 404, 'nothing until frozen');
  const tok = await c.csrf();
  const snaps = await (await c.call('/admin/snapshots', { auth: true })).text();
  assert.ok(snaps.includes('conference'));
  await c.call('/admin/snapshot', { auth: true, body: { csrf: /name="csrf" value="([^"]+)"/.exec(snaps)[1], kind: 'conference' } });
  const html = await (await c.call('/stage/conference', { auth: true })).text();
  assert.match(visibleText(html), /What did the room say\?/); assert.match(html, /6 delegates answered before the event/);
  const visible = html.replace(/<(style|script)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]*>/g, ' ');
  for (const name of ['Ama', 'Bo', 'Cy', 'Di', 'Eli', 'Fu', 'Surname']) assert.ok(!new RegExp(`\\b${name}\\b`).test(visible), `no names on the big screen: ${name}`);
  assert.ok(html.indexOf('Find your opposite') > html.indexOf('Round 5</b> of 5'));
  const first = html.slice(html.indexOf('Round 1</b> of 5'), html.indexOf('Round 2</b> of 5'));
  // game show: every statement is a round with a countdown, a drum roll, a verdict stamp
  assert.equal((html.match(/<section class="slide" data-cards>/g) || []).length, 5); assert.ok(first.includes('class="cdn"') && first.includes('data-drum="1300"'));
  assert.ok(first.includes('<div class="stamp">Split.</div>'), 'a 3/3 room is a Split');
  assert.ok(html.includes('class="pod a on"') && html.includes('class="pod d"'), 'two podiums, one clock each');
  assert.ok(html.includes('id="flash"') && html.includes('buzzer'));
  assert.ok(html.includes('data-timer="90"') && html.includes('Ninety seconds each.') && html.includes('Did anyone move?'));
  assert.match(visibleText(html), /would take the microphone/, 'counts of volunteers, not who they are');
  assert.ok(html.includes('<svg class="field split"'));
  assert.equal((html.match(/<circle class="[ad]/g) || []).length, 30, 'one dot per delegate per statement: 6 delegates x 5 statements');
  assert.ok(!/https?:\/\//.test(html), 'no network references');
  assert.ok(html.includes('Do it for free') && html.includes('Stand by your price') && html.includes('Mostly: do it for free'), 'take 3 shows its own two options on the stage, not agreed / disagreed');
  // T1 (a perfect 3/3 split) is the first statement shown; T2..T5 (6/0) follow
  assert.ok(first.includes('Your art could outlive you') && /<span class="num">3<\/span><span class="lab">Make it sell/.test(first), 'most divisive statement first (its own two options as the labels)');
  assert.equal(c.db.prepare("SELECT COUNT(*) c FROM snapshots WHERE kind='conference'").get().c, 1);
});

test('/me ("what did I say?") is closed until switched on, then shows only your own answers', async () => {
  const c = await boot(); seed(c.db);
  assert.match(await (await c.call('/me')).text(), /not open yet/);
  const tok = await c.csrf();
  await c.call('/admin/me/toggle', { auth: true, body: { csrf: tok, value: '1' } });
  let html = await (await c.call('/me?t=tok-a')).text();
  assert.ok(html.includes('What you said') && html.includes('Agree') && html.includes('Give me the microphone'));
  assert.ok(!html.includes('Eli') && !html.includes('tok-e'), 'never anyone else');
  html = await (await c.call('/me?t=tok-d')).text();
  assert.ok(html.includes('Keep it true') && html.includes('Pretty sure'), 'Di chose the second option, strength 3');
  const form = async (n, num) => (await c.call('/me/lookup', { body: { first_name: n, number: String(num) } })).text();
  assert.ok((await form(' eli ', 1005)).includes('fight you on this'), 'name + code works, case and spaces ignored (Eli: strength 5)');
  assert.match(await form('Eli', 9999), /could not match/i);
  await c.call('/admin/me/toggle', { auth: true, body: { csrf: tok, value: '0' } });
  assert.match(await (await c.call('/me?t=tok-a')).text(), /not open yet/);
});
