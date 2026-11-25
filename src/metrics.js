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

// A statement "moved" if the average net score (scale -5..+5) of matched pairs changed by at least `threshold`.
export const MOVED_THRESHOLD = 0.5;
export function movedStatements(data, threshold = MOVED_THRESHOLD) {
  const rows = data.takes.map((t) => ({ takeId: t.id, ...takeChange(data, t.id) })).filter((r) => r.n > 0);
  const ids = rows.filter((r) => Math.abs(r.meanNetChange) >= threshold).map((r) => r.takeId);
  return { count: ids.length, total: data.takes.length, ids, threshold };
}

// How many matched people changed side on at least one statement, and how many statements each changed on average.
// Descriptive only: with five statements and no control group, some switching is ordinary noise. Never present it as persuasion.
export function flipSummary(data) {
  const per = new Map();
  for (const t of data.takes) for (const x of pairs(data, t.id)) per.set(x.participantId, (per.get(x.participantId) || 0) + (x.flip ? 1 : 0));
  const matched = per.size, counts = [...per.values()];
  return {
    matched,
    changedAtLeastOne: counts.filter((c) => c >= 1).length,
    meanFlips: matched ? Math.round((counts.reduce((a, b) => a + b, 0) / matched) * 100) / 100 : null,
    changedOnThreeOrMore: counts.filter((c) => c >= 3).length,
  };
}

// ---- Conference game (the 10-minute stage slot) ----
// level = how far someone said they would take a statement: stage (give me the microphone) > aloud > quiet.
export const levelOf = (r) => (r.speak_on_stage ? 'stage' : r.say_aloud ? 'aloud' : r.say_aloud === false ? 'quiet' : 'unknown');
const LEVEL_RANK = { stage: 0, aloud: 1, quiet: 2, unknown: 3 };

// What the room said, per statement, with how far each side would take it. Aggregates only: no names.
export function conferenceStats(data) {
  return data.takes.map((t) => {
    const rs = responsesFor(data, 'pre', t.id), sp = takeSplit(data, t.id, 'pre');
    const side = (st) => {
      const x = rs.filter((r) => r.stance === st), levels = { stage: 0, aloud: 0, quiet: 0, unknown: 0 };
      x.forEach((r) => { levels[levelOf(r)]++; });
      return { n: x.length, levels, fighters: x.filter((r) => r.strength === 5).length, meanStrength: round(mean(x.map((r) => r.strength))) };
    };
    return { takeId: t.id, text: t.text, n: sp.n, agree: sp.agree, disagree: sp.disagree, agreeShare: sp.agreeShare, sides: { agree: side('agree'), disagree: side('disagree') } };
  });
}

// Statements ordered most divisive first (agree share closest to 50%): the best ones to debate.
export const byDivisiveness = (stats) => [...stats].filter((x) => x.n > 0).sort((a, b) => Math.abs(a.agreeShare - 0.5) - Math.abs(b.agreeShare - 0.5) || a.takeId.localeCompare(b.takeId));

// Private casting list for one statement: people on each side, most willing and most passionate first.
export function castingList(data, takeId) {
  const byId = new Map(data.participants.map((p) => [p.id, p]));
  const rows = responsesFor(data, 'pre', takeId).map((r) => {
    const p = byId.get(r.participant_id);
    return { participantId: r.participant_id, number: p?.number, name: `${p?.first_name ?? ''} ${p?.surname ?? ''}`.trim(), country: p?.country, sector: p?.sector, stance: r.stance, strength: r.strength, level: levelOf(r) };
  });
  const order = (a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || b.strength - a.strength || a.number - b.number;
  return { agree: rows.filter((r) => r.stance === 'agree').sort(order), disagree: rows.filter((r) => r.stance === 'disagree').sort(order) };
}

// Opposing pairs to call up: most willing first (microphone, then out loud), then most passionate. Skips people already called.
export function suggestPairs(list, calledIds = new Set(), k = 3) {
  const pool = (side) => side.filter((r) => !calledIds.has(r.participantId) && (r.level === 'stage' || r.level === 'aloud'));
  const a = pool(list.agree), d = pool(list.disagree), pairs = [];
  for (let i = 0; i < Math.min(k, a.length, d.length); i++) pairs.push({ agree: a[i], disagree: d[i] });
  return pairs;
}
