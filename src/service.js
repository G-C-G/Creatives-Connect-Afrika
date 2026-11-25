import { randomBytes, randomUUID, createHmac, timingSafeEqual, randomInt } from 'node:crypto';
import { COUNTRIES, SECTORS, GOALS, VALUES, FACT_SLOTS } from './content.js';
import { getSetting, getTakes, lockTakes } from './db.js';

export class ClosedError extends Error { constructor(kind) { super(kind); this.kind = kind; } } // 'closed' | 'not_open'

export const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const clip = (s, n) => String(s ?? '').trim().slice(0, n);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;

// ---------- settings with env defaults ----------
export function timings(db, env) {
  const get = (k, e) => getSetting(db, k) || env[e] || null;
  return {
    eventStartsAt: get('event_starts_at', 'EVENT_STARTS_AT'),
    finalOpensAt: get('final_opens_at', 'FINAL_OPENS_AT'),
    finalClosesAt: get('final_closes_at', 'FINAL_CLOSES_AT'),
  };
}
export function finalWindow(db, env, now = new Date()) {
  const { finalOpensAt, finalClosesAt } = timings(db, env);
  if (finalOpensAt && now < new Date(finalOpensAt)) return 'not_open';
  if (finalClosesAt && now >= new Date(finalClosesAt)) return 'closed';
  return 'open';
}

// ---------- number + token ----------
export function issueNumber(db) {
  const taken = db.prepare('SELECT 1 FROM participants WHERE number = ?');
  for (let i = 0; i < 200; i++) {
    const n = randomInt(1000, 10000);
    if (!taken.get(n)) return n;
  }
  const max = db.prepare('SELECT MAX(number) m FROM participants').get().m ?? 999;
  if (max >= 9999) throw new Error('number space exhausted');
  return max + 1;
}
const newToken = () => randomBytes(18).toString('base64url');

