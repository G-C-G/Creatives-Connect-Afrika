// Stage views. buildStageData -> plain JSON; renderStageHtml -> a self-contained static page
// (inline CSS/JS, zero network calls). Freeze stores both; the big screen only ever serves the stored HTML.
import { h, str, raw } from './html.js';
import { loadData, getSetting } from './db.js';
import { participation, takeSplit, takeChange, biggestMover, stillSplit, shareLabel, headline } from './metrics.js';

const pickStories = (data) => {
  const byId = new Map(data.participants.map((p) => [p.id, p]));
  return data.reflections
    .filter((r) => r.story && r.vetted && r.use_in_room && (r.story_anon_ok || r.story_name_ok)) // consent + vetted, always
    .map((r) => {
      const p = byId.get(r.participant_id);
      return { text: r.story, by: r.story_name_ok ? `${p.first_name} ${p.surname}`.trim() : 'Anonymous' };
    });
};

export function buildStageData(db, kind, now = new Date()) {
  const data = loadData(db);
  const takenAt = now.toISOString();
  if (kind === 'icebreaker') {
    const picks = JSON.parse(getSetting(db, 'icebreaker_takes') || '[]').slice(0, 2);
    return {
      kind, takenAt, picks,
      takes: picks.map((id) => {
        const tk = data.takes.find((x) => x.id === id); const s = takeSplit(data, id, 'pre');
        return { id, text: tk.text, n: s.n, agree: s.agree, disagree: s.disagree,
          agreeLabel: shareLabel(s.agree, s.n), disagreeLabel: shareLabel(s.disagree, s.n) };
      }),
    };
  }
  const part = participation(data);
  const mover = biggestMover(data), split = stillSplit(data);
  const mode = part.matched > 0 ? 'then_now' : 'final_only';
  return {
    kind, takenAt, mode, participation: part,
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

const CSS = `*{box-sizing:border-box}html,body{margin:0;height:100%;background:#0b0b0b;color:#fff;font:600 3vw/1.25 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:none}
.slide{display:none;min-height:100vh;padding:3vh 6vw 8vh;flex-direction:column;justify-content:center}.slide.on{display:flex}
.kick{color:#f4c84a;font-size:1.7vw;letter-spacing:.12em;text-transform:uppercase;margin:0 0 2vh}
.big{font-size:9vw;line-height:1;margin:0;color:#f4c84a}.mid{font-size:3.6vw;margin:2vh 0}
.take{font-size:3.4vw;margin:0 0 1vh}.row{border-top:.2vw solid #444;padding:1vh 0}.row .take{font-size:2.4vw;margin:0}.sub{font-size:1.7vw;color:#e9e3cf;font-weight:500;margin:.3vh 0}.revealed #prompt{display:none}
.tag{display:inline-block;background:#f4c84a;color:#000;padding:.05em .5em;border-radius:.3em;font-size:1.3vw;margin-right:1vw}
.rv{visibility:hidden}.rv.show{visibility:visible}
.quote{font-size:3.2vw;border-left:.8vw solid #0b6b3a;padding-left:2vw;margin:2vh 0}.by{font-size:2vw;color:#f4c84a}
.n{font-size:1.6vw;color:#bdb6a0;font-weight:500}
.foot{position:fixed;left:0;right:0;bottom:0;padding:1.2vh 6vw;background:#000;font-size:1.4vw;color:#bdb6a0;font-weight:500;display:flex;justify-content:space-between;gap:2vw}
.split{display:flex;gap:3vw;margin:3vh 0}.split div{flex:1;border:.3vw solid #f4c84a;padding:3vh 2vw;border-radius:1vw}.split b{display:block;font-size:6vw;color:#f4c84a}`;

const JS = `(function(){var s=[].slice.call(document.querySelectorAll('.slide')),i=0;function show(){s.forEach(function(x,j){x.classList.toggle('on',j===i)})}
function next(){var rv=s[i].querySelector('.rv:not(.show)');if(rv){rv.classList.add('show');s[i].classList.add('revealed');return}if(i<s.length-1){i++;show()}}
function prev(){if(i>0){i--;show()}}
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' '||e.key==='Enter'||e.key==='PageDown')next();else if(e.key==='ArrowLeft'||e.key==='PageUp')prev();else if(e.key==='f'&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen()});
document.addEventListener('click',next);show()})();`;

const when = (iso) => iso.replace('T', ' ').slice(0, 16) + ' UTC';

export function renderStageHtml(d) {
  const foot = h`<div class="foot"><span>Snapshot taken ${when(d.takenAt)}</span><span>Gold Coast Games · In partnership with Creatives Connect Afrika</span></div>`;
  let slides;
  if (d.kind === 'icebreaker') {
    slides = d.takes.map((tk, i) => h`<section class="slide"><p class="kick">Welcome game · Statement ${i + 1}</p>
      <p class="take" style="font-size:4.4vw">${tk.text}</p>
      <p class="mid">Hands up first. Then we reveal the private split.</p>
      <div class="split rv"><div><b>${tk.agree}</b>agreed (${tk.agreeLabel})</div><div><b>${tk.disagree}</b>disagreed (${tk.disagreeLabel})</div></div>
      <p class="n">n = ${tk.n} pre-event responses, self-selected. Directional only.</p></section>`);
    if (!slides.length) slides = [h`<section class="slide"><p class="take">No statements picked yet.</p></section>`];
  } else {
    const p = d.participation, finalOnly = d.mode === 'final_only';
    const s1 = h`<section class="slide"><p class="kick">Day 3</p>
      ${finalOnly ? h`<p class="big">${p.finalResponders}</p><p class="mid">responses today</p>` : h`<p class="big">${p.matched} of ${p.preCompleters}</p><p class="mid">came back</p>`}
      <p class="mid" style="font-size:2.8vw">${d.headline}</p>
      <p class="n">${p.postOnly ? `${p.postOnly} Day 3 only (reported separately). ` : ''}Self-selected respondents. Directional, not statistical.</p></section>`;
    const rows = d.takes.map((tk) => h`<div class="row">
      ${tk.id === d.biggestMoverId ? h`<span class="tag">BIGGEST MOVER</span>` : ''}${tk.id === d.stillSplitId ? h`<span class="tag">STILL SPLIT</span>` : ''}
      <p class="take">${tk.text}</p>
      ${finalOnly ? h`<p class="sub">Today: ${tk.finalOnlyLabel} agreed (n=${tk.final.n})</p>`
        : h`<p class="sub">Agreed then ${tk.thenLabel} &rarr; now ${tk.nowLabel} · mean change ${tk.change.meanNetChange > 0 ? '+' : ''}${tk.change.meanNetChange ?? 0} · ${tk.change.flips} flipped</p>`}</div>`);
    const s2 = h`<section class="slide"><p class="kick">${finalOnly ? 'Day 3 results' : 'Then vs now'}</p>
      <p class="mid rv show" id="prompt">Which statement moved most? Cards up.</p>
      <div class="rv">${rows}</div></section>`;
    const s3 = d.stories.length
      ? h`<section class="slide"><p class="kick">Hot stories</p>${d.stories.map((st) => h`<p class="quote">“${st.text}”<br><span class="by">${st.by}</span></p>`)}</section>`
      : h`<section class="slide"><p class="kick">Thank you</p><p class="mid">One headline. Report to organisers within 48 hours.</p></section>`;
    slides = [s1, s2, s3];
  }
  return str(h`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stage · ${d.kind}</title><style>${raw(CSS)}</style></head><body>${slides}${foot}<script>${raw(JS)}</script></body></html>`);
}
