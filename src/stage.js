// Stage views. buildStageData -> plain JSON; renderStageHtml -> a self-contained static page
// (inline CSS/JS, zero network calls). Freeze stores both; the big screen only ever serves the stored HTML.
import { h, str, raw } from './html.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LOGOS, GCG_LOGO, sidesOf } from './content.js';
const SFX = readFileSync(fileURLToPath(new URL('../public/sfx.js', import.meta.url)), 'utf8');
import { loadData, getSetting } from './db.js';
import { participation, takeSplit, takeChange, biggestMover, stillSplit, shareLabel, headline, movedStatements, flipSummary, conferenceStats, byDivisiveness, roomVerdict } from './metrics.js';

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
        return { id, text: tk.text, n: s.n, agree: s.agree, disagree: s.disagree, verdict: roomVerdict(s.agreeShare),
          agreeLabel: shareLabel(s.agree, s.n), disagreeLabel: shareLabel(s.disagree, s.n), sideA: sidesOf(id)?.agree, sideD: sidesOf(id)?.disagree };
      }),
    };
  }
  if (kind === 'conference') {
    const stats = byDivisiveness(conferenceStats(data));
    return {
      ...base, kind, takenAt, n: participation(data).preCompleters,
      statements: stats.map((x) => ({
        id: x.takeId, sideA: sidesOf(x.takeId)?.agree, sideD: sidesOf(x.takeId)?.disagree, text: x.text, n: x.n, agree: x.agree, disagree: x.disagree, verdict: roomVerdict(x.agreeShare), agreeLabel: shareLabel(x.agree, x.n), disagreeLabel: shareLabel(x.disagree, x.n),
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

const fontUri = (f) => `data:font/woff2;base64,${readFileSync(fileURLToPath(new URL(`../public/fonts/${f}`, import.meta.url))).toString('base64')}`;
const logoUri = (f, type = 'png') => `data:image/${type};base64,${readFileSync(fileURLToPath(new URL(`../public/logos/${f}`, import.meta.url))).toString('base64')}`;
const when = (iso) => iso.replace('T', ' ').slice(0, 16) + ' UTC';
const signed = (n) => `${n > 0 ? '+' : ''}${n ?? 0}`;
// "40% (12 of 30)" -> big "40%" and a small "(12 of 30)"; "14 of 31" stays whole
const parts = (lab) => { const m = /^(.*?) \((.*)\)$/.exec(lab); return m ? [m[1], `(${m[2]})`] : [lab, '']; };

// Imagery made from the data itself: one dot per delegate, computed from counts (anonymous: no per-person data is stored here).
// split: a grey crowd sorts itself into Agree / Disagree. flow: people who changed side cross the room.
const seeded = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function field({ mode, a = 0, d = 0, micA = 0, micD = 0, stayA = 0, a2d = 0, d2a = 0, stayD = 0, label = '' }) {
  const W = 100, H = 22, ZW = 44, ZH = 19.5;
  const capacity = Math.max(mode === 'flow' ? Math.max(stayA + a2d, stayD + d2a, stayA + d2a, stayD + a2d) : Math.max(a, d), 1);
  const cols = Math.max(1, Math.ceil(Math.sqrt(capacity * 1.8))), rows = Math.ceil(capacity / cols);
  const sp = Math.min(ZW / cols, ZH / rows, 5.2), r = sp * 0.38;
  const slot = (cx, k) => ({ x: cx - ((cols - 1) * sp) / 2 + (k % cols) * sp, y: H / 2 - ((rows - 1) * sp) / 2 + Math.floor(k / cols) * sp });
  const dots = [];
  if (mode === 'split') {
    const mk = (n, cx, cls, mic) => {
      for (let k = 0; k < n; k++) {
        const t = slot(cx, k), i = dots.length, ang = seeded(i) * 6.283, rad = Math.sqrt(seeded(i + 500)) * 9.6;
        const x0 = W / 2 + Math.cos(ang) * rad * 3.1, y0 = H / 2 + Math.sin(ang) * rad;
        dots.push({ cls: cls + (k < mic ? ' m' : ''), x0, y0, dx: t.x - x0, dy: t.y - y0 });
      }
    };
    mk(a, 25, 'a', micA); mk(d, 75, 'd', micD);
  } else {
    // stayers keep their slot; leavers swap into the other cluster's free slots
    const put = (cls, k, cx0, cx1, k1) => { const s0 = slot(cx0, k), s1 = k1 == null ? s0 : slot(cx1, k1); dots.push({ cls, x0: s0.x, y0: s0.y, dx: s1.x - s0.x, dy: s1.y - s0.y }); };
    for (let k = 0; k < stayA; k++) put('a-a', k, 25, 25, null);
    for (let k = 0; k < a2d; k++) put('a-d', stayA + k, 25, 75, stayD + k);
    for (let k = 0; k < stayD; k++) put('d-d', k, 75, 75, null);
    for (let k = 0; k < d2a; k++) put('d-a', stayD + k, 75, 25, stayA + k);
  }
  const circles = dots.map((p, i) => `<circle class="${p.cls}" cx="${p.x0.toFixed(2)}" cy="${p.y0.toFixed(2)}" r="${r.toFixed(2)}" style="--dx:${p.dx.toFixed(2)}px;--dy:${p.dy.toFixed(2)}px;--i:${i}"/>`).join('');
  return raw(`<div class="fieldbox"><svg class="field ${mode}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label.replace(/"/g, '')}">${circles}</svg><div class="flab"><span>Agree</span><span>Disagree</span></div></div>`);
}
// shrink long statements instead of letting them overflow
const takeSize = (text) => (text.length <= 70 ? 'lg' : text.length <= 100 ? 'md' : 'sm');

// Stage look = the same scheme as the onboarding and the game: white ground, black serif statements, CCA red, gold only as an accent.
// Black ("night") is kept for the stop moments. One dominant thing per slide. Fonts are embedded, so a downloaded snapshot looks identical offline.
const CSS = () => `@font-face{font-family:"Instrument Serif";font-style:normal;font-weight:400;src:url(${fontUri('instrument-serif-400.woff2')}) format("woff2")}
@font-face{font-family:"Instrument Serif";font-style:italic;font-weight:400;src:url(${fontUri('instrument-serif-400-italic.woff2')}) format("woff2")}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#fff;color:#111;font:400 2vw/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:none}
.slide{display:none;min-height:100vh;padding:4vh 7vw 14vh;flex-direction:column;justify-content:center;background:#fff;color:#111}.slide.on{display:flex;animation:in .5s ease-out}
.slide.night{background:#111;color:#fff}
@keyframes in{from{opacity:0;transform:translateY(2.4vh)}to{opacity:1;transform:none}}
.kick{font:700 1.25vw/1 system-ui,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#B71C25;margin:0 0 2.4vh}.night .kick{color:#F2A81D}
.huge,.take,.num,.quote,.vs span{font-family:"Instrument Serif",Georgia,serif;font-weight:400;letter-spacing:-.015em}
.huge{font-size:12.5vw;line-height:.9;margin:0}.huge.md{font-size:9vw}
.huge em,.take em{font-style:italic;color:#B71C25}.night .huge em{color:#F2A81D}
.take{font-size:6.1vw;line-height:1.03;margin:0 0 2vh;max-width:86vw}.take.lg{font-size:5.2vw}.take.md{font-size:4.4vw}.take.sm{font-size:3.8vw}
.sub{font-size:1.9vw;color:#444;max-width:60vw;margin:2.6vh 0 0}.night .sub{color:#d9d9d9}.n{font-size:1.15vw;color:#6b6b6b;margin-top:3.6vh}.night .n{color:#9a9a9a}
.big{font-family:"Instrument Serif",Georgia,serif;font-size:17vw;line-height:.85;margin:2vh 0 0;color:#D7262E;letter-spacing:-.02em}.big+.sub{margin-top:1vh}
.tag{display:inline-block;background:#D7262E;color:#fff;font:700 1.1vw/1 system-ui,sans-serif;letter-spacing:.14em;padding:.9vh 1.2vw;border-radius:.4vw;margin:0 1vw 1.4vh 0}
.pills{display:flex;gap:1.4vw;margin-top:1vh}.pills span{border:.16vw solid #111;border-radius:99px;padding:1.3vh 2.4vw;font:600 1.9vw/1 system-ui,sans-serif}
.ask{font:italic 400 2.6vw/1.1 "Instrument Serif",Georgia,serif;color:#B71C25;margin:0 0 2vh}
.rv{visibility:hidden}.rv.show{visibility:visible;animation:pop .5s cubic-bezier(.2,1.3,.4,1)}
@keyframes pop{from{transform:translateY(1.6vh);opacity:0}to{transform:none;opacity:1}}
.topcell{display:grid}.topcell>*{grid-area:1/1}.topcell .prompt{align-self:center}.slide.revealed .prompt{visibility:hidden}
.heads{display:flex;width:60vw}.heads>div{flex:1;text-align:center}.heads .num{font-size:6vw;line-height:.9;display:block}.heads .a .num{color:#D7262E}.heads .d .num{color:#111}
.heads .lab{font:700 1.15vw/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#444;display:block;margin-top:.8vh}.heads .cap{font-size:1.25vw;color:#6b6b6b;display:block}
.fieldbox{width:60vw;margin-top:.6vh}.pair+.rv .fieldbox{width:50vw}.field{display:block;width:100%;height:auto;aspect-ratio:100/22}
.flab{display:flex;margin-top:.4vh}.flab span{flex:1;text-align:center;font:700 1.05vw/1 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#555}
.field circle{transition:transform 1.1s cubic-bezier(.2,.8,.2,1),fill .6s,stroke .6s;transition-delay:calc(var(--i)*9ms)}
.field.split circle{fill:#d6d6d6}
.revealed .field.split circle.a{transform:translate(var(--dx),var(--dy));fill:#D7262E}.revealed .field.split circle.d{transform:translate(var(--dx),var(--dy));fill:#111}
.field.split circle.m{stroke-width:.7}.revealed .field.split circle.m{stroke:#F2A81D}
.field.flow circle{stroke:transparent;stroke-width:.7}
.field.flow .a-a,.field.flow .a-d{fill:#D7262E}.field.flow .d-d,.field.flow .d-a{fill:#111}
.moved .field.flow .a-d{fill:#111;transform:translate(var(--dx),var(--dy))}.moved .field.flow .d-a{fill:#D7262E;transform:translate(var(--dx),var(--dy))}.moved .field.flow .a-d,.moved .field.flow .d-a{stroke:#F2A81D}
.legend{margin:.6vh 0 0;font-size:1.2vw;color:#6b6b6b}
.facts{display:flex;gap:4vw;margin-top:1.2vh}.facts p{margin:0;font-size:1.5vw;color:#333}.facts b{font:400 3.2vw/1 "Instrument Serif",Georgia,serif;color:#B71C25;margin-right:.8vw;vertical-align:-.5vh}.facts i{display:block;font-style:normal;font-size:1.3vw;color:#6b6b6b;margin-top:.4vh}
.opp{padding-left:0;padding-right:0;background:linear-gradient(90deg,#F2A81D 50%,#111 50%)}.opp .kick{margin-left:7vw;color:#111}
.vs{position:relative;display:grid;grid-template-columns:1fr 1fr;width:100%;margin:1vh 0 3vh}.vs span{font-size:15vw;line-height:.95;text-align:center}.vs .a{color:#111}.vs .d{color:#fff}
.vs .or{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;color:#111;border-radius:50%;width:7.4vw;height:7.4vw;display:grid;place-items:center;font:italic 400 3.4vw "Instrument Serif",Georgia,serif}
.opp .sub{align-self:center;background:#fff;color:#111;padding:1.4vh 2.4vw;border-radius:99px;max-width:none;margin:0}
.clock{font:800 26vw/.9 system-ui,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:-.03em;margin:1vh 0 0;color:#fff}.clock.low{color:#D7262E}.clock.done{color:#F2A81D}
.pair{display:flex;gap:0;margin-top:1vh}.pair>div{flex:1}.pair .now{border-left:.14vw solid rgba(0,0,0,.22);padding-left:4.5vw}
.pair .lab{font:700 1.25vw/1 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#444}
.pair .num{font-size:6.8vw;line-height:.95;display:block;margin:.8vh 0;color:#111;white-space:nowrap}.pair .now .num{color:#D7262E}.pair .sm{font-size:1.45vw;color:#555;max-width:38vw}
.drumline{display:none;font-family:"Instrument Serif",Georgia,serif;font-size:11vw;color:#D7262E;line-height:1;margin:2vh 0;animation:blink .5s steps(1) infinite}.drum .drumline{display:block}.drum .pair{display:none}
@keyframes blink{50%{opacity:.25}}
.quote{font-size:3.7vw;font-style:italic;line-height:1.12;border-left:.4vw solid #F2A81D;padding-left:2.6vw;margin:2.6vh 0;max-width:78vw}.by{display:block;font:700 1.3vw/1 system-ui,sans-serif;font-style:normal;color:#B71C25;text-transform:uppercase;letter-spacing:.16em;margin-top:1.6vh}
.foot{position:fixed;left:0;right:0;bottom:0;padding:2vh 4vw;display:flex;align-items:center;justify-content:space-between;gap:2vw;font:500 1.05vw/1.2 system-ui,sans-serif;color:#6b6b6b}
.night-on .foot{color:#bdbdbd}.opp-on .foot .mid{visibility:hidden}
.foot .lg{display:flex;gap:1.6vw;align-items:center;visibility:hidden}.edge .foot .lg{visibility:visible}.foot .lg img{height:4.4vh;width:auto;mix-blend-mode:multiply}.night-on .foot .lg{background:#fff;padding:.8vh 1.4vw;border-radius:1vh}
.foot img.gcg{height:8vh;width:auto;flex:none}#snd{color:inherit}
.foot .mid{flex:1;text-align:center}
.round{align-self:flex-start;background:#D7262E;color:#fff;font:800 1.5vw/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;padding:1.1vh 2.2vw 1.1vh 1.6vw;margin:0 0 2.2vh;clip-path:polygon(0 0,100% 0,95% 100%,0 100%)}.round b{font-weight:800}
.slide.on{position:relative}
/* marquee bulbs light up while the drum rolls; the screen flashes at the reveal */
.slide.drum::before,.slide.drum::after{content:"";position:absolute;left:0;right:0;height:2.4vh;background:radial-gradient(circle at 50% 50%,#F2A81D 0 30%,transparent 34%) 0 0/3.2vw 2.4vh repeat-x;animation:chase .45s steps(1) infinite}
.slide.drum::before{top:0}.slide.drum::after{bottom:12vh}
@keyframes chase{50%{background-position:1.6vw 0}}
.slide.drum .take{animation:jolt .12s linear infinite}@keyframes jolt{50%{transform:translateX(.15vw)}}
#flash{position:fixed;inset:0;background:#F2A81D;opacity:0;pointer-events:none;z-index:5}body.flashing #flash{animation:flash .8s ease-out}
@keyframes flash{0%{opacity:.95}100%{opacity:0}}
/* cards-up countdown and the verdict stamp */
.cd{display:none;align-self:center;justify-self:start;z-index:2}.cd.on{display:block}.slide.revealed .cd{display:none}.slide.counting .prompt{visibility:hidden}
.cdn{font:800 11vw/.9 system-ui,sans-serif;color:#D7262E;font-variant-numeric:tabular-nums;display:block;animation:cdpop .8s ease-out}.cdn.go{font:800 6vw/1 system-ui,sans-serif;background:#F2A81D;color:#111;padding:1.4vh 2.4vw;border-radius:1vw;letter-spacing:.04em;text-transform:uppercase}
@keyframes cdpop{from{transform:scale(1.5);opacity:0}to{transform:none;opacity:1}}
.heads{position:relative}.stamp{position:absolute;right:-24vw;top:1vh;border:.4vw solid #D7262E;color:#D7262E;font:800 3.4vw/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;padding:1.4vh 1.8vw;border-radius:.6vw;transform:rotate(-5deg);background:#fff}
.rv.show .stamp{animation:stampin .5s cubic-bezier(.2,1.6,.4,1) .15s both}@keyframes stampin{from{transform:rotate(-5deg) scale(2.2);opacity:0}to{transform:rotate(-5deg) scale(1);opacity:1}}
.delta{display:inline-block;background:#111;color:#fff;font:700 1.3vw/1 system-ui,sans-serif;letter-spacing:.12em;padding:.9vh 1.2vw;border-radius:99px;margin:.6vh 0 1vh}
/* the debate: two podiums, a clock each, a buzzer */
.pods{display:flex;align-items:flex-end;justify-content:center;gap:3vw;margin:2vh 0 1vh}
.pod{width:20vw;height:30vh;display:flex;align-items:flex-start;justify-content:center;font:400 3.8vw/1 "Instrument Serif",Georgia,serif;padding-top:2vh;opacity:.3;transition:opacity .3s,transform .3s}.pod.a{background:#D7262E;color:#fff}.pod.d{background:#fff;color:#111}
.pod.on{opacity:1;transform:translateY(-1.4vh)}.pods .clock{margin:0;font-size:17vw}
.night .sub.who{color:#fff}`;

const JS = `(function(){var s=[].slice.call(document.querySelectorAll('.slide')),i=0,busy=false,calm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var N=function(){};var X=window.CCASfx||{tick:N,rise:N,boom:N,beep:N,drum:N,sting:N,buzzer:N,toggle:N,isOn:function(){return false}};
function lab(){var e=document.getElementById('snd');if(e)e.textContent=X.isOn()?'sound on (M to mute)':'sound off (M)'}
function flash(){var b=document.body;b.classList.remove('flashing');void b.offsetWidth;b.classList.add('flashing');setTimeout(function(){b.classList.remove('flashing')},850)}
function count(e){var to=+e.getAttribute('data-count'),t0=null;if(calm||!to){e.textContent=to;return}function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1000);e.textContent=Math.round(to*k);if(k<1)requestAnimationFrame(f)}requestAnimationFrame(f)}
function countRange(e){var from=+e.getAttribute('data-from'),to=+e.getAttribute('data-to'),suf=e.getAttribute('data-suffix')||'';if(calm||from===to){e.textContent=to+suf;return}var t0=null,last=null;function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1500),v=Math.round(from+(to-from)*k);e.textContent=v+suf;if(v!==last){last=v;X.tick()}if(k<1)requestAnimationFrame(f)}requestAnimationFrame(f)}
function counts(root){[].slice.call(root.querySelectorAll('[data-count]')).forEach(count);[].slice.call(root.querySelectorAll('[data-to]')).forEach(countRange)}
function show(){s.forEach(function(x,j){x.classList.toggle('on',j===i)});var b=document.body;b.classList.toggle('edge',i===0||i===s.length-1);b.classList.toggle('night-on',s[i].classList.contains('night'));b.classList.toggle('opp-on',s[i].classList.contains('opp'));X.tick();[].slice.call(s[i].querySelectorAll('[data-count]')).filter(function(e){return!e.closest('.rv')}).forEach(count)}
function reveal(rv){busy=true;var sl=s[i];sl.classList.add('revealed');var isNow=rv.classList.contains('now');var ms=+(rv.getAttribute('data-drum')||0)||(isNow?1000:0);
var done=function(){sl.classList.remove('drum');rv.classList.add('show');var g=rv.getAttribute('data-group');if(g)[].slice.call(sl.querySelectorAll('.rv[data-group="'+g+'"]')).forEach(function(e){e.classList.add('show')});if(isNow)sl.classList.add('moved');
if(rv.hasAttribute('data-sting')||(isNow&&sl.hasAttribute('data-mover'))){X.sting();flash()}else X.boom();counts(rv);busy=false};
if(ms&&!calm){sl.classList.add('drum');if(isNow)X.rise();else X.drum();setTimeout(done,ms)}else done()}
function countdown(sl){busy=true;sl.setAttribute('data-cd','1');sl.classList.add('counting');var cd=sl.querySelector('.cd'),n=sl.querySelector('.cdn'),k=3;cd.classList.add('on');
function step(){if(k>0){n.className='cdn';void n.offsetWidth;n.textContent=k;n.className='cdn';X.beep(false);k--;setTimeout(step,calm?250:850)}else{n.textContent='Cards up!';n.className='cdn go';X.beep(true);busy=false}}step()}
function fmt(n){return Math.floor(n/60)+':'+('0'+(n%60)).slice(-2)}
function timerPress(sl){var st=+(sl.getAttribute('data-st')||0),el=sl.querySelector('.clock'),who=sl.querySelector('.who'),pa=sl.querySelector('.pod.a'),pd=sl.querySelector('.pod.d'),total=+sl.getAttribute('data-timer');
function stop(){clearInterval(sl._t)}
function run(next){var secs=total;el.textContent=fmt(secs);el.classList.remove('low','done');stop();sl._t=setInterval(function(){secs--;el.textContent=fmt(Math.max(secs,0));if(secs<=10)el.classList.add('low');if(secs<=3&&secs>0)X.tick();if(secs<=0){stop();el.textContent='Time.';el.classList.remove('low');el.classList.add('done');X.buzzer();sl.setAttribute('data-st',String(next))}},1000);X.beep(true)}
function ready(side){el.textContent=fmt(total);el.classList.remove('low','done');pa.classList.toggle('on',side==='a');pd.classList.toggle('on',side==='d');who.textContent=(side==='a'?'Agree':'Disagree')+' side. Press to start the clock.'}
if(st===0){sl.setAttribute('data-st','1');pa.classList.add('on');pd.classList.remove('on');who.textContent='Agree side. Clock running. Press to stop early.';run(2);return true}
if(st===1){stop();sl.setAttribute('data-st','2');ready('d');return true}
if(st===2){sl.setAttribute('data-st','3');pa.classList.remove('on');pd.classList.add('on');who.textContent='Disagree side. Clock running. Press to stop early.';run(4);return true}
if(st===3){stop();sl.setAttribute('data-st','4');el.textContent='Done.';return true}
if(st===4&&!sl.getAttribute('data-end')){sl.setAttribute('data-end','1');ready('d');pa.classList.remove('on');pd.classList.remove('on');who.textContent='Both sides done. Press for the vote.';el.textContent='Done.';return true}
return false}
function next(){if(busy)return;var sl=s[i];if(sl.hasAttribute('data-timer')&&timerPress(sl))return;if(sl.hasAttribute('data-cards')&&!sl.getAttribute('data-cd')){countdown(sl);return}var rv=sl.querySelector('.rv:not(.show)');if(rv){reveal(rv);return}if(i<s.length-1){i++;show()}}
function prev(){if(busy)return;if(i>0){i--;show()}}
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' '||e.key==='Enter'||e.key==='PageDown')next();else if(e.key==='ArrowLeft'||e.key==='PageUp')prev();else if(e.key==='f'&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();else if(e.key==='m'||e.key==='M'){X.toggle();lab()}});
document.addEventListener('click',next);show();lab()})();`;

export function renderStageHtml(d) {
  const logos = d.logos ? LOGOS.map((l) => h`<img src="${raw(logoUri(l.file))}" alt="${l.alt}">`) : '';
  const foot = h`<div class="foot"><span class="lg">${logos}</span><span class="mid">Snapshot ${when(d.takenAt)} · In partnership with Creatives Connect Afrika · <span id="snd"></span></span><img class="gcg" src="${raw(logoUri(GCG_LOGO.file))}" alt="${GCG_LOGO.alt}"></div>`;
  // the split as the hero: two giant numbers and a meter
  const splitBlock = (x) => h`<div class="rv"><div class="split"><div class="a"><span class="num">${x.agree}</span><span class="lab">${x.sideA ?? 'agreed'}</span><span class="cap">${x.agreeLabel}</span></div>
      <div class="d"><span class="num">${x.disagree}</span><span class="lab">${x.sideD ?? 'disagreed'}</span><span class="cap">${x.disagreeLabel}</span></div></div>
      <div class="meter"><i style="width:${x.n ? Math.round((100 * x.agree) / x.n) : 0}%"></i></div></div>`;
  let slides;
  if (d.kind === 'conference') {
    const open = h`<section class="slide"><p class="kick">The conference game</p><p class="huge">What did the room <em>say</em>?</p>
      <p class="sub">${d.n} delegates answered before the event. Predict first. Then we look.</p></section>`;
    const per = d.statements.map((x, i) => h`<section class="slide" data-cards><div class="round"><b>Round ${i + 1}</b> of ${d.statements.length}</div><p class="take ${takeSize(x.text)}">${x.text}</p>
      <div class="topcell"><div class="prompt"><p class="ask">Cards up. What did the room say?</p><div class="pills"><span>${x.sideA ? 'Mostly: ' + x.sideA.toLowerCase() : 'Mostly agree'}</span><span>Split</span><span>${x.sideD ? 'Mostly: ' + x.sideD.toLowerCase() : 'Mostly disagree'}</span></div></div>
        <div class="cd" aria-hidden="true"><span class="cdn"></span></div>
        <div class="heads rv" data-drum="1300" data-sting><div class="a"><span class="num">${x.agree}</span><span class="lab">${x.sideA ?? 'agreed'}</span><span class="cap">${x.agreeLabel}</span></div><div class="d"><span class="num">${x.disagree}</span><span class="lab">${x.sideD ?? 'disagreed'}</span><span class="cap">${x.disagreeLabel}</span></div><div class="stamp">${x.verdict}.</div></div></div>
      ${field({ mode: 'split', a: x.agree, d: x.disagree, micA: x.micAgree, micD: x.micDisagree, label: `${x.agree} ${x.sideA ?? 'agreed'} and ${x.disagree} ${x.sideD ?? 'disagreed'}` })}
      <div class="facts rv"><p><b>${x.micAgree + x.micDisagree}</b>would take the microphone (ringed)<i>${x.micAgree} on the agree side · ${x.micDisagree} on the disagree side</i></p>
        <p><b>${x.fightAgree + x.fightDisagree}</b>said \u201cI\u2019d fight you on this\u201d<i>${x.fightAgree} agree · ${x.fightDisagree} disagree</i></p></div></section>`);
    const opposite = h`<section class="slide opp"><p class="kick">Find your opposite</p><div class="vs"><span class="a">Agree</span><span class="or">or</span><span class="d">Disagree</span></div>
      <p class="sub rv">Stand up if you said one. Now find someone who said the other.</p></section>`;
    const debate = h`<section class="slide night" data-timer="90"><p class="kick">On stage</p><p class="huge md">Ninety seconds each.</p>
      <div class="pods"><div class="pod a on"><span>Agree</span></div><p class="clock">1:30</p><div class="pod d"><span>Disagree</span></div></div>
      <p class="sub who">Agree side first. Press to start the clock.</p></section>`;
    const after = h`<section class="slide night"><p class="kick">After the debate</p><p class="huge">Hands up again.<br><em>Did anyone move?</em></p></section>`;
    slides = [open, ...per, opposite, debate, after];
  } else if (d.kind === 'icebreaker') {
    slides = d.takes.map((tk, i) => h`<section class="slide" data-cards><div class="round"><b>Round ${i + 1}</b> of ${d.takes.length}</div><p class="take ${takeSize(tk.text)}">${tk.text}</p>
      <div class="topcell"><div class="prompt"><p class="ask">Hands up first. Then we reveal the private split.</p></div>
        <div class="cd" aria-hidden="true"><span class="cdn"></span></div>
        <div class="heads rv" data-drum="1300" data-sting><div class="a"><span class="num">${tk.agree}</span><span class="lab">${tk.sideA ?? 'agreed'}</span><span class="cap">${tk.agreeLabel}</span></div><div class="d"><span class="num">${tk.disagree}</span><span class="lab">${tk.sideD ?? 'disagreed'}</span><span class="cap">${tk.disagreeLabel}</span></div><div class="stamp">${tk.verdict}.</div></div></div>
      ${field({ mode: 'split', a: tk.agree, d: tk.disagree, label: `${tk.agree} ${tk.sideA ?? 'agreed'} and ${tk.disagree} ${tk.sideD ?? 'disagreed'}` })}</section>`);
    if (!slides.length) slides = [h`<section class="slide"><p class="take">No statements picked yet.</p></section>`];
  } else {
    const p = d.participation, finalOnly = d.mode === 'final_only', total = d.takes.length;
    // reveal order: smallest shift first, biggest mover last
    const ordered = [...d.takes].sort((a, b) => Math.abs(a.change.meanNetChange ?? 0) - Math.abs(b.change.meanNetChange ?? 0) || a.id.localeCompare(b.id));
    const s0 = h`<section class="slide"><p class="kick">Day 3</p><p class="huge">Did we <em>move</em>?</p>
      <div class="rv"><p class="big">${finalOnly ? h`<span data-count="${p.finalResponders}">${p.finalResponders}</span>` : h`<span data-count="${p.matched}">${p.matched}</span> / ${p.preCompleters}`}</p><p class="sub">${finalOnly ? 'responses today.' : 'came back.'}</p></div>
      <p class="n">${p.postOnly ? `${p.postOnly} Day 3 only (reported separately). ` : ''}Self-selected respondents. Directional, not statistical.</p></section>`;
    const m = d.moved;
    const s1 = finalOnly ? '' : h`<section class="slide"><p class="kick">The shift</p>
      <p class="huge md">${m.count ? h`The room shifted on <em><span data-count="${m.count}">${m.count}</span> of ${m.total}</em> statements.` : 'The room held its ground.'}</p>
      <p class="sub">${d.flips.matched ? `${d.flips.changedAtLeastOne} of ${d.flips.matched} changed side on at least one statement. ` : ''}Shifted = the average score moved by ${m.threshold} or more (scale -5 to +5), matched people only.</p></section>`;
    const flowOf = (c) => ({ stayA: c.agreePre - c.flipsToDisagree, a2d: c.flipsToDisagree, d2a: c.flipsToAgree, stayD: c.n - c.agreePre - c.flipsToAgree });
    const pct = (lab) => { const m = /^(\d+)%/.exec(parts(lab)[0]); return m ? Number(m[1]) : null; };
    const per = ordered.map((tk, i) => h`<section class="slide" ${tk.id === d.biggestMoverId ? 'data-mover' : ''}><div class="round"><b>Round ${i + 1}</b> of ${total}</div>
      <div>${tk.id === d.biggestMoverId ? h`<span class="tag">BIGGEST MOVER</span>` : ''}${tk.id === d.stillSplitId ? h`<span class="tag">STILL SPLIT</span>` : ''}</div>
      <p class="take ${takeSize(tk.text)}">${tk.text}</p><div class="drumline">&hellip;</div>
      ${finalOnly
        ? h`<div class="pair"><div class="rv now"><div class="lab">Today</div><span class="num">${parts(tk.finalOnlyLabel)[0]}</span><div class="sm">${parts(tk.finalOnlyLabel)[1]} agreed (n = ${tk.final.n})</div></div></div>`
        : h`<div class="pair"><div class="rv" data-group="then"><div class="lab">Then</div><span class="num">${parts(tk.thenLabel)[0]}</span><div class="sm">${parts(tk.thenLabel)[1]} agreed</div></div>
            <div class="rv now"><div class="lab">Now</div>${pct(tk.thenLabel) != null && pct(tk.nowLabel) != null
              ? h`<span class="num" data-from="${pct(tk.thenLabel)}" data-to="${pct(tk.nowLabel)}" data-suffix="%">${pct(tk.thenLabel)}%</span><span class="delta">${pct(tk.nowLabel) === pct(tk.thenLabel) ? 'No change' : `${pct(tk.nowLabel) > pct(tk.thenLabel) ? '\u25b2' : '\u25bc'} ${Math.abs(pct(tk.nowLabel) - pct(tk.thenLabel))} pts`}</span>`
              : h`<span class="num">${parts(tk.nowLabel)[0]}</span>`}<div class="sm">${parts(tk.nowLabel)[1]} agreed · average moved ${signed(tk.change.meanNetChange)} · ${tk.change.flips} changed sides</div></div></div>
            <div class="rv" data-group="then">${field({ mode: 'flow', ...flowOf(tk.change), label: `${tk.change.flips} of ${tk.change.n} changed side` })}<p class="legend">Ringed dots changed side.</p></div>`}
      </section>`);
    const stories = d.stories.length
      ? h`<section class="slide"><p class="kick">Hot stories</p>${d.stories.map((st) => h`<p class="quote">“${st.text}”<span class="by">${st.by}</span></p>`)}</section>` : '';
    const close = h`<section class="slide night"><p class="kick">That is the room</p><p class="huge">${finalOnly ? 'Day 3 results.' : h`Then. <em>Now.</em> Us.`}</p>
      <p class="sub">${d.headline}</p><p class="n">Report to the organisers within 48 hours.</p></section>`;
    slides = [s0, s1, ...per, stories, close];
  }
  return str(h`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stage · ${d.kind}</title><style>${raw(CSS())}</style></head><body><div id="flash"></div>${slides}${foot}<script>window.CCA_SFX_STAGE=1;${raw(SFX)}</script><script>${raw(JS)}</script></body></html>`);
}
