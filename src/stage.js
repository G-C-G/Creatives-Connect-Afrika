// Stage views. buildStageData -> plain JSON; renderStageHtml -> a self-contained static page
// (inline CSS/JS, zero network calls). Freeze stores both; the big screen only ever serves the stored HTML.
import { h, str, raw } from './html.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LOGOS, GCG_LOGO } from './content.js';
const SFX = readFileSync(fileURLToPath(new URL('../public/sfx.js', import.meta.url)), 'utf8');
import { loadData, getSetting } from './db.js';
import { participation, takeSplit, takeChange, biggestMover, stillSplit, shareLabel, headline, movedStatements, flipSummary, conferenceStats, byDivisiveness } from './metrics.js';

const pickStories = (data) => {
  const byId = new Map(data.participants.map((p) => [p.id, p]));
  return data.reflections
    .filter((r) => r.story && r.vetted && r.use_in_room && (r.story_anon_ok || r.story_name_ok)) // consent + vetted, always
    .map((r) => {
      const p = byId.get(r.participant_id);
      return { text: r.story, by: r.story_name_ok ? `${p.first_name} ${p.surname}`.trim() : 'Anonymous' };
    });
};

export function buildStageData(db, kind, now = new Date(), { logos = true } = {}) {
  const data = loadData(db);
  const takenAt = now.toISOString();
  const base = { logos };
  if (kind === 'icebreaker') {
    const picks = JSON.parse(getSetting(db, 'icebreaker_takes') || '[]').slice(0, 2);
    return {
      ...base, kind, takenAt, picks,
      takes: picks.map((id) => {
        const tk = data.takes.find((x) => x.id === id); const s = takeSplit(data, id, 'pre');
        return { id, text: tk.text, n: s.n, agree: s.agree, disagree: s.disagree,
          agreeLabel: shareLabel(s.agree, s.n), disagreeLabel: shareLabel(s.disagree, s.n) };
      }),
    };
  }
  if (kind === 'conference') {
    const stats = byDivisiveness(conferenceStats(data));
    return {
      ...base, kind, takenAt, n: participation(data).preCompleters,
      statements: stats.map((x) => ({
        id: x.takeId, text: x.text, n: x.n, agree: x.agree, disagree: x.disagree, agreeLabel: shareLabel(x.agree, x.n), disagreeLabel: shareLabel(x.disagree, x.n),
        micAgree: x.sides.agree.levels.stage, micDisagree: x.sides.disagree.levels.stage, fightAgree: x.sides.agree.fighters, fightDisagree: x.sides.disagree.fighters,
      })),
    };
  }
  const part = participation(data);
  const mover = biggestMover(data), split = stillSplit(data);
  const mode = part.matched > 0 ? 'then_now' : 'final_only';
  return {
    ...base, kind, takenAt, mode, participation: part, moved: movedStatements(data), flips: flipSummary(data),
    headline: mode === 'then_now' ? headline(data) : 'Day 3 results alone: no matched baseline yet.',
    biggestMoverId: mover?.takeId ?? null, stillSplitId: split?.takeId ?? null,
    takes: data.takes.map((tk) => {
      const c = takeChange(data, tk.id), f = takeSplit(data, tk.id, 'final');
      return { id: tk.id, text: tk.text, change: c, final: { n: f.n, agree: f.agree, disagree: f.disagree },
        thenLabel: shareLabel(c.agreePre, c.n), nowLabel: shareLabel(c.agreeFinal, c.n), finalOnlyLabel: shareLabel(f.agree, f.n) };
    }),
    stories: pickStories(data).slice(0, 3),
  };
}

