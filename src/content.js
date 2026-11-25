// SEED / CONFIG. Content lives here, not in components.
// Take text becomes immutable once locked in the DB (see db.js seedContent).

export const EVENT = {
  name: 'Creatives Connect Afrika 2026',
  startsAtDefault: '2026-11-30T08:00:00Z',
};

const opt = (id, en, fr) => ({ id, en, ...(fr ? { fr } : {}) });

export const SECTORS = [
  opt('music', 'Music'), opt('film', 'Film'), opt('fashion', 'Fashion'),
  opt('visual_art', 'Visual art'), opt('gaming', 'Gaming'),
  opt('tourism', 'Tourism / hospitality'), opt('policy', 'Policy / government'),
  opt('finance', 'Finance / investment'), opt('tech', 'Tech'), opt('other', 'Other'),
];

export const GOALS = [
  opt('funding', 'Funding'), opt('partners', 'Partners'), opt('audience', 'Audience'),
  opt('market', 'Market access'), opt('knowledge', 'Knowledge'), opt('visibility', 'Visibility'),
];

// ASSUMPTION: the spec says "pick 3 values" without a list. Edit freely before launch.
export const VALUES = [
  opt('community', 'Community'), opt('craft', 'Craft'), opt('heritage', 'Heritage'),
  opt('ownership', 'Ownership'), opt('integrity', 'Integrity'), opt('freedom', 'Freedom'),
  opt('innovation', 'Innovation'), opt('joy', 'Joy'), opt('justice', 'Justice'),
  opt('collaboration', 'Collaboration'), opt('faith', 'Faith'), opt('legacy', 'Legacy'),
];

// Regions follow the five African Union regions (ASSUMPTION: good enough for segmenting).
const REGION_MAP = {
  North: ['Algeria', 'Egypt', 'Libya', 'Mauritania', 'Morocco', 'Tunisia'],
  East: ['Comoros', 'Djibouti', 'Eritrea', 'Ethiopia', 'Kenya', 'Madagascar', 'Mauritius', 'Rwanda',
    'Seychelles', 'Somalia', 'South Sudan', 'Sudan', 'Tanzania', 'Uganda'],
  Central: ['Burundi', 'Cameroon', 'Central African Republic', 'Chad', 'Congo (Republic)', 'DR Congo',
    'Equatorial Guinea', 'Gabon', 'São Tomé and Príncipe'],
  Southern: ['Angola', 'Botswana', 'Eswatini', 'Lesotho', 'Malawi', 'Mozambique', 'Namibia',
    'South Africa', 'Zambia', 'Zimbabwe'],
  West: ['Benin', 'Burkina Faso', 'Cabo Verde', "Côte d'Ivoire", 'Gambia', 'Ghana', 'Guinea',
    'Guinea-Bissau', 'Liberia', 'Mali', 'Niger', 'Nigeria', 'Senegal', 'Sierra Leone', 'Togo'],
};
export const OUTSIDE_AFRICA = 'Outside Africa (diaspora / other)';
export const COUNTRIES = [
  ...Object.values(REGION_MAP).flat().sort((a, b) => a.localeCompare(b)),
  OUTSIDE_AFRICA,
];
export function regionOf(country) {
  for (const [r, list] of Object.entries(REGION_MAP)) if (list.includes(country)) return r;
  return country === OUTSIDE_AFRICA ? 'Outside Africa' : 'Unknown';
}

// LOCKED once launched. Never reword after locked = 1. theme_tag: TBD per spec.
export const TAKES = [
  { id: 'T1', position: 1, theme_tag: null, text: 'The biggest winners of African festivals are hotels and airlines, not artists.' },
  { id: 'T2', position: 2, theme_tag: null, text: 'Africa has enough talent. What it lacks is money and distribution.' },
  { id: 'T3', position: 3, theme_tag: null, text: 'African creatives should give up equity to get funded.' },
  { id: 'T4', position: 4, theme_tag: null, text: 'A viral song markets a destination better than any tourism ad.' },
  { id: 'T5', position: 5, theme_tag: null, text: 'Gaming will do more for African tourism than music in the next 10 years.' },
];

