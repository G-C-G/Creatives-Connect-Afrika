import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { openDb, getTakes, getVerifiedFacts } from './db.js';
import { str } from './html.js';
import * as P from './pages.js';
import * as S from './service.js';
import { queueNumberEmail, sendOutboxRow } from './mail.js';
import { adminRoute } from './admin.js';
import { LOGOS, GCG_LOGO } from './content.js';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const STATIC = { '/static/app.css': ['text/css', 'app.css'], '/static/app.js': ['text/javascript', 'app.js'] };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store' };
const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'";
const CSP_STAGE = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'";

// Fixed-window in-memory limiter. Venue Wi-Fi shares one IP, so limits are generous: they stop floods, not guessing of 1 in 9000.
function limiter(max, windowMs) {
  const hits = new Map();
  return (key, now = Date.now()) => {
    const e = hits.get(key);
    if (!e || now - e.t > windowMs) { hits.set(key, { t: now, n: 1 }); return true; }
    return ++e.n <= max;
  };
}

export function createApp({ db, env = process.env, now = () => new Date(), fetchImpl = fetch } = {}) {
  P.configure({ logos: env.SHOW_PARTNER_LOGOS !== '0' });
  const secret = env.SESSION_SECRET || env.ADMIN_PASSWORD || 'dev-secret';
  const baseUrl = (env.BASE_URL || '').replace(/\/$/, '');
  const csrf = createHmac('sha256', secret).update('admin-csrf').digest('base64url');
  const lookupLimit = limiter(200, 10 * 60_000), writeLimit = limiter(300, 10 * 60_000), adminFail = limiter(20, 10 * 60_000);
  const ctx = { db, env, now, fetch: fetchImpl };

  const ip = (req) => (env.TRUST_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress || '?';

  function adminOk(req) {
    if (!env.ADMIN_PASSWORD) return false; // admin disabled until a password is set
    const m = /^Basic (.+)$/.exec(req.headers.authorization || '');
    if (!m) return false;
    const given = Buffer.from(Buffer.from(m[1], 'base64').toString().split(':').slice(1).join(':'));
    const want = Buffer.from(env.ADMIN_PASSWORD);
    return given.length === want.length && timingSafeEqual(given, want);
  }

  async function readForm(req) {
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > 100_000) throw Object.assign(new Error('too large'), { status: 413 }); chunks.push(c); }
    return new URLSearchParams(Buffer.concat(chunks).toString());
  }

  const wantsJson = (req) => (req.headers.accept || '').includes('application/json');
  const lang = () => 'en';

  async function route(req, url) {
    const p = url.pathname, method = req.method;
    const html = (x, status = 200) => ({ status, type: 'text/html; charset=utf-8', body: str(x) });
    const json = (o, status = 200) => ({ status, type: 'application/json', body: JSON.stringify(o) });
    const redirect = (to) => ({ status: 303, headers: { Location: to }, body: '' });

    if (p === '/healthz') return { status: 200, type: 'text/plain', body: 'ok' };
    const lm = /^\/static\/logos\/([a-z-]+\.(?:png|jpg))$/.exec(p);
    if (lm && (lm[1] === GCG_LOGO.file || LOGOS.some((l) => l.file === lm[1]))) return { status: 200, type: lm[1].endsWith('.jpg') ? 'image/jpeg' : 'image/png', headers: { 'Cache-Control': 'public, max-age=86400' }, body: readFileSync(join(PUBLIC, 'logos', lm[1])) };
    if (STATIC[p]) return { status: 200, type: STATIC[p][0], headers: { 'Cache-Control': 'public, max-age=3600' }, body: readFileSync(join(PUBLIC, STATIC[p][1])) };

    // ---------- admin + stage ----------
    if (p.startsWith('/admin') || p.startsWith('/stage/')) {
      if (!adminOk(req)) {
        if (env.ADMIN_PASSWORD && !adminFail(ip(req))) return { status: 429, type: 'text/plain', body: 'Too many attempts' };
        return { status: env.ADMIN_PASSWORD ? 401 : 403, type: 'text/plain', headers: env.ADMIN_PASSWORD ? { 'WWW-Authenticate': 'Basic realm="CCA admin"' } : {}, body: env.ADMIN_PASSWORD ? 'Authentication required' : 'Admin disabled: set ADMIN_PASSWORD' };
      }
      if (p.startsWith('/stage/')) {
        const kind = p.slice(7);
        if (kind !== 'icebreaker' && kind !== 'final') return null;
        const rows = db.prepare('SELECT html FROM snapshots WHERE kind=? ORDER BY id DESC LIMIT 2').all(kind);
        const row = url.searchParams.get('prev') ? rows[1] : rows[0];
        if (!row) return { status: 404, type: 'text/plain', body: 'No snapshot yet. Freeze one in /admin/snapshots.' };
        return { status: 200, type: 'text/html; charset=utf-8', csp: CSP_STAGE, body: row.html };
      }
      let form = new URLSearchParams();
      if (method === 'POST') {
        form = await readForm(req);
        if (form.get('csrf') !== csrf) return { status: 403, type: 'text/plain', body: 'Bad CSRF token' };
      }
      return (await adminRoute(ctx, req, url, form, csrf)) || null;
    }

    // ---------- participant ----------
    const takes = getTakes(db);
    if (method === 'GET' && p === '/') return html(P.landingPage(lang()));

    if ((p === '/start' || p === '/door') && method === 'GET') {
      const short = p === '/door';
      return html(P.preForm({ takes, facts: getVerifiedFacts(db), short, lang: lang() }));
    }
    if ((p === '/start' || p === '/door') && method === 'POST') {
      if (!writeLimit(ip(req))) return json({ ok: false, message: 'Too many requests. Wait a minute.' }, 429);
      const short = p === '/door', form = await readForm(req);
      const { errors, clean } = S.validatePre(form, { short, takes });
      if (Object.keys(errors).length) {
        return wantsJson(req) ? json({ ok: false, errors }, 422) : html(P.preForm({ takes, facts: getVerifiedFacts(db), S: form, E: errors, short, lang: lang() }), 422);
      }
      const r = S.registerPre(db, clean, { source: short ? 'door' : 'pre_event', env, now: now(), factAnswers: S.factAnswersFrom(form, db) });
      let queued = false;
      if (r.created && r.participant.email) {
        const id = queueNumberEmail(db, r.participant, baseUrl);
        queued = true;
        sendOutboxRow(db, id, env, fetchImpl).catch(() => {}); // fire and forget; failure stays in outbox
      }
      const to = `/done?t=${r.participant.magic_token}${r.existing ? '&existing=1' : ''}`;
      return wantsJson(req) ? json({ ok: true, redirect: to }) : redirect(to);
    }

    if (method === 'GET' && p === '/done') {
      const pt = S.lookupByToken(db, url.searchParams.get('t'));
      if (!pt) return html(P.messagePage('Link not found', 'Please check the link in your email.'), 404);
      const pending = !!pt.email && !!db.prepare("SELECT 1 FROM outbox WHERE participant_id=? AND status='unsent'").get(pt.id);
      return html(P.donePage({ participant: pt, existing: url.searchParams.get('existing') === '1', emailQueued: pending, lang: lang() }));
    }

    // ---------- Day 3 ----------
    if (p.startsWith('/final')) {
      const state = S.finalWindow(db, env, now());
      if (method === 'GET' && p === '/final/done') return html(P.finalDonePage(lang()));
      if (method === 'GET' && p === '/final') {
        if (state !== 'open') return html(P.finalClosedPage(state, lang()));
        const t = url.searchParams.get('t');
        if (t) {
          const pt = S.lookupByToken(db, t);
          if (pt) return html(P.finalForm({ takes, ticket: S.makeTicket(secret, 'm', pt.id, now()), postOnly: false, lang: lang() }));
        }
        return html(P.finalIdentityPage({ lang: lang(), state }));
      }
      if (method === 'POST' && p === '/final/lookup') {
        if (!lookupLimit(ip(req))) return html(P.messagePage('Slow down', 'Too many attempts. Please wait a few minutes.'), 429);
        if (state !== 'open') return html(P.finalClosedPage(state, lang()));
        const form = await readForm(req), fails = Math.min(Number(form.get('fails')) || 0, 9);
        if (form.get('mode') === 'postonly' && fails >= 2) {
          return html(P.finalForm({ takes, ticket: S.makeTicket(secret, 'p', null, now()), postOnly: true, lang: lang() }));
        }
        const pt = S.lookupByNameNumber(db, form.get('first_name') || '', form.get('number') || '');
        if (pt) return html(P.finalForm({ takes, ticket: S.makeTicket(secret, 'm', pt.id, now()), postOnly: false, lang: lang() }));
        return html(P.finalIdentityPage({ fails: fails + 1, error: true, lang: lang() }), 200);
      }
      if (method === 'POST' && p === '/final') {
        if (!writeLimit(ip(req))) return json({ ok: false, message: 'Too many requests.' }, 429);
        const form = await readForm(req);
        if (state !== 'open') return wantsJson(req) ? json({ ok: false, message: 'The Day 3 form is closed.' }, 403) : html(P.finalClosedPage(state, lang()), 403);
        const ticket = S.readTicket(secret, form.get('ticket'), now());
        if (!ticket) return wantsJson(req) ? json({ ok: false, message: 'Your session expired. Re-enter your number.' }, 400) : redirect('/final');
        const { errors, clean } = S.validateFinal(form, { takes, postOnly: ticket.kind === 'p' });
        if (Object.keys(errors).length) {
          return wantsJson(req) ? json({ ok: false, errors }, 422) : html(P.finalForm({ takes, ticket: form.get('ticket'), postOnly: ticket.kind === 'p', S: form, E: errors, lang: lang() }), 422);
        }
        try { S.submitFinal(db, ticket, clean, { env, now: now() }); }
        catch (e) {
          if (e instanceof S.ClosedError) return wantsJson(req) ? json({ ok: false, message: 'The Day 3 form is closed.' }, 403) : html(P.finalClosedPage(e.kind, lang()), 403);
          throw e;
        }
        return wantsJson(req) ? json({ ok: true, redirect: '/final/done' }) : redirect('/final/done');
      }
    }
    return null;
  }

  return async function handler(req, res) {
    try {
      const url = new URL(req.url, 'http://x');
      const r = (await route(req, url)) || { status: 404, type: 'text/html; charset=utf-8', body: str(P.messagePage('Not found', 'That page does not exist.')) };
      res.writeHead(r.status, { 'Content-Type': r.type || 'text/plain', 'Content-Security-Policy': r.csp || CSP, ...SEC, ...(r.headers || {}) });
      res.end(r.body);
    } catch (e) {
      console.error('[error]', e.status || 500, e.message); // message only: never log request bodies or PII
      if (!res.headersSent) res.writeHead(e.status || 500, { 'Content-Type': 'application/json', ...SEC });
      res.end(JSON.stringify({ ok: false, message: e.status === 413 ? 'Too large.' : 'Something went wrong. Please try again.' }));
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const env = process.env;
  if (!env.ADMIN_PASSWORD) console.warn('[warn] ADMIN_PASSWORD not set: /admin and /stage are disabled.');
  const db = openDb(env.DB_PATH || './data/cca.db');
  createServer(createApp({ db, env })).listen(Number(env.PORT) || 3000, () => console.log(`CCA game listening on :${env.PORT || 3000}`));
}