const CSS = `*{box-sizing:border-box}html,body{margin:0;height:100%;background:#111111;color:#FFFFFF;font:800 3vw/1.15 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:none}
.slide{display:none;min-height:100vh;padding:6vh 7vw 14vh;flex-direction:column;justify-content:center}.slide.on{display:flex;animation:in .35s ease-out}
@keyframes in{from{opacity:0;transform:translateY(2vh)}to{opacity:1;transform:none}}
.kick{font-size:1.5vw;letter-spacing:.2em;text-transform:uppercase;color:#F2A81D;margin:0 0 3vh}
.huge{font-size:10.5vw;line-height:.92;letter-spacing:-.02em;text-transform:uppercase;margin:0}
.gold{color:#F2A81D}.big{font-size:12vw;line-height:.95;margin:2vh 0 0;color:#F2A81D}
.mid{font-size:3.6vw;margin:2vh 0}.sub{font-size:1.9vw;font-weight:500;color:#d9d9d9;margin:2vh 0 0;max-width:70vw}
.take{font-size:4.6vw;line-height:1.05;text-transform:uppercase;letter-spacing:-.01em;margin:0 0 4vh}
.pair{display:flex;gap:4vw;margin-top:3vh}.pair>div{flex:1}.pair .lab{font-size:1.5vw;letter-spacing:.2em;text-transform:uppercase;color:#d9d9d9}
.pair .num{font-size:8vw;white-space:nowrap;line-height:1;color:#FFFFFF;margin:1vh 0}.pair .now .num{color:#F2A81D}.pair .sm{font-size:1.8vw;font-weight:500;color:#d9d9d9}
.tag{display:inline-block;background:#D7262E;color:#fff;padding:.1em .6em;border-radius:.3em;font-size:1.3vw;letter-spacing:.1em;margin:0 1vw 2vh 0}
.drumline{display:none;font-size:9vw;color:#F2A81D;line-height:1;margin:3vh 0;animation:blink .5s steps(1) infinite}.drum .drumline{display:block}.drum .pair{display:none}
@keyframes blink{50%{opacity:.25}}
#snd{font:500 1.1vw system-ui,sans-serif;color:#d9d9d9}
.rv{visibility:hidden}.rv.show{visibility:visible;animation:pop .45s cubic-bezier(.2,1.4,.4,1)}
@keyframes pop{from{transform:scale(.9);opacity:0}to{transform:none;opacity:1}}
.quote{font-size:3.1vw;font-weight:700;border-left:.5vw solid #F2A81D;padding-left:2vw;margin:2.4vh 0}.by{font-size:1.7vw;color:#F2A81D;text-transform:uppercase;letter-spacing:.12em;font-weight:800}
.n{font-size:1.4vw;color:#d9d9d9;font-weight:500;margin-top:3vh}
.foot{position:fixed;left:0;right:0;bottom:0;padding:1.6vh 4vw;background:#111111;font:500 1.2vw system-ui,sans-serif;color:#d9d9d9;display:flex;align-items:center;justify-content:space-between;gap:2vw}
.foot .lg{display:flex;gap:1.6vw;align-items:center;visibility:hidden;background:#FFFFFF;padding:.8vh 1.4vw;border-radius:1vh}.edge .foot .lg{visibility:visible}.foot .lg img{height:4.6vh;width:auto}
.foot img.gcg{height:9vh;width:auto;flex:none}
.split{display:flex;gap:3vw;margin:4vh 0}.split div{flex:1;border:.2vw solid #FFFFFF;padding:3vh 2vw;border-radius:1vw}.split b{display:block;font-size:8vw;line-height:1;color:#F2A81D}`;

const JS = `(function(){var s=[].slice.call(document.querySelectorAll('.slide')),i=0,busy=false,calm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var X=window.CCASfx||{tick:function(){},rise:function(){},boom:function(){},toggle:function(){},isOn:function(){return false}};
function lab(){var e=document.getElementById('snd');if(e)e.textContent=X.isOn()?'sound on (M to mute)':'sound off (M)'}
function count(e){var to=+e.getAttribute('data-count'),t0=null;if(calm||!to){e.textContent=to;return}function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1000);e.textContent=Math.round(to*k);if(k<1)requestAnimationFrame(f)}requestAnimationFrame(f)}
function counts(root){[].slice.call(root.querySelectorAll('[data-count]')).forEach(count)}
function show(){s.forEach(function(x,j){x.classList.toggle('on',j===i)});document.body.classList.toggle('edge',i===0||i===s.length-1);X.tick();[].slice.call(s[i].querySelectorAll('[data-count]')).filter(function(e){return!e.closest('.rv')}).forEach(count)}
function reveal(rv){busy=true;var done=function(){rv.classList.add('show');X.boom();counts(rv);busy=false};
if(rv.classList.contains('now')&&!calm){s[i].classList.add('drum');X.rise();setTimeout(function(){s[i].classList.remove('drum');done()},1000)}else done()}
function clock(sl){var secs=+sl.getAttribute('data-timer'),el=sl.querySelector('.clock');function fmt(n){return Math.floor(n/60)+':'+('0'+(n%60)).slice(-2)}el.textContent=fmt(secs);var t=setInterval(function(){secs--;el.textContent=fmt(Math.max(secs,0));if(secs<=0){clearInterval(t);X.boom();el.classList.add('gold')}},1000);X.tick()}
function next(){if(busy)return;if(s[i].hasAttribute('data-timer')&&!s[i].getAttribute('data-ran')){s[i].setAttribute('data-ran','1');clock(s[i]);return}var rv=s[i].querySelector('.rv:not(.show)');if(rv){reveal(rv);return}if(i<s.length-1){i++;show()}}
function prev(){if(busy)return;if(i>0){i--;show()}}
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' '||e.key==='Enter'||e.key==='PageDown')next();else if(e.key==='ArrowLeft'||e.key==='PageUp')prev();else if(e.key==='f'&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();else if(e.key==='m'||e.key==='M'){X.toggle();lab()}});
document.addEventListener('click',next);show();lab()})();`;

