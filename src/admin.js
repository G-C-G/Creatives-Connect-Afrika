import { h, raw, str } from './html.js';
import { layout } from './pages.js';
import { loadData, getSetting, setSetting, lockTakes } from './db.js';
import { SECTORS } from './content.js';
import { timings } from './service.js';
import { retryOutbox } from './mail.js';
import { privateCsv, aggregateCsv } from './exports.js';
import { buildStageData, renderStageHtml } from './stage.js';
import * as M from './metrics.js';

const sectorLabel = (id) => SECTORS.find((s) => s.id === id)?.en ?? id;
const fmt = (v) => (v == null ? '–' : v);
const dtLocal = (iso) => (iso ? iso.slice(0, 16) : '');
const toIso = (v) => (v && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) ? `${v.slice(0, 16)}:00Z` : null); // Accra = UTC

function page(title, body, csrf) {
  return layout({ title: `Admin: ${title}`, main: 'admin', body: h`
  <nav><a href="/admin">Dashboard</a><a href="/admin/icebreaker">Icebreaker</a><a href="/admin/final">Final game</a><a href="/admin/stories">Stories</a>
  <a href="/admin/volunteers">Volunteers</a><a href="/admin/lookup">Desk lookup</a><a href="/admin/snapshots">Snapshots</a><a href="/admin/report">Report</a></nav>
  <h1>${title}</h1>${body}` });
}
const csrfField = (csrf) => h`<input type="hidden" name="csrf" value="${csrf}">`;
const postBtn = (action, csrf, label, fields = {}, cls = 'btn') => h`<form method="post" action="${action}" style="display:inline">${csrfField(csrf)}
  ${Object.entries(fields).map(([k, v]) => h`<input type="hidden" name="${k}" value="${v}">`)}<button class="${cls}" type="submit">${label}</button></form>`;

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
    return h`<tr><td><b>${t.id}</b> ${t.text}</td><td>${s.n}</td><td>${s.agree}</td><td>${s.disagree}</td><td>${fmt(s.meanStrength)}</td><td>${s.sayAloud} / ${s.speakOnStage}</td>
    <td>${c.n ? `${c.agreePre} → ${c.agreeFinal} (n=${c.n})` : '–'}</td><td>${fmt(c.meanNetChange)}</td><td>${c.n ? c.flips : '–'}</td></tr>`; })}</table>`;
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
  <h2>Per take</h2>${takeTable(d)}
  <h2>Settings (times are UTC = Accra time)</h2>
  <form method="post" action="/admin/settings">${csrfField(csrf)}
   <div class="field"><label>Event starts (pre-event edits stop)<input type="datetime-local" name="event_starts_at" value="${dtLocal(tm.eventStartsAt)}"></label></div>
   <div class="field"><label>Day 3 form opens<input type="datetime-local" name="final_opens_at" value="${dtLocal(tm.finalOpensAt)}"></label></div>
   <div class="field"><label>Day 3 form closes (1h before the final slot)<input type="datetime-local" name="final_closes_at" value="${dtLocal(tm.finalClosesAt)}"></label></div>
   <button class="btn" type="submit">Save</button></form>
  <h2>Takes</h2><p>${locked ? 'All takes are LOCKED.' : 'Not locked.'} ${locked ? '' : postBtn('/admin/lock-takes', csrf, 'Lock take wording now', {}, 'btn ghost')}</p>
  <h2>Hot facts</h2><p class="hint">Only verified facts are ever shown to anyone. Verify against the source first.</p>
  <table>${facts.map((f) => h`<tr><td><b>${f.id}</b> ${f.text}<br><span class="hint">${f.reveal_text}</span></td><td>${f.verified ? 'VERIFIED' : 'unverified'}</td>
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
  return page('Final game view', h`<p class="hint">${M.headline(d)}</p>${participationTable(part)}${takeTable(d)}
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
  ${['icebreaker', 'final'].map((k) => h`<h2>${k}</h2>${postBtn('/admin/snapshot', csrf, `Freeze ${k} snapshot now`, { kind: k })}
   <p><a href="/stage/${k}">Open big screen (latest)</a> · <a href="/stage/${k}?prev=1">Open previous (fallback)</a></p>
   <table>${kindRows(k).map((r, i) => h`<tr><td>#${r.id}</td><td>${r.taken_at}</td><td>${i === 0 ? 'LATEST' : i === 1 ? 'PREVIOUS' : ''}</td><td><a href="/admin/snapshot/${r.id}.html">download .html</a> · <a href="/admin/snapshot/${r.id}.json">.json</a></td></tr>`)}</table>`)}`, csrf);
}

function report(ctx) {
  const d = loadData(ctx.db), part = M.participation(d), mover = M.biggestMover(d);
  const quotes = d.reflections.filter((r) => r.story && r.story_anon_ok && r.vetted).slice(0, 3);
  const segs = (key) => mover ? M.segmentTable(d, key, mover.takeId) : [];
  return page('One-page report (print me)', h`<style>@media print{nav,.band,footer{display:none}}</style>
  <p><b>Creatives Connect Afrika 2026: hot takes, measured shift across the event.</b> Prepared by Gold Coast Games.</p>
  <h2>Participation</h2>${participationTable(part)}
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
    if (p === '/admin/stories') return html(stories(ctx, csrf, url));
    if (p === '/admin/volunteers') return html(volunteers(ctx));
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
    const kind = form.get('kind'); if (kind !== 'icebreaker' && kind !== 'final') return { status: 400, type: 'text/plain', body: 'bad kind' };
    const data = buildStageData(db, kind, now);
    db.prepare('INSERT INTO snapshots(kind,taken_at,data_json,html) VALUES (?,?,?,?)').run(kind, data.takenAt, JSON.stringify(data), renderStageHtml(data));
    setSetting(db, `snapshot_${kind}_taken_at`, data.takenAt);
    return redirect('/admin/snapshots');
  }
  if (p === '/admin/outbox/retry') { await retryOutbox(db, env, ctx.fetch); return redirect('/admin'); }
  return null;
}