// ---------- ticket (proves a successful Day 3 lookup without server-side sessions) ----------
const sign = (secret, body) => createHmac('sha256', secret).update(body).digest('base64url').slice(0, 22);
export function makeTicket(secret, kind, pid, now = new Date(), ttlSec = 7200) {
  const body = `${kind}.${pid || '-'}.${Math.floor(now.getTime() / 1000) + ttlSec}`;
  return `${body}.${sign(secret, body)}`;
}
export function readTicket(secret, ticket, now = new Date()) {
  const parts = String(ticket || '').split('.');
  if (parts.length !== 4) return null;
  const [kind, pid, exp, sig] = parts;
  const want = Buffer.from(sign(secret, `${kind}.${pid}.${exp}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (Number(exp) < Math.floor(now.getTime() / 1000)) return null;
  if (kind !== 'm' && kind !== 'p') return null;
  return { kind, participantId: pid === '-' ? null : pid };
}

// ---------- validation ----------
const optIds = (list) => new Set(list.map((o) => o.id));
const SECTOR_IDS = optIds(SECTORS), GOAL_IDS = optIds(GOALS), VALUE_IDS = optIds(VALUES);
const yn = (v) => (v === 'y' ? true : v === 'n' ? false : null);

export function parseTakeAnswers(p, takes) {
  const answers = []; const errors = {};
  for (const t of takes) {
    const stance = p.get(`t_${t.id}_stance`);
    const strength = Number(p.get(`t_${t.id}_strength`));
    if (stance !== 'agree' && stance !== 'disagree') errors[`t_${t.id}_stance`] = 'required';
    if (!Number.isInteger(strength) || strength < 1 || strength > 5) errors[`t_${t.id}_strength`] = 'required';
    // One question: how far would you take it? quiet = keep it to myself, aloud = say it in the room, stage = argue it on stage.
    const lvl = p.get(`t_${t.id}_level`);
    let say = yn(p.get(`t_${t.id}_say`)), stage = yn(p.get(`t_${t.id}_stage`));
    if (lvl === 'quiet') { say = false; stage = false; }
    else if (lvl === 'aloud') { say = true; stage = false; }
    else if (lvl === 'stage') { say = true; stage = true; }
    answers.push({ take_id: t.id, stance, strength, say_aloud: say, speak_on_stage: stage });
  }
  return { answers, errors };
}

// p = URLSearchParams. short = door version (required: first, surname, country, sector; email optional).
export function validatePre(p, { short = false, takes }) {
  const errors = {};
  const first = clip(p.get('first_name'), 80), surname = clip(p.get('surname'), 80);
  const email = clip(p.get('email'), 254).toLowerCase();
  const country = p.get('country') || '', sector = p.get('sector') || '';
  if (!first) errors.first_name = 'required';
  if (!surname) errors.surname = 'required';
  if (email && !isEmail(email)) errors.email = 'invalid';
  if (!COUNTRIES.includes(country)) errors.country = 'required';
  if (!SECTOR_IDS.has(sector)) errors.sector = 'required';
  if (p.get('consent_aggregate') !== '1') errors.consent_aggregate = 'required';
  const goal = p.get('goal') || '';
  if (goal && !GOAL_IDS.has(goal)) errors.goal = 'invalid';
  const values = short ? [] : [...new Set(p.getAll('values'))].filter((v) => VALUE_IDS.has(v));
  if (!short && p.getAll('values').length && values.length > 3) errors.values = 'max3';
  const { answers, errors: ae } = parseTakeAnswers(p, takes);
  Object.assign(errors, ae);
  return {
    errors,
    clean: {
      first_name: first, surname, email: email || null, country, sector,
      project: short ? null : clip(p.get('project'), 140) || null,
      goal: short ? null : goal || null, memory: clip(p.get('memory'), 140) || null, values,
      contact_opt_in: short ? false : p.get('contact_opt_in') === '1',
      consent_aggregate: p.get('consent_aggregate') === '1', answers,
    },
  };
}

export function validateFinal(p, { takes, postOnly }) {
  const errors = {};
  const { answers, errors: ae } = parseTakeAnswers(p, takes);
  Object.assign(errors, ae);
  const takeIds = new Set(takes.map((t) => t.id));
  const none = p.get('changed_none') === '1';
  const changed = [...new Set(p.getAll('changed'))].filter((id) => takeIds.has(id));
  if (!none && !changed.length) errors.changed = 'required';
  const story = clip(p.get('story'), 800);
  const clean = {
    answers, changed_take_ids: none ? [] : changed, what_shaped: clip(p.get('what_shaped'), 500) || null,
    story: story || null,
    story_anon_ok: !!story && p.get('story_anon_ok') === '1',
    story_name_ok: !!story && p.get('story_name_ok') === '1',
  };
  if (postOnly) {
    clean.first_name = clip(p.get('first_name'), 80);
    clean.country = p.get('country') || '';
    clean.sector = p.get('sector') || '';
    clean.consent_aggregate = p.get('consent_aggregate') === '1';
    if (!clean.first_name) errors.first_name = 'required';
    if (!COUNTRIES.includes(clean.country)) errors.country = 'required';
    if (!SECTOR_IDS.has(clean.sector)) errors.sector = 'required';
    if (!clean.consent_aggregate) errors.consent_aggregate = 'required';
  }
  return { errors, clean };
}

// ---------- writes ----------
function writeResponses(db, pid, phase, answers) {
  const st = db.prepare(`INSERT INTO responses(participant_id,phase,take_id,stance,strength,say_aloud,speak_on_stage)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(participant_id,phase,take_id) DO UPDATE SET
    stance=excluded.stance, strength=excluded.strength, say_aloud=excluded.say_aloud, speak_on_stage=excluded.speak_on_stage`);
  for (const a of answers) st.run(pid, phase, a.take_id, a.stance, a.strength, a.say_aloud == null ? null : +a.say_aloud, a.speak_on_stage == null ? null : +a.speak_on_stage);
  lockTakes(db); // first stored response freezes the wording
}

function writeFactAnswers(db, pid, factAnswers) {
  const st = db.prepare(`INSERT INTO fact_answers(participant_id,fact_id,answer_bool) VALUES (?,?,?)
    ON CONFLICT(participant_id,fact_id) DO UPDATE SET answer_bool=excluded.answer_bool`);
  for (const [fid, v] of Object.entries(factAnswers || {})) st.run(pid, fid, v == null ? null : +v);
}

export function factAnswersFrom(p, db) {
  const out = {};
  const ids = db.prepare("SELECT id FROM facts WHERE kind='true_false' AND verified=1").all().map((r) => r.id);
  for (const id of ids) { const v = p.get(`fact_${id}`); if (v === 'y' || v === 'n') out[id] = v === 'y'; }
  return out;
}

// Pre-event / door registration. Same email twice -> existing participant, same number.
// Edits allowed only while now < event start. Returns {participant, created, edited, locked}.
export function registerPre(db, clean, { source, env = {}, now = new Date(), factAnswers = {} }) {
  db.exec('BEGIN IMMEDIATE');
  try {
    let existing = clean.email ? db.prepare('SELECT * FROM participants WHERE lower(email) = ?').get(clean.email) : null;
    const { eventStartsAt } = timings(db, env);
    const editable = !eventStartsAt || now < new Date(eventStartsAt);
    let participant, created = false, edited = false;
    if (existing) {
      if (editable) {
        db.prepare(`UPDATE participants SET first_name=?,surname=?,country=?,sector=?,project=?,goal=?,memory=?,values_json=?,contact_opt_in=?,consent_aggregate=? WHERE id=?`)
          .run(clean.first_name, clean.surname, clean.country, clean.sector, clean.project, clean.goal, clean.memory ?? null, JSON.stringify(clean.values), +clean.contact_opt_in, +clean.consent_aggregate, existing.id);
        writeResponses(db, existing.id, 'pre', clean.answers);
        writeFactAnswers(db, existing.id, factAnswers);
        edited = true;
      }
      participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(existing.id);
    } else {
      const id = randomUUID();
      db.prepare(`INSERT INTO participants(id,number,first_name,surname,email,country,sector,project,goal,memory,values_json,contact_opt_in,consent_aggregate,magic_token,source)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, issueNumber(db), clean.first_name, clean.surname, clean.email, clean.country, clean.sector, clean.project, clean.goal, clean.memory ?? null, JSON.stringify(clean.values), +clean.contact_opt_in, +clean.consent_aggregate, newToken(), source);
      writeResponses(db, id, 'pre', clean.answers);
      writeFactAnswers(db, id, factAnswers);
      participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(id);
      created = true;
    }
    db.exec('COMMIT');
    return { participant, created, edited, existing: !!existing };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---------- Day 3 linking ----------
export function lookupByNameNumber(db, firstName, number) {
  const n = Number(String(number).trim());
  if (!Number.isInteger(n)) return null;
  const p = db.prepare('SELECT * FROM participants WHERE number = ?').get(n);
  if (!p || p.source === 'final_only') return null; // post-only people have no baseline to link
  return norm(p.first_name) === norm(firstName) ? p : null;
}
export const lookupByToken = (db, token) => (token ? db.prepare('SELECT * FROM participants WHERE magic_token = ?').get(String(token)) : null);

// ticket: {kind:'m', participantId} | {kind:'p'}. Upserts, so a re-submit before close overwrites.
export function submitFinal(db, ticket, clean, { env = {}, now = new Date() } = {}) {
  const w = finalWindow(db, env, now);
  if (w !== 'open') throw new ClosedError(w);
  db.exec('BEGIN IMMEDIATE');
  try {
    let pid = ticket.participantId, linked = true;
    if (ticket.kind === 'p') {
      pid = randomUUID(); linked = false;
      db.prepare(`INSERT INTO participants(id,number,first_name,surname,country,sector,consent_aggregate,magic_token,source)
        VALUES (?,?,?,'',?,?,?,?, 'final_only')`)
        .run(pid, issueNumber(db), clean.first_name, clean.country, clean.sector, +clean.consent_aggregate, newToken());
    } else if (!db.prepare('SELECT 1 FROM participants WHERE id = ?').get(pid)) {
      throw new Error('unknown participant');
    }
    writeResponses(db, pid, 'final', clean.answers);
    // Keep consent flags on resubmit only if a story is present; moderation flags are preserved.
    db.prepare(`INSERT INTO final_reflections(participant_id,changed_take_ids,what_shaped,story,story_anon_ok,story_name_ok)
      VALUES (?,?,?,?,?,?) ON CONFLICT(participant_id) DO UPDATE SET changed_take_ids=excluded.changed_take_ids,
      what_shaped=excluded.what_shaped, story=excluded.story, story_anon_ok=excluded.story_anon_ok,
      story_name_ok=excluded.story_name_ok, vetted = CASE WHEN final_reflections.story IS excluded.story THEN final_reflections.vetted ELSE 0 END,
      use_in_room = CASE WHEN final_reflections.story IS excluded.story THEN final_reflections.use_in_room ELSE 0 END`)
      .run(pid, JSON.stringify(clean.changed_take_ids), clean.what_shaped, clean.story, +clean.story_anon_ok, +clean.story_name_ok);
    db.exec('COMMIT');
    return { participantId: pid, linked };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export { getTakes, FACT_SLOTS };

// A person's own pre-event answers (for the optional "what did I say?" page).
export function myAnswers(db, participantId) {
  return db.prepare(`SELECT t.position, t.text, r.stance, r.strength, r.say_aloud, r.speak_on_stage FROM responses r JOIN takes t ON t.id = r.take_id
    WHERE r.participant_id = ? AND r.phase = 'pre' ORDER BY t.position`).all(participantId).map((r) => ({
    text: r.text, stance: r.stance, strength: r.strength, level: r.speak_on_stage ? 'stage' : r.say_aloud ? 'aloud' : r.say_aloud === 0 ? 'quiet' : 'unknown' }));
}
