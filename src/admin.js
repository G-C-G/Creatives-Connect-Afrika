import { h, raw, str } from './html.js';
import { layout } from './pages.js';
import { loadData, getSetting, setSetting, lockTakes } from './db.js';
import { SECTORS, FACTS, ROLES, sidesOf } from './content.js';
import { timings } from './service.js';
import { retryOutbox } from './mail.js';
import { privateCsv, aggregateCsv } from './exports.js';
import { buildStageData, renderStageHtml } from './stage.js';
import { freezeDeck, latestDeck, playOpen, leaderboard } from './play.js';
import * as M from './metrics.js';

const sectorLabel = (id) => SECTORS.find((s) => s.id === id)?.en ?? id;
const fmt = (v) => (v == null ? '–' : v);
const dtLocal = (iso) => (iso ? iso.slice(0, 16) : '');
const toIso = (v) => (v && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) ? `${v.slice(0, 16)}:00Z` : null); // Accra = UTC

function page(title, body, csrf) {
  return layout({ title: `Admin: ${title}`, main: 'admin', body: h`
  <nav><a href="/admin">Dashboard</a><a href="/admin/icebreaker">Icebreaker</a><a href="/admin/casting">Casting</a><a href="/admin/play">Welcome game</a><a href="/admin/final">Final game</a><a href="/admin/stories">Stories</a>
  <a href="/admin/volunteers">Volunteers</a><a href="/admin/memories">Memories</a><a href="/admin/lookup">Desk lookup</a><a href="/admin/snapshots">Snapshots</a><a href="/admin/report">Report</a></nav>
  <h1>${title}</h1>${body}` });
}
const csrfField = (csrf) => h`<input type="hidden" name="csrf" value="${csrf}">`;
const postBtn = (action, csrf, label, fields = {}, cls = 'btn') => h`<form method="post" action="${action}" style="display:inline">${csrfField(csrf)}
  ${Object.entries(fields).map(([k, v]) => h`<input type="hidden" name="${k}" value="${v}">`)}<button class="${cls}" type="submit">${label}</button></form>`;

function flipLine(d) {
  const f = M.flipSummary(d);
  return f.matched ? h`<p><b>Changed side on at least one statement:</b> ${f.changedAtLeastOne} of ${f.matched} matched people (average ${f.meanFlips} statements each). <span class="hint">Descriptive only: some switching is ordinary noise and there is no control group, so this is movement, not persuasion.</span></p>` : '';
}

function participationTable(part) {
  return h`<table><tr><th>Completed pre-event / door</th><td>${part.preCompleters} (${part.viaPreEvent} pre-event, ${part.viaDoor} door)</td></tr>
  <tr><th>Responded on Day 3</th><td>${part.finalResponders}</td></tr><tr><th>Matched (returned)</th><td>${part.matched}</td></tr>
  <tr><th>Post-only (no baseline)</th><td>${part.postOnly}</td></tr>
  <tr><th>Return rate</th><td>${part.returnRate == null ? '–' : `${part.matched} of ${part.preCompleters} (${Math.round(part.returnRate * 100)}%)`}</td></tr></table>`;
}

function takeTable(d) {
  return h`<table><tr><th>Take</th><th colspan="5">Pre-event</th><th colspan="3">Day 3 (matched)</th></tr>
  <tr><th></th><th>n</th><th>Agree</th><th>Disagree</th><th>Mean str.</th><th>Say aloud / On stage</th><th>Agree then&rarr;now</th><th>Mean net change</th><th>Flips</th></tr>
  ${d.takes.map((t) => { const s = M.takeSplit(d, t.id, 'pre'), c = M.takeChange(d, t.id);
    return h`<tr><td><b>${t.id}</b> ${t.text}${sidesOf(t.id) ? h`<br><span class="hint">Agree = ${sidesOf(t.id).agree} \u00b7 Disagree = ${sidesOf(t.id).disagree}</span>` : ''}</td><td>${s.n}</td><td>${s.agree}</td><td>${s.disagree}</td><td>${fmt(s.meanStrength)}</td><td>${s.sayAloud} / ${s.speakOnStage}</td>
    <td>${c.n ? `${c.agreePre} → ${c.agreeFinal} (n=${c.n})` : '–'}</td><td>${fmt(c.meanNetChange)}</td><td>${c.n ? c.flips : '–'}</td></tr>`; })}</table>`;
}