// ALL verified:false until Hinda confirms (flip in /admin). Unverified facts are never shown anywhere.
// Changing text or reveal_text here resets verified to false on next start.
export const FACTS = [
  {
    id: 'F1', position: 1, kind: 'info', answer_bool: null, verified: false, source_url: '',
    verify: 'Sources disagree between 1956 and 1957. The 13 bands and the Creole recognition need a source.',
    text: 'In 1956, Louis Armstrong arrived in Accra and was greeted by 13 bands playing E.T. Mensah\u2019s \u201cAll for You\u201d, with Armstrong\u2019s name sung into it.',
    reveal_text: 'He reportedly recognised it as a Creole song from New Orleans.',
  },
  {
    id: 'F2', position: 2, kind: 'info', answer_bool: null, verified: false, source_url: '',
    verify: 'I could not open any article (403) and found no primary source (Billboard Boxscore, venue or promoter). The figure is repeated by several outlets and attributed to the tracker Touring Data. Please check it before ticking verified. I removed the "highest single-night gross by an African act" claim from the game copy: widely repeated, but unconfirmed here and possibly overtaken since.',
    text: 'Burna Boy\u2019s London Stadium show on 29 June 2024 reportedly grossed about US$6.1 million from 58,973 tickets, according to concert-tracking data.',
    reveal_text: 'That is a press-reported tracking figure, not an official box-office statement.',
    sources: [
      { name: 'Vanguard, "How Burna Boy cashed out at London Stadium" (Jul 2024)', url: 'https://www.vanguardngr.com/2024/07/how-burna-boy-cashed-out-at-london-stadium/amp/', date: 'Jul 2024', passage: '(not opened: HTTP 403 to my fetch)', note: 'Search results say outlets report $6,147,209 from 58,973 tickets, credited to Touring Data.' },
      { name: 'NME, "Burna Boy made $12million from eight shows"', url: 'https://www.nme.com/news/music/burna-boy-made-12million-from-eight-shows-3591308', date: '2024', passage: '(not opened: HTTP 403 to my fetch)', note: 'Secondary report. A primary source (Billboard Boxscore or the promoter) would be better.' },
    ],
  },

  {
    id: 'F3', position: 3, kind: 'true_false', answer_bool: true, verified: false, source_url: '',
    verify: 'Wording must be checked with the AfCFTA Secretariat. Annexes adopted Feb 2025, ratification incomplete, "preferential treatment" undefined. Never promise a benefit.',
    text: 'True or false: under the AfCFTA digital trade framework, African content from African-owned enterprises and platforms is eligible for preferential treatment.',
    reveal_text: 'True. The annexes were adopted in February 2025 and ratification is incomplete. This is not a promise of any benefit.',
  },
  // ---- Welcome-game bank (sourced 25 Nov 2026). All start unverified: Hinda confirms in /admin. See docs/QUESTION_BANK.md. ----
  {
    id: 'F4', position: 4, kind: 'info', answer_bool: null, verified: false, source_url: 'https://unctad.org/news/creative-economy-booms-services-leading-growth',
    verify: 'I could NOT open UNCTAD\u2019s page (timed out twice), so this rests on search results only. Please open the source and confirm $1.4 trillion, +29% and 19% before ticking verified. UNCTADstat now shows a newer 2024 figure, so the question says 2022 explicitly.',
    text: 'In 2022, creative services exports reached US$1.4 trillion, up 29% from 2017, and made up 19% of all global services exports.',
    reveal_text: 'Source: UNCTAD, Creative Economy Outlook 2024.',
    sources: [{ name: 'UNCTAD, Creative Economy Outlook 2024 (news page)', url: 'https://unctad.org/news/creative-economy-booms-services-leading-growth', date: '2024', passage: '(page NOT opened: my fetch timed out twice) Search results describing this page say: creative services exports of $1.4 trillion in 2022, a 29% rise since 2017, and 19% of global service exports. That is a search summary, not a verbatim quote.', note: 'Newer UNCTADstat data shows a higher 2024 figure; always say "in 2022".' }],
  },
  {
    id: 'F5', position: 5, kind: 'info', answer_bool: null, verified: false, source_url: 'https://news.un.org/en/story/2021/10/1102232',
    verify: 'Confirmed through UN News only. UNESCO’s own report page returned 403 to my fetch, so open it yourself if you can. The figures are from 2021.',
    text: 'UNESCO’s 2021 mapping of Africa’s film and audiovisual industries found that it employs some five million people and accounts for US$5 billion in GDP.',
    reveal_text: 'UNESCO estimated it could create over 20 million jobs and add US$20 billion to the continent’s GDP.',
    sources: [
      { name: 'UN News, "Landmark report highlights untapped potential of Africa’s film industry"', url: 'https://news.un.org/en/story/2021/10/1102232', date: '5 Oct 2021', passage: 'the first-ever mapping of the sector, which currently employs some five million people and accounts for $5 billion in GDP across Africa.', note: 'Secondary (UN News citing UNESCO).' },
      { name: 'UNESCO, The African Film Industry: Trends, Challenges and Opportunities for Growth (2021)', url: 'https://unesdoc.unesco.org/ark:/48223/pf0000379165', date: 'Oct 2021', passage: '(not opened: HTTP 403 to my fetch)', note: 'Primary document. Please check the figures here.' },
    ],
  },
  {
    id: 'F6', position: 6, kind: 'info', answer_bool: null, verified: false, source_url: 'https://www.ifpi.org/global-music-report-2026-global-recorded-music-revenues-grow-6-4-as-record-companies-drive-innovation/',
    verify: 'Checked against IFPI’s release. Do NOT say the region ranked second-fastest: IFPI’s page does not state a rank for Sub-Saharan Africa.',
    text: 'Sub-Saharan Africa’s recorded music revenue grew 15.2% in 2025 and reached US$120 million, according to IFPI’s Global Music Report 2026.',
    reveal_text: 'South Africa is the region’s largest market, with 78.1% of its revenues.',
    sources: [{ name: 'IFPI, Global Music Report 2026 (release)', url: 'https://www.ifpi.org/global-music-report-2026-global-recorded-music-revenues-grow-6-4-as-record-companies-drive-innovation/', date: '18 Mar 2026', passage: 'Sub-Saharan Africa saw recorded music revenue growth of 15.2% and these revenues reached US$120 million.', note: 'Also: "South Africa remained the largest market in the region and accounted for 78.1% of the region’s revenues". No rank for the region is stated.' }],
  },
  {
    id: 'F7', position: 7, kind: 'info', answer_bool: null, verified: false, source_url: 'https://prnewswire.com/news-releases/umg-announces-majority-investment-in-iconic-afrobeats-label-mavin-global-accelerating-expansion-of-africas-outstanding-creative-platform-302071077.html',
    verify: 'Wording is "announced a majority investment": the release says the deal was subject to regulatory approval and I could not confirm it closed, so never say "bought" or "acquired". No valuation is given by UMG: leave valuations out.',
    text: 'In February 2024, Universal Music Group announced a majority investment in Mavin Global, the Lagos-based Afrobeats label founded by Don Jazzy in 2012.',
    reveal_text: 'UMG said Mavin has played a pioneering role in breaking Afrobeats artists within Africa and beyond.',
    sources: [{ name: 'Universal Music Group press release (PR Newswire)', url: 'https://prnewswire.com/news-releases/umg-announces-majority-investment-in-iconic-afrobeats-label-mavin-global-accelerating-expansion-of-africas-outstanding-creative-platform-302071077.html', date: '26 Feb 2024', passage: 'today announced a majority investment in ... Mavin Global (Mavin).', note: 'Release: "The deal remains subject to regulatory approval and is expected to close by the end of Q3 2024." No valuation given.' }],
  },
  {
    id: 'F8', position: 8, kind: 'info', answer_bool: null, verified: false, source_url: 'https://sony.mediaroom.com/2023-10-11-Sony-Launches-Sony-Innovation-Fund-Africa',
    verify: 'Checked against Sony’s announcement. Sony says "movie", not "film".',
    text: 'In October 2023, Sony launched the Sony Innovation Fund: Africa, initially allocating US$10 million to invest in seed to early-stage entertainment start-ups in Africa.',
    reveal_text: 'Gaming, music, movie and content distribution start-ups were named.',
    sources: [{ name: 'Sony Group, "Sony Launches Sony Innovation Fund: Africa"', url: 'https://sony.mediaroom.com/2023-10-11-Sony-Launches-Sony-Innovation-Fund-Africa', date: '11 Oct 2023', passage: 'Sony is initially allocating US$10 million towards such investments.', note: 'Also: "invest in seed to early-stage start-ups in the entertainment industry in Africa" and "including start-ups in the gaming, music, movie and content distribution sectors."' }],
  },
  {
    id: 'F9', position: 9, kind: 'info', answer_bool: null, verified: false, source_url: 'https://ifc.org/en/pressroom/2023/ifc-invests-in-e-commerce-platform-anka-to-support-africas-creat',
    verify: 'Checked against IFC’s release. One secondary outlet reported US$1.7 million; IFC’s own release says US$3.4 million, which is what we use.',
    text: 'In September 2023, IFC invested US$3.4 million in ANKA, an online sales platform for African creators and merchants. IFC said it was its first investment in Africa’s creative sector.',
    reveal_text: 'The funding is meant to help ANKA onboard about 100,000 additional artisans from across Africa by 2030.',
    sources: [{ name: 'IFC press release, "IFC Invests in E-Commerce Platform ANKA to Support Africa’s Creative Artisans"', url: 'https://ifc.org/en/pressroom/2023/ifc-invests-in-e-commerce-platform-anka-to-support-africas-creat', date: '19 Sep 2023', passage: 'IFC’s $3.4 million equity investment, announced today, into Côte d’Ivoire-based ANKA marks IFC’s first investment into Africa’s creative sector.', note: 'Also: "ANKA, an online sales platform for African creators and merchants"; "onboard about 100,000 additional artisans from across Africa by 2030".' }],
  },
];

