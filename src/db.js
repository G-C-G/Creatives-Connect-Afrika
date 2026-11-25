import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { TAKES, FACTS, regionOf } from './content.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS participants(
  id TEXT PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL DEFAULT '',
  email TEXT,
  country TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT '',
  project TEXT, goal TEXT, values_json TEXT,
  contact_opt_in INTEGER NOT NULL DEFAULT 0,
  consent_aggregate INTEGER NOT NULL,
  magic_token TEXT UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('pre_event','door','final_only')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS participants_email_uq ON participants(lower(email)) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS takes(
  id TEXT PRIMARY KEY, position INTEGER, text TEXT NOT NULL, theme_tag TEXT, locked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS responses(
  participant_id TEXT NOT NULL REFERENCES participants(id),
  phase TEXT NOT NULL CHECK (phase IN ('pre','final')),
  take_id TEXT NOT NULL REFERENCES takes(id),
  stance TEXT NOT NULL CHECK (stance IN ('agree','disagree')),
  strength INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 5),
  say_aloud INTEGER, speak_on_stage INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (participant_id, phase, take_id)
);
CREATE TABLE IF NOT EXISTS final_reflections(
  participant_id TEXT PRIMARY KEY REFERENCES participants(id),
  changed_take_ids TEXT NOT NULL DEFAULT '[]',
  what_shaped TEXT, story TEXT,
  story_anon_ok INTEGER NOT NULL DEFAULT 0,
  story_name_ok INTEGER NOT NULL DEFAULT 0,
  vetted INTEGER NOT NULL DEFAULT 0,
  use_in_room INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS facts(
  id TEXT PRIMARY KEY, position INTEGER, kind TEXT NOT NULL CHECK (kind IN ('info','true_false')),
  text TEXT NOT NULL, reveal_text TEXT, answer_bool INTEGER, source_url TEXT, verified INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS fact_answers(
  participant_id TEXT NOT NULL, fact_id TEXT NOT NULL, answer_bool INTEGER,
  PRIMARY KEY (participant_id, fact_id)
);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS snapshots(
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK (kind IN ('icebreaker','final','deck')),
  taken_at TEXT NOT NULL, data_json TEXT NOT NULL, html TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS game_plays(
  id INTEGER PRIMARY KEY AUTOINCREMENT, deck_id INTEGER NOT NULL, participant_id TEXT, display_name TEXT NOT NULL,
  score INTEGER NOT NULL, max_score INTEGER NOT NULL, answers_json TEXT NOT NULL, linked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS game_plays_once ON game_plays(deck_id, participant_id) WHERE participant_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS outbox(
  id INTEGER PRIMARY KEY AUTOINCREMENT, participant_id TEXT, to_email TEXT NOT NULL,
  subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unsent', error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`;

// Older databases: snapshots.kind only allowed ('icebreaker','final'). Rebuild the table once to allow 'deck'.
function migrate(db) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='snapshots'").get();
  if (!row || row.sql.includes("'deck'")) return;
  db.exec(`ALTER TABLE snapshots RENAME TO snapshots_old;
    CREATE TABLE snapshots(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL CHECK (kind IN ('icebreaker','final','deck')), taken_at TEXT NOT NULL, data_json TEXT NOT NULL, html TEXT NOT NULL);
    INSERT INTO snapshots(id,kind,taken_at,data_json,html) SELECT id,kind,taken_at,data_json,html FROM snapshots_old;
    DROP TABLE snapshots_old;`);
}

export function openDb(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  db.exec(SCHEMA);
  seedContent(db);
  return db;
}

// Takes: insert if missing; update only while unlocked. Locked text is never touched.
// Facts: insert if missing; if seed text changes, update and reset verified to 0.
export function seedContent(db, { takes = TAKES, facts = FACTS, warn = console.warn } = {}) {
  const getT = db.prepare('SELECT * FROM takes WHERE id = ?');
  for (const t of takes) {
    const row = getT.get(t.id);
    if (!row) {
      db.prepare('INSERT INTO takes(id,position,text,theme_tag) VALUES (?,?,?,?)').run(t.id, t.position, t.text, t.theme_tag);
    } else if (!row.locked) {
      db.prepare('UPDATE takes SET position=?, text=?, theme_tag=? WHERE id=?').run(t.position, t.text, t.theme_tag, t.id);
    } else if (row.text !== t.text) {
      warn(`[seed] take ${t.id} is LOCKED; seed text differs and was ignored.`);
    }
  }
  const getF = db.prepare('SELECT * FROM facts WHERE id = ?');
  for (const f of facts) {
    const row = getF.get(f.id);
    const ab = f.answer_bool == null ? null : f.answer_bool ? 1 : 0;
    if (!row) {
      db.prepare('INSERT INTO facts(id,position,kind,text,reveal_text,answer_bool,source_url,verified) VALUES (?,?,?,?,?,?,?,0)')
        .run(f.id, f.position, f.kind, f.text, f.reveal_text, ab, f.source_url || '');
    } else if (row.text !== f.text || row.reveal_text !== f.reveal_text || row.kind !== f.kind || row.answer_bool !== ab) {
      db.prepare('UPDATE facts SET position=?,kind=?,text=?,reveal_text=?,answer_bool=?,source_url=?,verified=0 WHERE id=?')
        .run(f.position, f.kind, f.text, f.reveal_text, ab, f.source_url || '', f.id);
    }
  }
}

export const lockTakes = (db) => db.exec('UPDATE takes SET locked = 1');

export function getSetting(db, key) {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? null;
}
export function setSetting(db, key, value) {
  if (value == null || value === '') db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  else db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value));
}

export const getTakes = (db) => db.prepare('SELECT id,position,text,theme_tag,locked FROM takes ORDER BY position').all();
export const getVerifiedFacts = (db) => db.prepare('SELECT * FROM facts WHERE verified = 1 ORDER BY position').all();

const bool = (v) => (v == null ? null : !!v);

// Loads everything the metrics need, as plain objects.
export function loadData(db) {
  const participants = db.prepare('SELECT * FROM participants ORDER BY number').all().map((p) => ({
    ...p, values: p.values_json ? JSON.parse(p.values_json) : [], region: regionOf(p.country),
    contact_opt_in: !!p.contact_opt_in, consent_aggregate: !!p.consent_aggregate,
  }));
  const responses = db.prepare('SELECT * FROM responses').all().map((r) => ({
    ...r, say_aloud: bool(r.say_aloud), speak_on_stage: bool(r.speak_on_stage),
  }));
  const reflections = db.prepare('SELECT * FROM final_reflections').all().map((f) => ({
    ...f, changed_take_ids: JSON.parse(f.changed_take_ids || '[]'),
    story_anon_ok: !!f.story_anon_ok, story_name_ok: !!f.story_name_ok, vetted: !!f.vetted, use_in_room: !!f.use_in_room,
  }));
  return { participants, responses, reflections, takes: getTakes(db) };
}