// The key reading: for each take, how each kind of delegate answered (government, tourism managers, experience makers, independent creatives, visitors).
// Cells under MIN_CELL are suppressed, and these are people who chose to answer: directional only.
function roleByTake(d) {
  const roleOf = new Map(d.participants.map((p) => [p.id, p.role || '']));
  const label = (id) => ROLES.find((r) => r.id === id)?.en ?? (id || 'Not asked');
  const ids = [...new Set([...ROLES.map((r) => r.id), ...d.participants.map((p) => p.role || '')])];
  return h`<h2>What each group thinks (before the event)</h2><p class="hint">Share choosing the first option, by who they are. Groups under ${M.MIN_CELL} people are hidden.</p>
  <table><tr><th>Take</th>${ids.map((id) => h`<th>${label(id)}</th>`)}</tr>
  ${d.takes.map((t) => { const sd = sidesOf(t.id); const rs = d.responses.filter((r) => r.phase === 'pre' && r.take_id === t.id);
    return h`<tr><td><b>${t.id}</b> ${sd ? sd.agree : 'Agree'} vs ${sd ? sd.disagree : 'Disagree'}</td>${ids.map((id) => { const g = rs.filter((r) => roleOf.get(r.participant_id) === id);
      return g.length < M.MIN_CELL ? h`<td class="hint">${g.length ? 'few' : '–'}</td>` : h`<td>${Math.round((100 * g.filter((r) => r.stance === 'agree').length) / g.length)}% <span class="hint">(n=${g.length})</span></td>`; })}</tr>`; })}</table>`;
}

function dashboard(ctx, csrf) {
  const { db, env } = ctx, d = loadData(db), tm = timings(db, env);
  const unsent = db.prepare("SELECT COUNT(*) c FROM outbox WHERE status='unsent'").get().c;
  const facts = db.prepare('SELECT * FROM facts ORDER BY position').all();
  const locked = d.takes.every((t) => t.locked);
  const warns = [
    !tm.finalClosesAt && 'final_closes_at is NOT set: the Day 3 form will never close.',
    !tm.eventStartsAt && 'event_starts_at is NOT set: pre-event edits stay open.',
    !locked && 'Take wording is not locked yet. It locks automatically on the first stored response.',
    unsent && `${unsent} email(s) unsent.`,
  ].filter(Boolean);
  return page('Dashboard', h`
  ${warns.length ? h`<div class="consent">${warns.map((w) => h`<p class="err">${w}</p>`)}${unsent ? postBtn('/admin/outbox/retry', csrf, 'Retry unsent emails', {}, 'btn ghost') : ''}</div>` : ''}
  <h2>Participation</h2>${participationTable(M.participation(d))}
  <h2>Per take</h2>${takeTable(d)}${roleByTake(d)}
  <h2>Settings (times are UTC = Accra time)</h2>
  <form method="post" action="/admin/settings">${csrfField(csrf)}
   <div class="field"><label>Event starts (pre-event edits stop)<input type="datetime-local" name="event_starts_at" value="${dtLocal(tm.eventStartsAt)}"></label></div>
   <div class="field"><label>Day 3 form opens<input type="datetime-local" name="final_opens_at" value="${dtLocal(tm.finalOpensAt)}"></label></div>
   <div class="field"><label>Day 3 form closes (1h before the final slot)<input type="datetime-local" name="final_closes_at" value="${dtLocal(tm.finalClosesAt)}"></label></div>
   <button class="btn" type="submit">Save</button></form>
  <h2>Takes</h2><p>${locked ? 'All takes are LOCKED.' : 'Not locked.'} ${locked ? '' : postBtn('/admin/lock-takes', csrf, 'Lock take wording now', {}, 'btn ghost')}</p>
  <h2>Hot facts</h2><p class="hint">Only verified facts are ever shown to anyone. Verify against the source first.</p>
  <table>${facts.map((f) => h`<tr><td><b>${f.id}</b> ${f.text}<br><span class="hint">${f.reveal_text}</span><br><span class="hint"><b>To verify:</b> ${FACTS.find((x) => x.id === f.id)?.verify ?? ''}</span>${(FACTS.find((x) => x.id === f.id)?.sources ?? []).map((src) => h`<br><span class="hint"><b>Source:</b> <a href="${src.url}" rel="noopener">${src.name}</a> (${src.date}). \u201c${src.passage}\u201d ${src.note || ''}</span>`)}</td><td>${f.verified ? 'VERIFIED' : 'unverified'}</td>
   <td>${postBtn('/admin/facts/verify', csrf, f.verified ? 'Unverify' : 'Mark verified', { id: f.id, verified: f.verified ? '0' : '1' }, 'btn ghost')}</td></tr>`)}</table>
  <h2>Exports</h2><p><a class="btn ghost" href="/admin/export/aggregate.csv">Aggregate CSV (shareable)</a> <a class="btn ghost" href="/admin/export/all.csv">Private CSV (names + emails: do not share)</a></p>`, csrf);
}

