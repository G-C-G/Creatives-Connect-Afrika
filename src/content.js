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
    text: 'In 1956, Louis Armstrong arrived in Accra and was greeted by 13 bands playing E.T. Mensah’s “All for You”, with Armstrong’s name sung into it.',
    reveal_text: 'He reportedly recognised it as a Creole song from New Orleans. (VERIFY: sources disagree between 1956 and 1957.)',
  },
  {
    id: 'F2', position: 2, kind: 'info', answer_bool: null, verified: false, source_url: '',
    text: 'Burna Boy at London Stadium, 29 June 2024: a reported $6.147m from 58,973 tickets, the highest single-night gross by an African act.',
    reveal_text: 'Concert-tracking data reported by the press. (VERIFY: no later record has overtaken it.)',
  },
  {
    id: 'F3', position: 3, kind: 'true_false', answer_bool: true, verified: false, source_url: '',
    text: 'True or false: under the AfCFTA digital trade framework, African content from African-owned enterprises and platforms is eligible for preferential treatment.',
    reveal_text: 'True. The annexes were adopted in February 2025 and ratification is incomplete. This is not a promise of any benefit. (VERIFY wording with the AfCFTA Secretariat.)',
  },
];

// Where interludes appear in the wizard: after take at this position.
export const FACT_SLOTS = { 2: 'F1', 4: 'F3' }; // F2 is door-only. Adjust once facts are verified.

// Partner marks, shown because the game is part of the official CCA programme.
// Crops from the organisers' public graphic: replace the files in public/logos/ with the official kit (same filenames).
// Switch off instantly with SHOW_PARTNER_LOGOS=0.
export const LOGOS = [
  { file: 'ghana-arms.png', alt: 'Government of Ghana' },
  { file: 'black-star.png', alt: 'Black Star Experience' },
  { file: 'africa-tourism-partners.png', alt: 'Africa Tourism Partners' },
  { file: 'creatives-connect-afrika.png', alt: 'Creatives Connect Afrika' },
  { file: 'afcfta.png', alt: 'AfCFTA Secretariat' },
];

// Our own mark (bottom-right of pages and stage). Always shown.
export const GCG_LOGO = { file: 'gcg.jpg', alt: 'Gold Coast Games' };
