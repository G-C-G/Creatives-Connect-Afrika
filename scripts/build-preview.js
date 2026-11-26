// Builds a self-contained PREVIEW of the onboarding + welcome game: static pages and a tiny in-browser stand-in for the server.
// Nothing is saved or sent. Sample room data. Usage: node scripts/build-preview.js <outDir>
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, setSetting } from '../src/db.js';
import { createApp } from '../src/server.js';
import { registerPre } from '../src/service.js';
import { freezeDeck } from '../src/play.js';
import { suggestIcebreaker } from '../src/metrics.js';
import { loadData } from '../src/db.js';
import { COUNTRIES, ROLES, SECTORS } from '../src/content.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
if (!out) { console.error('Usage: node scripts/build-preview.js <outDir>'); process.exit(1); }
rmSync(out, { recursive: true, force: true }); mkdirSync(join(out, 'static', 'fonts'), { recursive: true }); mkdirSync(join(out, 'static', 'logos'), { recursive: true });

// ---- sample room: 60 made-up delegates (deterministic), facts marked verified FOR THE PREVIEW ONLY ----
const db = openDb(':memory:');
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pick = (a) => a[Math.floor(rnd() * a.length)];
const takes = db.prepare('SELECT id FROM takes').all();
for (let i = 0; i < 60; i++) {
  registerPre(db, { first_name: `Sample${i}`, surname: 'Delegate', email: null, country: pick(COUNTRIES.slice(0, 54)), sector: pick(SECTORS).id, role: pick(ROLES).id, project: null, goal: null, values: [], contact_opt_in: false, consent_aggregate: true,
    answers: takes.map((t) => ({ take_id: t.id, stance: rnd() < 0.5 ? 'agree' : 'disagree', strength: 1 + Math.floor(rnd() * 5), say_aloud: rnd() < 0.6, speak_on_stage: rnd() < 0.25 })) },
    { source: 'pre_event', env: { EVENT_STARTS_AT: '2099-01-01T00:00:00Z' } });
}
// only the welcome-game facts are shown in the preview; the Armstrong and AfCFTA cards (onboarding interludes) stay hidden: the AfCFTA wording must be cleared first
db.prepare("UPDATE facts SET verified = 1 WHERE id IN ('F2','F4','F5','F6','F7','F8','F9')").run();
const sg = suggestIcebreaker(loadData(db));
setSetting(db, 'icebreaker_takes', JSON.stringify([...new Set([sg.mostEven, sg.highestStrength, 'T3', 'T1'])].slice(0, 2)));
freezeDeck(db); setSetting(db, 'play_open', '1');
const dummy = registerPre(db, { first_name: 'You', surname: 'Preview', email: null, country: 'Ghana', sector: 'gaming', role: 'independent', project: null, goal: null, values: [], contact_opt_in: false, consent_aggregate: true,
  answers: takes.map((t) => ({ take_id: t.id, stance: 'agree', strength: 3, say_aloud: true, speak_on_stage: false })) }, { source: 'pre_event', env: { EVENT_STARTS_AT: '2099-01-01T00:00:00Z' } }).participant;

const env = { ADMIN_PASSWORD: 'x', SESSION_SECRET: 'x', BASE_URL: '', SHOW_PARTNER_LOGOS: '1', EVENT_STARTS_AT: '2026-11-30T08:00:00Z' };
const srv = createServer(createApp({ db, env, now: () => new Date('2026-11-25T12:00:00Z') }));
await new Promise((r) => srv.listen(0, r));
const base = `http://127.0.0.1:${srv.address().port}`;
const get = async (p) => (await fetch(base + p)).text();

// ---- rewrite server paths to relative file paths ----
const rel = (html) => html
  .replaceAll('href="/static/', 'href="static/').replaceAll('src="/static/', 'src="static/').replaceAll('data-theme="/static/', 'data-theme="static/').replaceAll('data-audio="/static/', 'data-audio="static/').replaceAll('data-fx="/static/', 'data-fx="static/')
  .replace('href="/start"', 'href="start.html"').replace('data-deck="/play/deck.json"', 'data-deck="deck.json"').replace('data-join="/door"', 'data-join="start.html"')
  .replace(/<script src="static\/sfx\.js" defer>/, '<script src="static/mock.js" defer></script><script src="static/sfx.js" defer>');

