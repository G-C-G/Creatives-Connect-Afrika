// Welcome game: played on phones/tablets, portrait. Self-paced and client-side, so a weak connection cannot stall it.
// A "deck" is frozen from verified facts + the two icebreaker statements. Devices fetch it once.
import { loadData, getSetting } from './db.js';
import { takeSplit, shareLabel } from './metrics.js';
import { GAME_QUESTIONS } from './content.js';
import { lookupByNameNumber } from './service.js';

export const POINTS = 10;
export const classify = (share) => (share >= 0.6 ? 'agree' : share <= 0.4 ? 'disagree' : 'split');

export function buildDeck(db, now = new Date()) {
  const data = loadData(db);
  const facts = new Map(db.prepare('SELECT * FROM facts WHERE verified = 1').all().map((f) => [f.id, f]));
  const factRounds = GAME_QUESTIONS.filter((q) => q.game !== false && facts.has(q.fact_id)).map((q) => {
    const f = facts.get(q.fact_id);
    return { type: 'fact', id: q.fact_id, question: q.question || f.text, options: q.options, answer: q.answer_index,
      explain: f.kind === 'true_false' ? f.reveal_text : `${f.text} ${f.reveal_text || ''}`.trim(), wink: q.wink || null };
  });
  const picks = JSON.parse(getSetting(db, 'icebreaker_takes') || '[]').slice(0, 2);
  const predictRounds = picks.map((id) => {
    const tk = data.takes.find((t) => t.id === id), s = takeSplit(data, id, 'pre');
    if (!tk || !s.n) return null;
    return { type: 'predict', id, statement: tk.text, n: s.n, agree: s.agree, disagree: s.disagree, label: shareLabel(s.agree, s.n), answer: classify(s.agreeShare) };
  }).filter(Boolean);
  // Story arc: the verified facts in the order of GAME_QUESTIONS, then "predict the room" as the payoff.
  const rounds = [...factRounds, ...predictRounds];
  return { takenAt: now.toISOString(), points: POINTS, rounds };
}

export function freezeDeck(db, now = new Date()) {
  const deck = buildDeck(db, now);
  const r = db.prepare("INSERT INTO snapshots(kind,taken_at,data_json,html) VALUES ('deck',?,?,'')").run(deck.takenAt, JSON.stringify(deck));
  return { id: Number(r.lastInsertRowid), deck };
}
export function latestDeck(db) {
  const row = db.prepare("SELECT id, data_json FROM snapshots WHERE kind='deck' ORDER BY id DESC LIMIT 1").get();
  return row ? { id: row.id, ...JSON.parse(row.data_json) } : null;
}
export const playOpen = (db) => getSetting(db, 'play_open') === '1';

// Score is always recomputed server-side from the frozen deck; the client's number is never trusted.
export function scoreAnswers(deck, answers) {
  let correct = 0;
  deck.rounds.forEach((r, i) => { if (Array.isArray(answers) && answers[i] === r.answer) correct++; });
  return { score: correct * deck.points, max: deck.rounds.length * deck.points };
}

const rankOf = (db, deckId, score) => ({
  rank: db.prepare('SELECT COUNT(*) c FROM game_plays WHERE deck_id=? AND score>?').get(deckId, score).c + 1,
  total: db.prepare('SELECT COUNT(*) c FROM game_plays WHERE deck_id=?').get(deckId).c,
});

// The code is the key: first name + number must match someone who did the onboarding.
// People without a code do the quick onboarding first (/door), which hands them straight into the game.
export function checkPlayer(db, name, number) {
  const typed = String(name ?? '').trim().slice(0, 80);
  return typed && number ? lookupByNameNumber(db, typed, number) : null;
}

export function savePlay(db, { deck, name, number, answers }) {
  const pt = checkPlayer(db, name, number);
  if (!pt) throw Object.assign(new Error('no match'), { status: 422 });
  const prev = db.prepare('SELECT * FROM game_plays WHERE deck_id=? AND participant_id=?').get(deck.id, pt.id);
  if (prev) return { score: prev.score, max: prev.max_score, repeat: true, ...rankOf(db, deck.id, prev.score) };
  const { score, max } = scoreAnswers(deck, answers);
  db.prepare('INSERT INTO game_plays(deck_id,participant_id,display_name,score,max_score,answers_json,linked) VALUES (?,?,?,?,?,?,1)')
    .run(deck.id, pt.id, pt.first_name, score, max, JSON.stringify(answers ?? []));
  return { score, max, repeat: false, ...rankOf(db, deck.id, score) };
}

export const leaderboard = (db, deckId, limit = 20) =>
  db.prepare('SELECT display_name, score, max_score, linked, created_at FROM game_plays WHERE deck_id=? ORDER BY score DESC, created_at ASC LIMIT ?').all(deckId, limit);
