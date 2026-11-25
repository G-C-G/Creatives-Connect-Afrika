import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/metrics.js';

// Hand-calculated fixture (see comments).
const takes = [{ id: 'T1', text: 'one' }, { id: 'T2', text: 'two' }];
const P = (id, sector = 'music', region = 'West') => ({ id, source: 'pre_event', sector, region, country: 'Ghana' });
const R = (participant_id, phase, take_id, stance, strength, extra = {}) => ({ participant_id, phase, take_id, stance, strength, say_aloud: false, speak_on_stage: false, ...extra });
const data = {
  takes,
  participants: ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => P(id)).concat([{ ...P('G'), source: 'final_only' }]),
  responses: [
    // pre T1: A+5 B+3 C-4 D-2 E+1 F-5  -> 3 agree / 3 disagree, mean strength 20/6=3.33
    R('A', 'pre', 'T1', 'agree', 5), R('B', 'pre', 'T1', 'agree', 3), R('C', 'pre', 'T1', 'disagree', 4),
    R('D', 'pre', 'T1', 'disagree', 2), R('E', 'pre', 'T1', 'agree', 1), R('F', 'pre', 'T1', 'disagree', 5, { speak_on_stage: true }),
    // pre T2: all agree, strengths 5,5,4,4,5,5 -> mean 4.67
    ...[['A', 5], ['B', 5], ['C', 4], ['D', 4], ['E', 5], ['F', 5]].map(([id, s]) => R(id, 'pre', 'T2', 'agree', s)),
    // final T1: A dis2 (shift -7, flip) B agree3 (0) C agree1 (+5, flip) D dis2 (0); G post-only agree2
    R('A', 'final', 'T1', 'disagree', 2), R('B', 'final', 'T1', 'agree', 3), R('C', 'final', 'T1', 'agree', 1), R('D', 'final', 'T1', 'disagree', 2), R('G', 'final', 'T1', 'agree', 2),
    // final T2: A agree5 (0) B agree4 (-1) C agree4 (0) D agree4 (0); G agree 3
    R('A', 'final', 'T2', 'agree', 5), R('B', 'final', 'T2', 'agree', 4), R('C', 'final', 'T2', 'agree', 4), R('D', 'final', 'T2', 'agree', 4), R('G', 'final', 'T2', 'agree', 3),
  ],
};

test('net score and flip', () => {
  assert.equal(M.net({ stance: 'agree', strength: 4 }), 4);
  assert.equal(M.net({ stance: 'disagree', strength: 4 }), -4);
  const a = M.pairs(data, 'T1').find((x) => x.participantId === 'A');
  assert.equal(a.shift, -7); assert.equal(a.flip, true);
  assert.equal(M.pairs(data, 'T1').find((x) => x.participantId === 'B').flip, false);
});

test('per-take split matches hand calculation', () => {
  const s = M.takeSplit(data, 'T1', 'pre');
  assert.deepEqual([s.n, s.agree, s.disagree, s.agreeShare, s.meanStrength, s.speakOnStage], [6, 3, 3, 0.5, 3.33, 1]);
});

test('matched pairs only: post-only person excluded from change', () => {
  const c = M.takeChange(data, 'T1');
  assert.deepEqual(c, { n: 4, agreePre: 2, agreeFinal: 2, meanNetChange: -0.5, flips: 2, flipsToAgree: 1, flipsToDisagree: 1 });
  assert.equal(M.takeChange(data, 'T2').meanNetChange, -0.25);
});

test('participation, return rate, post-only reported separately', () => {
  const p = M.participation(data);
  assert.equal(p.preCompleters, 6); assert.equal(p.matched, 4); assert.equal(p.postOnly, 1);
  assert.equal(p.finalResponders, 5); assert.ok(Math.abs(p.returnRate - 4 / 6) < 1e-9);
});

test('biggest mover, still split, icebreaker suggestions', () => {
  assert.equal(M.biggestMover(data).takeId, 'T1');
  assert.equal(M.stillSplit(data).takeId, 'T1'); // final agree 3/5=.6 beats T2 at 1.0
  const sg = M.suggestIcebreaker(data);
  assert.equal(sg.mostEven, 'T1'); assert.equal(sg.highestStrength, 'T2');
});

test('n < 20 shows counts, n >= 20 shows percent with n', () => {
  assert.equal(M.shareLabel(14, 31), '45% (14 of 31)');
  assert.equal(M.shareLabel(14, 19), '14 of 19');
  assert.equal(M.shareLabel(0, 0), 'no responses');
});

test('segment cells with n < 5 are suppressed, n >= 5 shown', () => {
  const small = M.segmentTable(data, 'sector', 'T1'); // 4 matched, all music
  assert.deepEqual(small, [{ segment: 'music', suppressed: true }]);
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const big = {
    takes: [takes[0]],
    participants: ids.map((id, i) => P(id, i < 5 ? 'film' : 'tech')),
    responses: ids.flatMap((id) => [R(id, 'pre', 'T1', 'agree', 3), R(id, 'final', 'T1', 'disagree', 3)]),
  };
  const t = M.segmentTable(big, 'sector', 'T1');
  assert.equal(t.find((c) => c.segment === 'film').suppressed, false);
  assert.equal(t.find((c) => c.segment === 'film').n, 5);
  assert.equal(t.find((c) => c.segment === 'tech').suppressed, true);
});

test('headline is non-causal and falls back with no matched data', () => {
  assert.match(M.headline(data), /Biggest measured shift/);
  assert.doesNotMatch(M.headline(data), /caused|because of/i);
  assert.match(M.headline({ ...data, responses: data.responses.filter((r) => r.phase === 'pre') }), /Day 3 results alone/);
});

test('flipSummary: how many matched people changed side on at least one statement (descriptive only)', () => {
  // fixture: A and C flip on T1, nobody flips on T2 -> 2 of 4 matched changed side, mean 0.5 flips each
  assert.deepEqual(M.flipSummary(data), { matched: 4, changedAtLeastOne: 2, meanFlips: 0.5, changedOnThreeOrMore: 0 });
  assert.equal(M.flipSummary({ ...data, responses: data.responses.filter((r) => r.phase === 'pre') }).matched, 0);
});
