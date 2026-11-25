// REHEARSAL ONLY. Fills a SEPARATE database with fake delegates so you can rehearse the freeze + stage.
// Usage: DB_PATH=./data/rehearsal.db npm run seed-demo
// Refuses to touch a database that already has participants.
import { openDb, loadData } from '../src/db.js';
import { registerPre, submitFinal } from '../src/service.js';
import { COUNTRIES, SECTORS } from '../src/content.js';

const path = process.env.DB_PATH;
if (!path || path === ':memory:') { console.error('Set DB_PATH to a rehearsal file (NOT your live database).'); process.exit(1); }
const db = openDb(path);
if (db.prepare('SELECT COUNT(*) c FROM participants').get().c) { console.error('Database already has participants. Refusing.'); process.exit(1); }
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const takes = db.prepare('SELECT id FROM takes').all();
const ans = (bias) => takes.map((t) => ({ take_id: t.id, stance: rnd() < bias ? 'agree' : 'disagree', strength: 1 + Math.floor(rnd() * 5), say_aloud: rnd() < .6, speak_on_stage: rnd() < .25 }));
const N = 60, env = { EVENT_STARTS_AT: '2099-01-01T00:00:00Z' };
const made = [];
for (let i = 0; i < N; i++) {
  const r = registerPre(db, { first_name: `Test${i}`, surname: 'Delegate', email: null, country: pick(COUNTRIES.slice(0, 54)), sector: pick(SECTORS).id, project: null, goal: null, values: [], contact_opt_in: false, consent_aggregate: true, answers: ans(.5) }, { source: i % 5 ? 'pre_event' : 'door', env });
  made.push(r.participant);
}
const final = { FINAL_CLOSES_AT: '2099-01-02T00:00:00Z' };
made.slice(0, 30).forEach((p, i) => submitFinal(db, { kind: 'm', participantId: p.id }, { answers: ans(.4), changed_take_ids: ['T3'], what_shaped: null, story: i < 4 ? `Demo story ${i}` : null, story_anon_ok: true, story_name_ok: false }, { env: final }));
console.log(`Seeded ${N} fake delegates, 30 returned. Participation:`, JSON.stringify(loadData(db).participants.length));