const page = async (path, name, patch = (x) => x) => writeFileSync(join(out, name), patch(rel(await get(path))));
await page('/start', 'start.html'); await page('/play', 'play.html');
await page(`/done?t=${dummy.magic_token}`, 'done.html', (x) => x.replace(/(<div class="cl c6 codecard">[\s\S]*?<p class="bignum"[^>]*>)\d{4}(<\/p>)/, '$1<span data-code>----</span>$2'));

// landing = the artifact's main page: a fragment (the host adds the document skeleton)
{
  const html = rel(await get('/'));
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1], body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
  const links = [...head.matchAll(/<link[^>]*>|<script[^>]*><\/script>/g)].map((m) => m[0]).join('\n');
  writeFileSync(join(out, 'index.html'), `<title>CCA Game Preview</title>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n${links}\n${body}\n`);
}
writeFileSync(join(out, 'deck.json'), await get('/play/deck.json'));
srv.close();

// ---- static assets ----
let css = readFileSync(join(ROOT, 'public/app.css'), 'utf8').replaceAll('url(/static/fonts/', 'url(fonts/');
writeFileSync(join(out, 'static/app.css'), '@charset "utf-8";\n' + css);
// static hosts may serve scripts without a charset: escape every non-ASCII character so nothing can be mis-decoded
const ascii = (t) => t.replace(/[\u0080-\uffff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
for (const f of ['app.js', 'play.js', 'sfx.js']) writeFileSync(join(out, 'static', f), ascii(readFileSync(join(ROOT, 'public', f), 'utf8')));
for (const f of ['instrument-serif-400.woff2', 'instrument-serif-400-italic.woff2', 'barlow-cond-800.woff2', 'barlow-cond-ext-800.woff2']) copyFileSync(join(ROOT, 'public/fonts', f), join(out, 'static/fonts', f));
for (const f of ['gcg.png', 'cca-hero.png', 'creatives-connect-afrika.png', 'africa-accent.png', 'ghana-arms.png', 'black-star.png', 'africa-tourism-partners.png', 'afcfta.png']) copyFileSync(join(ROOT, 'public/logos', f), join(out, 'static/logos', f));
// a plain page to LISTEN to every sound on its own (and to check the phone is not on silent)
const names = [['tick', 'Tick (kalimba)'], ['lock', 'Lock-in (agogo + drum)'], ['rise', 'Countdown (shekere)'], ['cliff', 'Ending, start'], ['boom', 'Ending, big hit'], ['chime', 'Right answer'], ['miss', 'Wrong answer (talking drum)'], ['drum', 'Drum roll'], ['sting', 'Nollywood-style stinger'], ['pluck', 'Highlife-style pluck'], ['cassette', 'Cassette'], ['static', 'Old TV static'], ['beep', 'Beep'], ['buzzer', 'Buzzer']];
writeFileSync(join(out, 'sounds.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sound test</title><link rel="stylesheet" href="static/app.css"><script src="static/sfx.js" defer></script></head><body><main class="narrow"><p class="kicker">Sound test</p><h2 class="ask">Tap each one</h2>
<p class="hint">Nothing here is a recording: all original, made in your browser. If you hear nothing: turn the volume up, switch the phone's ringer to ring (not silent), and tap again. Tell me which ones feel wrong.</p>
<div style="display:grid;gap:10px;margin-top:18px">${names.map(([k, l]) => `<button class="btn ghost" type="button" data-s="${k}">${l}</button>`).join('')}</div>
<p style="margin-top:22px"><a href="index.html">Back to the preview</a></p></main>
<script>document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-s]');if(!b)return;var S=window.CCASfx;if(!S)return;if(!S.isOn())S.set(true);S[b.getAttribute('data-s')]();});</script></body></html>`);
writeFileSync(join(out, 'static/mock.js'), ascii(readFileSync(join(ROOT, 'scripts/preview-mock.js'), 'utf8')));
console.log('preview built in', out);