function icebreaker(ctx, csrf) {
  const d = loadData(ctx.db), sg = M.suggestIcebreaker(d);
  const picks = JSON.parse(getSetting(ctx.db, 'icebreaker_takes') || '[]');
  return page('Icebreaker picker', h`
  <p>Suggestion: the most even split and the highest mean strength. Pick two.</p>
  <form method="post" action="/admin/icebreaker">${csrfField(csrf)}
  <table><tr><th>Pick</th><th>Take</th><th>n</th><th>Agree / Disagree</th><th>Agree share</th><th>Mean strength</th><th>Flags</th></tr>
  ${d.takes.map((t) => { const s = M.takeSplit(d, t.id, 'pre');
    return h`<tr><td><input type="checkbox" name="pick" value="${t.id}" ${picks.includes(t.id) ? 'checked' : ''}></td><td><b>${t.id}</b> ${t.text}</td><td>${s.n}</td>
    <td>${s.agree} / ${s.disagree}</td><td>${s.agreeShare == null ? '–' : `${Math.round(s.agreeShare * 100)}%`}</td><td>${fmt(s.meanStrength)}</td>
    <td>${sg.mostEven === t.id ? 'MOST EVEN ' : ''}${sg.highestStrength === t.id ? 'HIGHEST STRENGTH' : ''}</td></tr>`; })}</table>
  <button class="btn" type="submit">Save my two picks</button></form>
  <p>Current picks: ${picks.length ? picks.join(', ') : 'none'}. Then <a href="/admin/snapshots">freeze the icebreaker snapshot</a>.</p>`, csrf);
}

function finalView(ctx, csrf) {
  const d = loadData(ctx.db), part = M.participation(d), mover = M.biggestMover(d), split = M.stillSplit(d);
  const seg = (key) => mover ? M.segmentTable(d, key, mover.takeId) : [];
  const segTable = (key) => h`<table><tr><th>${key}</th><th>n</th><th>Agree then&rarr;now</th><th>Mean net change</th></tr>
    ${seg(key).map((c) => c.suppressed ? h`<tr><td>${key === 'sector' ? sectorLabel(c.segment) : c.segment}</td><td colspan="3">fewer than ${M.MIN_CELL}: suppressed</td></tr>`
      : h`<tr><td>${key === 'sector' ? sectorLabel(c.segment) : c.segment}</td><td>${c.n}</td><td>${M.shareLabel(c.agreePre, c.n)} → ${M.shareLabel(c.agreeFinal, c.n)}</td><td>${fmt(c.meanNetChange)}</td></tr>`)}</table>`;
  return page('Final game view', h`<p class="hint">${M.headline(d)}</p>${participationTable(part)}${flipLine(d)}${takeTable(d)}
  <p><b>Biggest mover:</b> ${mover ? `${mover.takeId} (mean net change ${mover.meanNetChange}, n=${mover.n})` : '–'} · <b>Still split (Day 3, all responders):</b> ${split ? `${split.takeId} (${split.agree} agree / ${split.disagree} disagree)` : '–'}</p>
  ${mover ? h`<h2>Segments for ${mover.takeId}</h2>${segTable('sector')}${segTable('region')}<p class="hint">Cells under ${M.MIN_CELL} are suppressed. Directional only.</p>` : ''}
  <p><a href="/admin/snapshots">Freeze the final snapshot</a></p>`, csrf);
}

