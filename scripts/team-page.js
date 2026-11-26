// The "team preview" page: what the shared link opens on, so the Creatives Connect team understands what they are looking at before they tap through.
// Plain facts only. Everything here is already decided or already built; anything still being designed says so.
export const OG_TITLE = 'Creatives Connect Afrika 2026: Welcome game (team preview)';
export const OG_DESC = 'Five questions, no right answers. A first look at the CCA 2026 onboarding game, 30 Nov to 3 Dec, Accra. Open it on your phone and tap through.';

export function ogTags(base, page) {
  const u = base.replace(/\/?$/, '/'), img = u + 'static/og-card.png';
  return `<meta property="og:type" content="website"><meta property="og:site_name" content="Creatives Connect Afrika 2026">
<meta property="og:title" content="${OG_TITLE}"><meta property="og:description" content="${OG_DESC}">
<meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Creatives Connect Afrika: Before we begin. Five questions, no right answers.">
<meta property="og:url" content="${u}${page}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${OG_TITLE}"><meta name="twitter:description" content="${OG_DESC}"><meta name="twitter:image" content="${img}">
<meta name="description" content="${OG_DESC}"><meta name="theme-color" content="#111111">`;
}

export function teamPage(base) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${OG_TITLE}</title>
${ogTags(base, 'team.html')}
<link rel="icon" href="static/logos/africa-accent.png">
<style>
@font-face{font-family:"Instrument Serif";font-style:normal;font-weight:400;font-display:swap;src:url(static/fonts/instrument-serif-400.woff2) format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:800;font-style:normal;font-display:swap;src:url(static/fonts/barlow-cond-800.woff2) format("woff2")}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#111;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.band{background:#111;padding:10px 16px}.band img{height:30px;display:block}
.wrap{max-width:640px;margin:0 auto;padding:0 16px 40px}
.hero{display:block;width:min(70vw,300px);height:auto;margin:22px 0 6px}
.tag{font:800 14px/1 "Barlow Condensed",system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7a5a1c;margin:18px 0 6px}
h1{font:800 clamp(38px,11vw,56px)/.95 "Barlow Condensed",system-ui,sans-serif;text-transform:uppercase;margin:0 0 10px}
.lead{font:400 clamp(21px,5.6vw,26px)/1.25 "Instrument Serif",Georgia,serif;margin:0 0 18px}
.go{display:block;background:#d9252b;color:#fff;text-decoration:none;text-align:center;font:700 16px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:18px 14px;margin:0 0 8px}
.small{font-size:13.5px;color:#555;margin:0 0 26px}
h2{font:800 22px/1 "Barlow Condensed",system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin:30px 0 10px}
.box{background:#e2ac4a;padding:14px 16px;margin:0 0 10px}.box b{display:block;font:800 17px/1.1 "Barlow Condensed",system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px}
.box p{margin:0}
.two{display:grid;gap:10px}@media(min-width:560px){.two{grid-template-columns:1fr 1fr}}
.col{border:3px solid #111;padding:12px 14px}.col b{display:block;font:800 16px/1 "Barlow Condensed",system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
ul{margin:6px 0 0;padding-left:18px}li{margin:3px 0}
.foot{margin-top:34px;padding-top:14px;border-top:3px solid #111;font-size:13.5px;color:#555}
</style></head>
<body>
<div class="band"><img src="static/logos/gcg.png" alt="Gold Coast Games"></div>
<div class="wrap">
<img class="hero" src="static/logos/cca-hero.png" alt="Creatives Connect Afrika" width="760" height="594">
<p class="tag">Team preview</p>
<h1>Before we begin</h1>
<p class="lead">A first look at the game delegates play before and during Creatives Connect Afrika: 30 Nov to 3 Dec 2026, Alisa Hotel, Accra.</p>
<a class="go" href="index.html">Open the demo &rarr;</a>
<p class="small">Best on your phone, with the volume up. On the demo page, touch the screen once and the music starts. Nothing you enter is saved or sent.</p>

<h2>How it fits together</h2>
<div class="box"><b>1. Before the event: onboarding</b><p>Delegates pick their country, then answer five hot takes: choose a side, say how strongly they feel, say how far they would take it. Then name, role, what they do, goals and email. They get a personal code. Target: under five minutes.</p></div>
<div class="box"><b>2. At the event: welcome game</b><p>A quick game on phones, played with that code.</p></div>
<div class="box"><b>3. On the main stage</b><p>A separate 10-minute live segment with the room. Still being designed.</p></div>
<div class="box"><b>4. Day 3: the review</b><p>The same five questions asked again, to show how the room moved: then versus now.</p></div>

<h2>What is real, what is sample</h2>
<div class="two">
<div class="col"><b>Real</b><ul><li>The wording of every question</li><li>The layout, order and length</li><li>The sounds and reactions</li></ul></div>
<div class="col"><b>Sample</b><ul><li>Room numbers and scores</li><li>Codes and rankings</li><li>Nothing is stored</li></ul></div>
</div>

<h2>What we need from you</h2>
<ul>
<li>Do the five questions read clearly, and do they feel worth answering?</li>
<li>Is anything too long, too sharp or likely to confuse a delegate?</li>
<li>Do the sounds help or get in the way?</li>
<li>Note the screen where you hesitated, and send it to the team.</li>
</ul>

<p class="foot">The music and voice clips in this preview are temporary and not yet cleared for public use. Please do not share the clips themselves.<br>A Gold Coast Games build for Creatives Connect Afrika.</p>
</div>
</body></html>
`;
}
