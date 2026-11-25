// Pure metrics. No DB, no I/O. Rules from spec section 9.
// data = { participants:[{id,source,sector,region,country}], responses:[{participant_id,phase,take_id,stance,strength,say_aloud,speak_on_stage}], takes:[{id,text,position}] }

export const SMALL_N = 20;     // below this, show counts not percentages
export const MIN_CELL = 5;     // suppress segment cells below this

export const net = (r) => (r.stance === 'agree' ? r.strength : -r.strength);
const round = (x, d = 2) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function shareLabel(k, n) {
  if (!n) return 'no responses';
  if (n < SMALL_N) return `${k} of ${n}`;
  return `${Math.round((100 * k) / n)}% (${k} of ${n})`;
}

export function responsesFor(data, phase, takeId) {
  return data.responses.filter((r) => r.phase === phase && r.take_id === takeId);
}

export function takeSplit(data, takeId, phase) {
  const rs = responsesFor(data, phase, takeId);
  const agree = rs.filter((r) => r.stance === 'agree').length;
  return {
    n: rs.length,
    agree,
    disagree: rs.length - agree,
    agreeShare: rs.length ? agree / rs.length : null,
    meanStrength: round(mean(rs.map((r) => r.strength))),
    sayAloud: rs.filter((r) => r.say_aloud).length,
    speakOnStage: rs.filter((r) => r.speak_on_stage).length,
  };
}

const idsWith = (data, phase) => new Set(data.responses.filter((r) => r.phase === phase).map((r) => r.participant_id));

export function participation(data) {
  const pre = idsWith(data, 'pre');
  const fin = idsWith(data, 'final');
  const matched = [...pre].filter((id) => fin.has(id)).length;
  const postOnly = [...fin].filter((id) => !pre.has(id)).length;
  const src = (s) => data.participants.filter((p) => pre.has(p.id) && p.source === s).length;
  return {
    preCompleters: pre.size,
    viaPreEvent: src('pre_event'),
    viaDoor: src('door'),
    finalResponders: fin.size,
    matched,
    postOnly,
    returnRate: pre.size ? matched / pre.size : null,
  };
}

// Matched pairs for one take: participants with BOTH a pre and final response.
export function pairs(data, takeId) {
  const pre = new Map(responsesFor(data, 'pre', takeId).map((r) => [r.participant_id, r]));
  const out = [];
  for (const f of responsesFor(data, 'final', takeId)) {
    const p = pre.get(f.participant_id);
    if (!p) continue;
    out.push({
      participantId: f.participant_id, pre: p, final: f,
      preNet: net(p), finalNet: net(f), shift: net(f) - net(p), flip: p.stance !== f.stance,
    });
  }
  return out;
}

export function summarisePairs(ps) {
  return {
    n: ps.length,
    agreePre: ps.filter((x) => x.pre.stance === 'agree').length,
    agreeFinal: ps.filter((x) => x.final.stance === 'agree').length,
    meanNetChange: round(mean(ps.map((x) => x.shift))),
    flips: ps.filter((x) => x.flip).length,
    flipsToAgree: ps.filter((x) => x.flip && x.final.stance === 'agree').length,
    flipsToDisagree: ps.filter((x) => x.flip && x.final.stance === 'disagree').length,
  };
}

export function takeChange(data, takeId) {
  return summarisePairs(pairs(data, takeId));
}

// Biggest mover: largest |mean net change| among matched pairs; ties -> more flips -> lower id.
export function biggestMover(data) {
  const rows = data.takes.map((t) => ({ takeId: t.id, ...takeChange(data, t.id) })).filter((r) => r.n > 0);
  if (!rows.length) return null;
  rows.sort((a, b) => Math.abs(b.meanNetChange) - Math.abs(a.meanNetChange) || b.flips - a.flips || a.takeId.localeCompare(b.takeId));
  return rows[0];
}

// Still-split: final-phase agree share closest to 50% (all final responders). Ties -> lower id.
export function stillSplit(data) {
  const rows = data.takes.map((t) => ({ takeId: t.id, ...takeSplit(data, t.id, 'final') })).filter((r) => r.n > 0);
  if (!rows.length) return null;
  rows.sort((a, b) => Math.abs(a.agreeShare - 0.5) - Math.abs(b.agreeShare - 0.5) || a.takeId.localeCompare(b.takeId));
  return rows[0];
}

// Icebreaker suggestions from pre-phase data.
export function suggestIcebreaker(data) {
  const rows = data.takes.map((t) => ({ takeId: t.id, ...takeSplit(data, t.id, 'pre') })).filter((r) => r.n > 0);
  if (!rows.length) return { mostEven: null, highestStrength: null, rows: [] };
  const even = [...rows].sort((a, b) => Math.abs(a.agreeShare - 0.5) - Math.abs(b.agreeShare - 0.5) || a.takeId.localeCompare(b.takeId))[0];
  const strong = [...rows].sort((a, b) => b.meanStrength - a.meanStrength || a.takeId.localeCompare(b.takeId))[0];
  return { mostEven: even.takeId, highestStrength: strong.takeId, rows };
}

// Segment table over matched pairs for one take. Cells with n < MIN_CELL are suppressed (no numbers).
export function segmentTable(data, segmentKey, takeId) {
  const byId = new Map(data.participants.map((p) => [p.id, p]));
  const groups = new Map();
  for (const x of pairs(data, takeId)) {
    const seg = byId.get(x.participantId)?.[segmentKey] || 'Unknown';
    if (!groups.has(seg)) groups.set(seg, []);
    groups.get(seg).push(x);
  }
  return [...groups.entries()]
    .map(([segment, ps]) => (ps.length < MIN_CELL
      ? { segment, suppressed: true }
      : { segment, suppressed: false, ...summarisePairs(ps) }))
    .sort((a, b) => a.segment.localeCompare(b.segment));
}

// Headline text. Never causal: "measured shift across the event".
export function headline(data) {
  const part = participation(data);
  const mover = biggestMover(data);
  if (!mover || mover.n === 0) return 'Day 3 results alone: no matched comparison yet.';
  const t = data.takes.find((x) => x.id === mover.takeId);
  const dir = mover.meanNetChange > 0 ? 'toward agreeing' : mover.meanNetChange < 0 ? 'toward disagreeing' : 'with no net movement';
  return `Biggest measured shift: “${t.text}” moved ${dir} (mean net change ${mover.meanNetChange > 0 ? '+' : ''}${mover.meanNetChange}, ${mover.n} matched). ${part.matched} of ${part.preCompleters} came back.`;
}