function stories(ctx, csrf, url) {
  const d = loadData(ctx.db), onlyVetted = url.searchParams.get('vetted') === '1';
  const byId = new Map(d.participants.map((p) => [p.id, p]));
  const all = d.reflections.filter((r) => r.story);
  const ok = all.filter((r) => r.story_anon_ok || r.story_name_ok).filter((r) => !onlyVetted || r.vetted);
  return page('Story shortlist', h`<p>${all.length} stories, ${all.length - all.filter((r) => r.story_anon_ok || r.story_name_ok).length} without consent (hidden). Only vetted + use-in-room stories reach the stage.
  <a href="${onlyVetted ? '/admin/stories' : '/admin/stories?vetted=1'}">${onlyVetted ? 'Show all' : 'Only vetted'}</a></p>
  <table>${ok.map((r) => { const p = byId.get(r.participant_id);
    return h`<tr><td>${r.story}<br><span class="hint">${r.story_name_ok ? `May be named: ${p.first_name} ${p.surname}` : 'Anonymous only'} · #${p.number}</span></td>
    <td>${postBtn('/admin/story', csrf, r.vetted ? 'Vetted ✓' : 'Mark vetted', { participant_id: r.participant_id, field: 'vetted', value: r.vetted ? '0' : '1' }, 'btn ghost')}
    ${postBtn('/admin/story', csrf, r.use_in_room ? 'In room ✓' : 'Use in room', { participant_id: r.participant_id, field: 'use_in_room', value: r.use_in_room ? '0' : '1' }, 'btn ghost')}</td></tr>`; })}</table>`, csrf);
}

// "Name something from your country's creative past": delegates' own answers, grouped by country, with no names.
// Raw text from delegates: check it before it goes on any screen, and check any claim before you state it as fact.
function memories(ctx) {
  const rows = ctx.db.prepare("SELECT country, memory FROM participants WHERE memory IS NOT NULL AND memory <> '' ORDER BY country, id").all();
  const by = new Map(); for (const r of rows) (by.get(r.country) || by.set(r.country, []).get(r.country)).push(r.memory);
  return page('Memories: creative past, in delegates\u2019 words', h`<p class="hint">${rows.length} answer(s) from ${by.size} countries. Names are not shown. These are unchecked: read them before any are used on a screen, and verify anything you present as fact.</p>
  ${[...by].map(([c, list]) => h`<h2>${c} (${list.length})</h2><ul>${list.map((m) => h`<li>${m}</li>`)}</ul>`)}${rows.length ? '' : h`<p>None yet.</p>`}`);
}

function volunteers(ctx) {
  const d = loadData(ctx.db), byId = new Map(d.participants.map((p) => [p.id, p]));
  const who = (id) => { const p = byId.get(id); return `${p.first_name} ${p.surname} (#${p.number})`; };
  const pre = (takeId) => d.responses.filter((r) => r.phase === 'pre' && r.take_id === takeId && r.speak_on_stage);
  const pairIdx = new Map(d.takes.map((t) => [t.id, new Map(M.pairs(d, t.id).map((x) => [x.participantId, x]))]));
  return page('Volunteers (willing to argue it on stage)', h`
  <h2>Welcome game: pre-event volunteers by take and side</h2>
  ${d.takes.map((t) => h`<h3>${t.id}</h3><p>Agree side: ${pre(t.id).filter((r) => r.stance === 'agree').map((r) => who(r.participant_id)).join(', ') || '–'}<br>
    Disagree side: ${pre(t.id).filter((r) => r.stance === 'disagree').map((r) => who(r.participant_id)).join(', ') || '–'}</p>`)}
  <h2>Final game: Day 3 volunteers, changed mind vs did not</h2>
  ${d.takes.map((t) => { const fin = d.responses.filter((r) => r.phase === 'final' && r.take_id === t.id && r.speak_on_stage);
    const idx = pairIdx.get(t.id); const changed = fin.filter((r) => idx.get(r.participant_id)?.flip), same = fin.filter((r) => idx.has(r.participant_id) && !idx.get(r.participant_id).flip), none = fin.filter((r) => !idx.has(r.participant_id));
    return h`<h3>${t.id}</h3><p>Changed mind: ${changed.map((r) => who(r.participant_id)).join(', ') || '–'}<br>Did not: ${same.map((r) => who(r.participant_id)).join(', ') || '–'}<br>No baseline: ${none.map((r) => who(r.participant_id)).join(', ') || '–'}</p>`; })}`);
}