const logoUri = (f, type = 'png') => `data:image/${type};base64,${readFileSync(fileURLToPath(new URL(`../public/logos/${f}`, import.meta.url))).toString('base64')}`;
const when = (iso) => iso.replace('T', ' ').slice(0, 16) + ' UTC';
// "40% (12 of 30)" -> big "40%" and a small "(12 of 30)"; "14 of 31" stays whole
const parts = (lab) => { const m = /^(.*?) \((.*)\)$/.exec(lab); return m ? [m[1], `(${m[2]})`] : [lab, '']; };
const signed = (n) => `${n > 0 ? '+' : ''}${n ?? 0}`;

export function renderStageHtml(d) {
  const logos = d.logos ? LOGOS.map((l) => h`<img src="${raw(logoUri(l.file))}" alt="${l.alt}">`) : '';
  const foot = h`<div class="foot"><span class="lg">${logos}</span><span>Snapshot ${when(d.takenAt)} · In partnership with Creatives Connect Afrika · <span id="snd"></span></span><img class="gcg" src="${raw(logoUri(GCG_LOGO.file))}" alt="${GCG_LOGO.alt}"></div>`;
  let slides;
  if (d.kind === 'conference') {
    const open = h`<section class="slide"><p class="kick">The conference game</p><p class="huge">What did the room say?</p>
      <p class="sub">${d.n} delegates answered before the event. Predict first. Then we look.</p></section>`;
    const per = d.statements.map((x, i) => h`<section class="slide"><p class="kick">Statement ${i + 1} of ${d.statements.length}</p><p class="take">${x.text}</p>
      <p class="sub">Cards up: mostly agree, split, or mostly disagree?</p>
      <div class="split rv"><div><b>${x.agree}</b>agreed<br><span class="sub">${x.agreeLabel}</span></div><div><b>${x.disagree}</b>disagreed<br><span class="sub">${x.disagreeLabel}</span></div></div>
      <div class="pair rv"><div><div class="lab">Would take the microphone</div><div class="num">${x.micAgree + x.micDisagree}</div><div class="sm">${x.micAgree} on the agree side · ${x.micDisagree} on the disagree side</div></div>
        <div><div class="lab">Said “I’d fight you on this”</div><div class="num">${x.fightAgree + x.fightDisagree}</div><div class="sm">${x.fightAgree} agree · ${x.fightDisagree} disagree</div></div></div>
      <p class="n">n = ${x.n} pre-event responses, self-selected. Directional only.</p></section>`);
    const opposite = h`<section class="slide"><p class="kick">Find your opposite</p><p class="huge">Who said <span class="gold">Agree</span>?</p>
      <div class="rv"><p class="mid">Stand up. Now find someone who said <span class="gold">Disagree</span>.</p></div></section>`;
    const debate = h`<section class="slide" data-timer="90"><p class="kick">On stage</p><p class="huge">Ninety seconds each.</p><p class="big clock">1:30</p>
      <p class="sub">Agree side first. Press to start the clock.</p></section>`;
    const after = h`<section class="slide"><p class="kick">After the debate</p><p class="huge">Hands up again.<br><span class="gold">Did anyone move?</span></p></section>`;
    slides = [open, ...per, opposite, debate, after];
  } else if (d.kind === 'icebreaker') {
    slides = d.takes.map((tk, i) => h`<section class="slide"><p class="kick">Welcome game · Statement ${i + 1}</p>
      <p class="take">${tk.text}</p><p class="sub">Hands up first. Then we reveal the private split.</p>
      <div class="split rv"><div><b>${tk.agree}</b>agreed<br><span class="sub">${tk.agreeLabel}</span></div><div><b>${tk.disagree}</b>disagreed<br><span class="sub">${tk.disagreeLabel}</span></div></div>
      <p class="n">n = ${tk.n} pre-event responses, self-selected. Directional only.</p></section>`);
    if (!slides.length) slides = [h`<section class="slide"><p class="take">No statements picked yet.</p></section>`];
  } else {
    const p = d.participation, finalOnly = d.mode === 'final_only', total = d.takes.length;
    // reveal order: smallest shift first, biggest mover last
    const ordered = [...d.takes].sort((a, b) => Math.abs(a.change.meanNetChange ?? 0) - Math.abs(b.change.meanNetChange ?? 0) || a.id.localeCompare(b.id));
    const s0 = h`<section class="slide"><p class="kick">Day 3</p><p class="huge">Did we move?</p>
      <div class="rv"><p class="big">${finalOnly ? h`<span data-count="${p.finalResponders}">${p.finalResponders}</span>` : h`<span data-count="${p.matched}">${p.matched}</span> / ${p.preCompleters}`}</p><p class="mid">${finalOnly ? 'responses today.' : 'came back.'}</p></div>
      <p class="n">${p.postOnly ? `${p.postOnly} Day 3 only (reported separately). ` : ''}Self-selected respondents. Directional, not statistical.</p></section>`;
    const m = d.moved;
    const s1 = finalOnly ? '' : h`<section class="slide"><p class="kick">The shift</p>
      <p class="huge">${m.count ? h`The room shifted on <span class="gold"><span data-count="${m.count}">${m.count}</span> of ${m.total}</span>` : 'The room held its ground'}${m.count ? ' statements.' : '.'}</p>
      <p class="sub">${d.flips.matched ? `${d.flips.changedAtLeastOne} of ${d.flips.matched} changed side on at least one statement. ` : ''}Shifted = the average score moved by ${m.threshold} or more (scale -5 to +5), matched people only.</p></section>`;
    const per = ordered.map((tk, i) => h`<section class="slide"><p class="kick">Statement ${i + 1} of ${total}</p>
      <div>${tk.id === d.biggestMoverId ? h`<span class="tag">BIGGEST MOVER</span>` : ''}${tk.id === d.stillSplitId ? h`<span class="tag">STILL SPLIT</span>` : ''}</div>
      <p class="take">${tk.text}</p><div class="drumline">&hellip;</div>
      ${finalOnly
        ? h`<div class="pair"><div class="rv now"><div class="lab">Today</div><div class="num">${parts(tk.finalOnlyLabel)[0]}</div><div class="sm">${parts(tk.finalOnlyLabel)[1]} agreed (n = ${tk.final.n})</div></div></div>`
        : h`<div class="pair"><div class="rv"><div class="lab">Then</div><div class="num">${parts(tk.thenLabel)[0]}</div><div class="sm">${parts(tk.thenLabel)[1]} agreed</div></div>
            <div class="rv now"><div class="lab">Now</div><div class="num">${parts(tk.nowLabel)[0]}</div><div class="sm">${parts(tk.nowLabel)[1]} agreed · average moved ${signed(tk.change.meanNetChange)} · ${tk.change.flips} changed sides</div></div></div>`}
      </section>`);
    const stories = d.stories.length
      ? h`<section class="slide"><p class="kick">Hot stories</p>${d.stories.map((st) => h`<p class="quote">“${st.text}”<br><span class="by">${st.by}</span></p>`)}</section>` : '';
    const close = h`<section class="slide"><p class="kick">That is the room</p><p class="huge">${finalOnly ? 'Day 3 results.' : 'Then. Now. Us.'}</p>
      <p class="sub">${d.headline}</p><p class="n">Report to the organisers within 48 hours.</p></section>`;
    slides = [s0, s1, ...per, stories, close];
  }
  return str(h`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stage · ${d.kind}</title><style>${raw(CSS)}</style></head><body>${slides}${foot}<script>window.CCA_SFX_STAGE=1;${raw(SFX)}</script><script>${raw(JS)}</script></body></html>`);
}
