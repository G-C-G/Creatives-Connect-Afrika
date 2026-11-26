import { loadData } from './db.js';
import { participation, takeSplit, takeChange, segmentTable, flipSummary } from './metrics.js';

// CSV with formula-injection guard (cells starting = + - @ are prefixed with ').
export function toCsv(rows, columns) {
  const cell = (v) => {
    if (v == null) return '';
    let s = typeof v === 'boolean' ? (v ? '1' : '0') : String(v);
    if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}

// PRIVATE: includes names and emails. Never share.
export function privateCsv(db) {
  const d = loadData(db);
  const resp = new Map(d.responses.map((r) => [`${r.participant_id}|${r.phase}|${r.take_id}`, r]));
  const refl = new Map(d.reflections.map((r) => [r.participant_id, r]));
  const cols = ['number', 'source', 'first_name', 'surname', 'email', 'country', 'region', 'role', 'sector', 'activities', 'project', 'goal', 'goals', 'memory', 'values', 'contact_opt_in', 'consent_aggregate', 'created_at'];
  for (const t of d.takes) for (const ph of ['pre', 'final']) for (const f of ['stance', 'strength', 'say_aloud', 'speak_on_stage']) cols.push(`${t.id}_${ph}_${f}`);
  cols.push('changed_take_ids', 'what_shaped', 'story', 'story_anon_ok', 'story_name_ok', 'vetted', 'use_in_room');
  const rows = d.participants.map((p) => {
    const row = { ...p, values: p.values.join(';'), activities: (p.activities_json ? JSON.parse(p.activities_json) : []).join('; '), goals: (p.goals_json ? JSON.parse(p.goals_json) : []).join('; ') };
    for (const t of d.takes) for (const ph of ['pre', 'final']) {
      const r = resp.get(`${p.id}|${ph}|${t.id}`);
      for (const f of ['stance', 'strength', 'say_aloud', 'speak_on_stage']) row[`${t.id}_${ph}_${f}`] = r ? r[f] : '';
    }
    const f = refl.get(p.id);
    if (f) Object.assign(row, { ...f, changed_take_ids: f.changed_take_ids.join(';') });
    return row;
  });
  return toCsv(rows, cols);
}

// AGGREGATE: no names, no emails, no per-person rows. Segment cells with n < 5 are suppressed.
export function aggregateCsv(db) {
  const d = loadData(db);
  const out = [];
  const add = (section, take_id, segment, metric, value) => out.push({ section, take_id, segment, metric, value });
  const part = participation(d);
  for (const [k, v] of Object.entries(part)) add('participation', '', '', k, v == null ? '' : Math.round(v * 1000) / 1000);
  for (const [k, v] of Object.entries(flipSummary(d))) add('flips', '', '', k, v == null ? '' : v);
  for (const t of d.takes) {
    for (const ph of ['pre', 'final']) {
      const s = takeSplit(d, t.id, ph);
      for (const m of ['n', 'agree', 'disagree', 'meanStrength', 'sayAloud', 'speakOnStage']) add(`take_${ph}`, t.id, '', m, s[m]);
    }
    const c = takeChange(d, t.id);
    for (const [m, v] of Object.entries(c)) add('take_matched', t.id, '', m, v);
    for (const seg of ['role', 'sector', 'region']) {
      for (const cell of segmentTable(d, seg, t.id)) {
        if (cell.suppressed) add(`segment_${seg}`, t.id, cell.segment, 'suppressed_n_lt_5', '');
        else for (const m of ['n', 'agreePre', 'agreeFinal', 'meanNetChange', 'flips']) add(`segment_${seg}`, t.id, cell.segment, m, cell[m]);
      }
    }
  }
  return toCsv(out, ['section', 'take_id', 'segment', 'metric', 'value']);
}