function lookup(ctx, url) {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const rows = q.length >= 3 ? ctx.db.prepare(`SELECT number,first_name,surname,email,source FROM participants
    WHERE lower(first_name||' '||surname) LIKE ? OR lower(coalesce(email,'')) LIKE ? ORDER BY surname LIMIT 20`).all(`%${q}%`, `%${q}%`) : [];
  return page('Desk lookup (lost numbers)', h`<form method="get"><div class="field"><label>Name or email (min 3 characters)<input name="q" value="${q}"></label></div><button class="btn">Search</button></form>
  <table>${rows.map((r) => h`<tr><td><b>${r.number}</b></td><td>${r.first_name} ${r.surname}</td><td>${r.email || ''}</td><td>${r.source}</td></tr>`)}</table>${q.length >= 3 && !rows.length ? h`<p>No match.</p>` : ''}`);
}

function snapshots(ctx, csrf) {
  const rows = ctx.db.prepare('SELECT id,kind,taken_at FROM snapshots ORDER BY id DESC').all();
  const kindRows = (k) => rows.filter((r) => r.kind === k);
  return page('Freeze snapshots', h`<p>The big screen runs from the <b>latest frozen snapshot</b>, never the live DB. Freeze, then open the stage page. Keep a downloaded copy on the stage laptop.</p>
  ${['conference', 'final', 'icebreaker'].map((k) => h`<h2>${k}</h2>${postBtn('/admin/snapshot', csrf, `Freeze ${k} snapshot now`, { kind: k })}
   <p><a href="/stage/${k}">Open big screen (latest)</a> · <a href="/stage/${k}?prev=1">Open previous (fallback)</a></p>
   <table>${kindRows(k).map((r, i) => h`<tr><td>#${r.id}</td><td>${r.taken_at}</td><td>${i === 0 ? 'LATEST' : i === 1 ? 'PREVIOUS' : ''}</td><td><a href="/admin/snapshot/${r.id}.html">download .html</a> · <a href="/admin/snapshot/${r.id}.json">.json</a></td></tr>`)}</table>`)}`, csrf);
}

const LEVEL_LABEL = { stage: 'Microphone', aloud: 'Out loud', quiet: 'Quiet', unknown: '?' };