// Welcome-game guess questions. A question is only ever played once its fact is verified.
// answer_index points into options. Edit freely; options are in English only for now.
export const GAME_QUESTIONS = [
  // Original examples F1 and F3: kept for the door cards and form interludes, not in the game unless you set game: true.
  { fact_id: 'F1', game: false, question: 'How many bands greeted Louis Armstrong when he arrived in Accra?', options: ['3', '7', '13', '30'], answer_index: 2, wink: 'Accra was not playing around.' },
  { fact_id: 'F3', game: false, question: null /* uses the fact text */, options: ['True', 'False'], answer_index: 0 },
  // The story, in this order: how big is it > Africa already > growth > a big night > a global deal > capital > new infrastructure > predict the room.
  { fact_id: 'F4', question: 'In 2022, how much did creative services generate in exports worldwide?', options: ['$140 billion', '$700 billion', '$1.4 trillion', '$3.8 trillion'], answer_index: 2 },
  { fact_id: 'F5', question: 'UNESCO\u2019s 2021 mapping estimated roughly how many people work in Africa\u2019s film and audiovisual industries?', options: ['500,000', '1 million', '5 million', '15 million'], answer_index: 2 },
  { fact_id: 'F6', question: 'How much did recorded-music revenue grow in Sub-Saharan Africa in 2025?', options: ['3.2%', '8.7%', '15.2%', '31.4%'], answer_index: 2 },
  { fact_id: 'F2', question: 'How much did Burna Boy reportedly gross at London Stadium in one night (29 June 2024)?', options: ['$1 to 3 million', '$3 to 5 million', '$5 to 7 million', '$7 to 10 million'], answer_index: 2, wink: 'Not a bad night\u2019s work.' },
  { fact_id: 'F7', question: 'In 2024, which global music company announced a majority investment in Nigeria\u2019s Mavin Global?', options: ['Warner Music Group', 'Sony Music Group', 'Universal Music Group', 'Spotify'], answer_index: 2 },
  { fact_id: 'F8', question: 'How much did Sony initially allocate to its Sony Innovation Fund: Africa?', options: ['US$1 million', 'US$10 million', 'US$50 million', 'US$100 million'], answer_index: 1 },
  { fact_id: 'F9', question: 'In 2023, IFC made its first investment in Africa\u2019s creative sector. What kind of business received it?', options: ['A film studio', 'A music label', 'An online sales platform for creators and merchants', 'A national tourism board'], answer_index: 2 },
];

// Where interludes appear in the wizard: after take at this position.
export const FACT_SLOTS = { 2: 'F1', 4: 'F3' }; // F2 is door-only. Adjust once facts are verified.

// Partner marks, shown because the game is part of the official CCA programme.
// Crops from the organisers' public graphic: replace the files in public/logos/ with the official kit (same filenames).
// Switch off instantly with SHOW_PARTNER_LOGOS=0.
export const LOGOS = [
  { file: 'creatives-connect-afrika.png', alt: 'Creatives Connect Afrika' },
  { file: 'ghana-arms.png', alt: 'Government of Ghana' },
  { file: 'black-star.png', alt: 'Black Star Experience' },
  { file: 'africa-tourism-partners.png', alt: 'Africa Tourism Partners' },
  { file: 'afcfta.png', alt: 'AfCFTA Secretariat' },
];

// Our own mark, bottom-right of every page and the stage. Always shown.
export const GCG_LOGO = { file: 'gcg.png', alt: 'Gold Coast Games' };