// Private: names are for the host only. The big screen never shows them.
function casting(ctx, csrf, url) {
  const d = loadData(ctx.db), stats = M.byDivisiveness(M.conferenceStats(d));
  const callRows = ctx.db.prepare('SELECT participant_id, take_id FROM casting_calls').all();
  const calledAny = new Set(callRows.map((r) => r.participant_id));
  const take = url.searchParams.get('take') || stats[0]?.takeId;
  const cur = stats.find((x) => x.takeId === take);
  const on = getSetting(ctx.db, 'show_my_answers') === '1';
  const sel = stats.map((x) => h`<a href="/admin/casting?take=${x.takeId}" ${x.takeId === take ? 'style="font-weight:800;text-decoration:underline"' : ''}>${x.takeId} (${x.agree}/${x.disagree})</a>${' '}`);
  const header = h`<h2>My-answers page: ${on ? 'ON' : 'off'}</h2>
    <p class="hint">/me shows people their own earlier answers so they can find someone who said the opposite. It makes them aware of those answers, which can nudge the Day 3 re-ask: switch it on for the slot, off afterwards, and best of all run the conference game after the Day 3 form closes.</p>
    <p>${postBtn('/admin/me/toggle', csrf, on ? 'Switch OFF' : 'Switch ON', { value: on ? '0' : '1' }, 'btn ghost')}</p>`;
  if (!cur) return page('Casting (conference game)', h`<p>No pre-event answers yet.</p>${header}`, csrf);
  const lists = M.castingList(d, take), pairs = M.suggestPairs(lists, calledAny, 4);
  const person = (r) => h`<b>${r.name}</b> #${r.number} · ${sectorLabel(r.sector)}, ${r.country} · strength ${r.strength} · ${LEVEL_LABEL[r.level]}`;
  const callBtn = (r) => callRows.some((c) => c.participant_id === r.participantId && c.take_id === take)
    ? postBtn('/admin/casting/undo', csrf, 'Called \u2713 (undo)', { participant_id: r.participantId, take_id: take }, 'btn ghost')
    : postBtn('/admin/casting/call', csrf, 'Mark called', { participant_id: r.participantId, take_id: take }, 'btn ghost');
  const side = (name, rows, st) => h`<h3>${name}: ${cur.sides[st].n} people (${cur.sides[st].levels.stage} would take the microphone, ${cur.sides[st].levels.aloud} out loud, ${cur.sides[st].fighters} \u201cI\u2019d fight you on this\u201d)</h3>
    ${cur.sides[st].levels.stage + cur.sides[st].levels.aloud === 0 ? h`<p class="err">Nobody on this side offered to speak: you will need to ask for a volunteer from the floor.</p>` : ''}
    <table>${rows.slice(0, 15).map((r) => h`<tr><td>${person(r)}${calledAny.has(r.participantId) ? ' (already called)' : ''}</td><td>${callBtn(r)}</td></tr>`)}</table>`;
  return page('Casting (conference game)', h`
  <p>Statements, most divisive first (agree / disagree): ${sel}</p>
  <div class="consent"><b>${cur.takeId}:</b> ${cur.text}<br><span class="hint">${cur.agree} agreed, ${cur.disagree} disagreed.</span></div>
  <h2>Suggested pairs (most willing and most passionate, opposites)</h2>
  ${pairs.length ? h`<table>${pairs.map((p) => h`<tr><td>${person(p.agree)}</td><td>${callBtn(p.agree)}</td><td>${person(p.disagree)}</td><td>${callBtn(p.disagree)}</td></tr>`)}</table>` : h`<p class="err">No opposing pair where both sides offered to speak. Use the lists below, or ask the floor.</p>`}
  <h2>Everyone on this statement</h2>${side('AGREE', lists.agree, 'agree')}${side('DISAGREE', lists.disagree, 'disagree')}
  <h2>Stage deck</h2><p>Freeze the <a href="/admin/snapshots">conference snapshot</a> (aggregates only, no names), then open <a href="/stage/conference">/stage/conference</a>.</p>
  ${header}`, csrf);
}

function playAdmin(ctx, csrf) {
  const deck = latestDeck(ctx.db), open = playOpen(ctx.db);
  const picks = JSON.parse(getSetting(ctx.db, 'icebreaker_takes') || '[]');
  const plays = deck ? ctx.db.prepare('SELECT COUNT(*) c FROM game_plays WHERE deck_id=?').get(deck.id).c : 0;
  return page('Welcome game (phones and tablets, portrait)', h`
  <p>Status: <b>${open ? 'OPEN' : 'CLOSED'}</b>. Players go to <b>/play</b>. Content is frozen into a deck, so it cannot change mid-game.</p>
  <ol><li>Pick the two statements on <a href="/admin/icebreaker">Icebreaker</a> (currently: ${picks.length ? picks.join(', ') : 'none'}).</li>
  <li>Verify the hot facts on the <a href="/admin">Dashboard</a>. Unverified facts are left out of the game.</li>
  <li>Freeze the deck, then open the game.</li></ol>
  <p>${postBtn('/admin/play/freeze', csrf, 'Freeze deck now')} ${postBtn('/admin/play/open', csrf, open ? 'Close game' : 'Open game', { value: open ? '0' : '1' }, 'btn ghost')}</p>
  ${deck ? h`<h2>Current deck (#${deck.id}, frozen ${deck.takenAt.slice(0, 16).replace('T', ' ')} UTC)</h2>
  <table>${deck.rounds.map((r, i) => h`<tr><td>${i + 1}. ${r.type === 'fact' ? 'Guess it' : 'Predict the room'}</td><td>${r.type === 'fact' ? r.question : `${r.statement} (room: ${r.label} agreed; answer: ${r.answer})`}</td></tr>`)}</table>
  <h2>Leaderboard (${plays} plays)</h2>
  <table><tr><th>#</th><th>Name</th><th>Score</th></tr>${leaderboard(ctx.db, deck.id).map((r, i) => h`<tr><td>${i + 1}</td><td>${r.display_name}</td><td>${r.score} / ${r.max_score}</td></tr>`)}</table>` : h`<p>No deck frozen yet.</p>`}`, csrf);
}

function report(ctx) {
  const d = loadData(ctx.db), part = M.participation(d), mover = M.biggestMover(d);
  const quotes = d.reflections.filter((r) => r.story && r.story_anon_ok && r.vetted).slice(0, 3);
  const segs = (key) => mover ? M.segmentTable(d, key, mover.takeId) : [];
  return page('One-page report (print me)', h`<style>@media print{nav,.band,footer{display:none}}</style>
  <p><b>Creatives Connect Afrika 2026: hot takes, measured shift across the event.</b> Prepared by Gold Coast Games.</p>
  <h2>Participation</h2>${participationTable(part)}${flipLine(d)}
  <h2>Then vs now (matched pairs only)</h2>${takeTable(d)}
  <p>${M.headline(d)}</p>
  ${mover ? h`<h2>Segments (biggest mover ${mover.takeId})</h2>${['sector', 'region'].map((k) => h`<p><b>${k}</b>: ${segs(k).map((c) => c.suppressed ? `${c.segment}: suppressed (n<${M.MIN_CELL})` : `${k === 'sector' ? sectorLabel(c.segment) : c.segment}: ${M.shareLabel(c.agreePre, c.n)} → ${M.shareLabel(c.agreeFinal, c.n)}`).join(' · ')}</p>`)}` : ''}
  <h2>Voices (anonymous, consented, vetted)</h2>${quotes.length ? quotes.map((q) => h`<p class="consent">“${q.story}”</p>`) : h`<p>None cleared.</p>`}
  <h2>Method and limits</h2><p class="hint">Self-selected respondents, not a random sample. Return bias: people who came back may differ from those who did not. Counts are shown instead of percentages when n is under ${M.SMALL_N}; segment cells under ${M.MIN_CELL} are suppressed. The assigned-side debate in the welcome game may nudge views on those takes. Results are directional, not statistical, and describe a measured shift across the event, not a cause.</p>`);
}

// Returns {status,type,body,headers} or null. csrf valid already checked for POST by caller.
export async function adminRoute(ctx, req, url, form, csrf) {
  const { db, env } = ctx, p = url.pathname, now = ctx.now();
  const html = (x) => ({ status: 200, type: 'text/html; charset=utf-8', body: str(x) });
  const redirect = (to) => ({ status: 303, headers: { Location: to }, body: '' });
  if (req.method === 'GET') {
    if (p === '/admin') return html(dashboard(ctx, csrf));
    if (p === '/admin/icebreaker') return html(icebreaker(ctx, csrf));
    if (p === '/admin/final') return html(finalView(ctx, csrf));
    if (p === '/admin/play') return html(playAdmin(ctx, csrf));
    if (p === '/admin/casting') return html(casting(ctx, csrf, url));
    if (p === '/admin/stories') return html(stories(ctx, csrf, url));
    if (p === '/admin/volunteers') return html(volunteers(ctx));
    if (p === '/admin/memories') return html(memories(ctx));
    if (p === '/admin/lookup') return html(lookup(ctx, url));
    if (p === '/admin/snapshots') return html(snapshots(ctx, csrf));
    if (p === '/admin/report') return html(report(ctx));
    if (p === '/admin/export/all.csv') return { status: 200, type: 'text/csv; charset=utf-8', headers: { 'Content-Disposition': 'attachment; filename="cca-private-all.csv"' }, body: privateCsv(db) };
    if (p === '/admin/export/aggregate.csv') return { status: 200, type: 'text/csv; charset=utf-8', headers: { 'Content-Disposition': 'attachment; filename="cca-aggregate.csv"' }, body: aggregateCsv(db) };
    const m = p.match(/^\/admin\/snapshot\/(\d+)\.(html|json)$/);
    if (m) { const s = db.prepare('SELECT * FROM snapshots WHERE id=?').get(+m[1]); if (!s) return null;
      return m[2] === 'html' ? { status: 200, type: 'text/html; charset=utf-8', headers: { 'Content-Disposition': `attachment; filename="stage-${s.kind}-${s.id}.html"` }, body: s.html }
        : { status: 200, type: 'application/json', body: s.data_json }; }
    return null;
  }
  if (req.method !== 'POST') return null;
  if (p === '/admin/settings') {
    for (const k of ['event_starts_at', 'final_opens_at', 'final_closes_at']) setSetting(db, k, toIso(form.get(k)));
    return redirect('/admin');
  }
  if (p === '/admin/lock-takes') { lockTakes(db); return redirect('/admin'); }
  if (p === '/admin/facts/verify') { db.prepare('UPDATE facts SET verified=? WHERE id=?').run(form.get('verified') === '1' ? 1 : 0, form.get('id')); return redirect('/admin'); }
  if (p === '/admin/icebreaker') {
    const ids = new Set(db.prepare('SELECT id FROM takes').all().map((t) => t.id));
    setSetting(db, 'icebreaker_takes', JSON.stringify(form.getAll('pick').filter((x) => ids.has(x)).slice(0, 2)));
    return redirect('/admin/icebreaker');
  }
  if (p === '/admin/story') {
    const f = form.get('field'); if (f !== 'vetted' && f !== 'use_in_room') return { status: 400, type: 'text/plain', body: 'bad field' };
    // use_in_room can only be switched on for a vetted, consented story
    const v = form.get('value') === '1' ? 1 : 0;
    if (f === 'use_in_room' && v) db.prepare('UPDATE final_reflections SET use_in_room=1 WHERE participant_id=? AND vetted=1 AND story IS NOT NULL AND (story_anon_ok=1 OR story_name_ok=1)').run(form.get('participant_id'));
    else if (f === 'vetted') db.prepare(`UPDATE final_reflections SET vetted=?, use_in_room = CASE WHEN ?=0 THEN 0 ELSE use_in_room END WHERE participant_id=?`).run(v, v, form.get('participant_id'));
    else db.prepare('UPDATE final_reflections SET use_in_room=0 WHERE participant_id=?').run(form.get('participant_id'));
    return redirect('/admin/stories');
  }
  if (p === '/admin/snapshot') {
    const kind = form.get('kind'); if (kind !== 'icebreaker' && kind !== 'final' && kind !== 'conference') return { status: 400, type: 'text/plain', body: 'bad kind' };
    const data = buildStageData(db, kind, now, { logos: env.SHOW_PARTNER_LOGOS !== '0' });
    db.prepare('INSERT INTO snapshots(kind,taken_at,data_json,html) VALUES (?,?,?,?)').run(kind, data.takenAt, JSON.stringify(data), renderStageHtml(data));
    setSetting(db, `snapshot_${kind}_taken_at`, data.takenAt);
    return redirect('/admin/snapshots');
  }
  if (p === '/admin/casting/call' || p === '/admin/casting/undo') {
    const pid = form.get('participant_id'), tid = form.get('take_id');
    if (p.endsWith('/call')) db.prepare('INSERT OR IGNORE INTO casting_calls(participant_id, take_id) VALUES (?,?)').run(pid, tid);
    else db.prepare('DELETE FROM casting_calls WHERE participant_id=? AND take_id=?').run(pid, tid);
    return redirect(`/admin/casting?take=${encodeURIComponent(tid || '')}`);
  }
  if (p === '/admin/me/toggle') { setSetting(db, 'show_my_answers', form.get('value') === '1' ? '1' : '0'); return redirect('/admin/casting'); }
  if (p === '/admin/play/freeze') { freezeDeck(db, now); return redirect('/admin/play'); }
  if (p === '/admin/play/open') { setSetting(db, 'play_open', form.get('value') === '1' ? '1' : '0'); return redirect('/admin/play'); }
  if (p === '/admin/outbox/retry') { await retryOutbox(db, env, ctx.fetch); return redirect('/admin'); }
  return null;
}
