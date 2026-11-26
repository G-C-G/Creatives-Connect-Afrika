// SEED / CONFIG. Content lives here, not in components.
// Take text becomes immutable once locked in the DB (see db.js seedContent).

export const EVENT = {
  name: 'Creatives Connect Afrika 2026',
  startsAtDefault: '2026-11-30T08:00:00Z',
};

import { FR_ROLES, FR_GOALS, FR_ACTIVITIES, FR_TAKES, FRENCH_COUNTRIES } from './fr.js';
export { FRENCH_COUNTRIES };

const opt = (id, en, fr) => ({ id, en, ...(fr ? { fr } : {}) });

export const SECTORS = [
  opt('music', 'Music'), opt('film', 'Film'), opt('fashion', 'Fashion'),
  opt('visual_art', 'Visual art'), opt('gaming', 'Gaming'),
  opt('performing', 'Performing arts'), opt('design_craft', 'Design and craft'), opt('media', 'Media and publishing'), opt('events', 'Events and experiences'),
  opt('tourism', 'Tourism / hospitality'), opt('policy', 'Policy / government'),
  opt('finance', 'Finance / investment'), opt('tech', 'Tech'), opt('other', 'Other'),
];

// Who is in the room. This is the most important cut of the data: what do government and tourism managers, experience makers, independent artists and visitors each think should be invested in?
export const ROLES = [
  opt('government', 'Government or public body'), opt('tourism_biz', 'Tourism board, hotel or venue'), opt('experience_maker', 'I create or host experiences'),
  opt('independent', 'Independent artist or creative'), opt('visitor', 'I am a visitor or tourist'),
];


// "Where do you play?": specific things people do, A to Z. A delegate picks as many as they like (or types their own). Each belongs to one broad sector so the analysis still works;
// the broad sector stored for a person is the one their first pick belongs to.
export const ACTIVITIES = [
  { id: 'accountant', en: 'Accountant', sector: 'finance' },
  { id: 'actor_or_actress', en: 'Actor or actress', sector: 'film' },
  { id: 'advertising', en: 'Advertising', sector: 'media' },
  { id: 'ai_specialist', en: 'AI specialist', sector: 'tech' },
  { id: 'airline_or_airport_worker', en: 'Airline or airport worker', sector: 'tourism' },
  { id: 'animator', en: 'Animator', sector: 'film' },
  { id: 'app_or_platform_founder', en: 'App or platform founder', sector: 'tech' },
  { id: 'architect', en: 'Architect', sector: 'design_craft' },
  { id: 'archivist', en: 'Archivist', sector: 'other' },
  { id: 'arts_council', en: 'Arts council', sector: 'policy' },
  { id: 'author_or_writer', en: 'Author or writer', sector: 'media' },
  { id: 'banker', en: 'Banker', sector: 'finance' },
  { id: 'bead_maker', en: 'Bead maker', sector: 'design_craft' },
  { id: 'blogger', en: 'Blogger', sector: 'media' },
  { id: 'booking_agent', en: 'Booking agent', sector: 'events' },
  { id: 'casting_director', en: 'Casting director', sector: 'film' },
  { id: 'chef', en: 'Chef', sector: 'tourism' },
  { id: 'choreographer', en: 'Choreographer', sector: 'performing' },
  { id: 'cinematographer', en: 'Cinematographer', sector: 'film' },
  { id: 'comedian', en: 'Comedian', sector: 'performing' },
  { id: 'consultant', en: 'Consultant', sector: 'other' },
  { id: 'content_creator', en: 'Content creator', sector: 'media' },
  { id: 'copyright_or_ip_office', en: 'Copyright or IP office', sector: 'policy' },
  { id: 'craftsperson_or_artisan', en: 'Craftsperson or artisan', sector: 'design_craft' },
  { id: 'creative_entrepreneur', en: 'Creative entrepreneur', sector: 'other' },
  { id: 'creative_funder_or_grant_maker', en: 'Creative funder or grant maker', sector: 'finance' },
  { id: 'crowdfunding_platform', en: 'Crowdfunding platform', sector: 'finance' },
  { id: 'cultural_performer', en: 'Cultural performer', sector: 'performing' },
  { id: 'cultural_policy_adviser', en: 'Cultural policy adviser', sector: 'policy' },
  { id: 'cultural_preservation', en: 'Cultural preservation', sector: 'other' },
  { id: 'curator', en: 'Curator', sector: 'visual_art' },
  { id: 'dancer', en: 'Dancer', sector: 'performing' },
  { id: 'data_analyst', en: 'Data analyst', sector: 'tech' },
  { id: 'destination_marketer', en: 'Destination marketer', sector: 'tourism' },
  { id: 'development_agency_or_ngo', en: 'Development agency or NGO', sector: 'policy' },
  { id: 'digital_artist', en: 'Digital artist', sector: 'visual_art' },
  { id: 'diplomat', en: 'Diplomat', sector: 'policy' },
  { id: 'dj', en: 'DJ', sector: 'music' },
  { id: 'documentary_maker', en: 'Documentary maker', sector: 'film' },
  { id: 'drummer_or_percussionist', en: 'Drummer or percussionist', sector: 'performing' },
  { id: 'esports_organiser', en: 'Esports organiser', sector: 'gaming' },
  { id: 'event_planner', en: 'Event planner', sector: 'events' },
  { id: 'fashion_designer', en: 'Fashion designer', sector: 'fashion' },
  { id: 'fashion_retailer_or_buyer', en: 'Fashion retailer or buyer', sector: 'fashion' },
  { id: 'festival_organiser', en: 'Festival organiser', sector: 'events' },
  { id: 'film_director', en: 'Film director', sector: 'film' },
  { id: 'film_distributor', en: 'Film distributor', sector: 'film' },
  { id: 'film_festival_organiser', en: 'Film festival organiser', sector: 'film' },
  { id: 'film_or_video_editor', en: 'Film or video editor', sector: 'film' },
  { id: 'film_producer', en: 'Film producer', sector: 'film' },
  { id: 'fintech_or_payments', en: 'Fintech or payments', sector: 'finance' },
  { id: 'gallery_owner', en: 'Gallery owner', sector: 'visual_art' },
  { id: 'game_artist', en: 'Game artist', sector: 'gaming' },
  { id: 'game_designer', en: 'Game designer', sector: 'gaming' },
  { id: 'game_developer', en: 'Game developer', sector: 'gaming' },
  { id: 'gospel_or_choir_leader', en: 'Gospel or choir leader', sector: 'music' },
  { id: 'government_official', en: 'Government official', sector: 'policy' },
  { id: 'graphic_designer', en: 'Graphic designer', sector: 'visual_art' },
  { id: 'hair_stylist', en: 'Hair stylist', sector: 'fashion' },
  { id: 'homestay_or_guesthouse_host', en: 'Homestay or guesthouse host', sector: 'tourism' },
  { id: 'hospitality_trainer', en: 'Hospitality trainer', sector: 'tourism' },
  { id: 'hotel_manager', en: 'Hotel manager', sector: 'tourism' },
  { id: 'hotel_or_restaurant_staff', en: 'Hotel or restaurant staff', sector: 'tourism' },
  { id: 'illustrator', en: 'Illustrator', sector: 'visual_art' },
  { id: 'impact_investor', en: 'Impact investor', sector: 'finance' },
  { id: 'influencer', en: 'Influencer', sector: 'media' },
  { id: 'insurance', en: 'Insurance', sector: 'finance' },
  { id: 'interior_designer', en: 'Interior designer', sector: 'design_craft' },
  { id: 'investor', en: 'Investor', sector: 'finance' },
  { id: 'jewellery_maker', en: 'Jewellery maker', sector: 'fashion' },
  { id: 'journalist', en: 'Journalist', sector: 'media' },
  { id: 'lawyer', en: 'Lawyer', sector: 'other' },
  { id: 'leatherworker', en: 'Leatherworker', sector: 'design_craft' },
  { id: 'lighting_or_sound_technician', en: 'Lighting or sound technician', sector: 'events' },
  { id: 'live_band_member', en: 'Live band member', sector: 'music' },
  { id: 'local_government', en: 'Local government', sector: 'policy' },
  { id: 'make_up_artist', en: 'Make-up artist', sector: 'fashion' },
  { id: 'marketing_and_branding', en: 'Marketing and branding', sector: 'media' },
  { id: 'mc_or_host', en: 'MC or host', sector: 'performing' },
  { id: 'ministry_staff', en: 'Ministry staff', sector: 'policy' },
  { id: 'model', en: 'Model', sector: 'fashion' },
  { id: 'muralist', en: 'Muralist', sector: 'visual_art' },
  { id: 'museum_or_heritage_staff', en: 'Museum or heritage staff', sector: 'tourism' },
  { id: 'music_manager', en: 'Music manager', sector: 'music' },
  { id: 'music_producer', en: 'Music producer', sector: 'music' },
  { id: 'music_publisher', en: 'Music publisher', sector: 'music' },
  { id: 'musician_or_instrumentalist', en: 'Musician or instrumentalist', sector: 'music' },
  { id: 'painter', en: 'Painter', sector: 'visual_art' },
  { id: 'philanthropist', en: 'Philanthropist', sector: 'finance' },
  { id: 'photographer', en: 'Photographer', sector: 'visual_art' },
  { id: 'podcaster', en: 'Podcaster', sector: 'media' },
  { id: 'poet', en: 'Poet', sector: 'media' },
  { id: 'potter_or_ceramicist', en: 'Potter or ceramicist', sector: 'design_craft' },
  { id: 'product_designer', en: 'Product designer', sector: 'design_craft' },
  { id: 'production_crew', en: 'Production crew', sector: 'events' },
  { id: 'production_designer', en: 'Production designer', sector: 'film' },
  { id: 'promoter', en: 'Promoter', sector: 'events' },
  { id: 'public_relations', en: 'Public relations', sector: 'media' },
  { id: 'publisher', en: 'Publisher', sector: 'media' },
  { id: 'radio_presenter', en: 'Radio presenter', sector: 'media' },
  { id: 'record_label', en: 'Record label', sector: 'music' },
  { id: 'regulator', en: 'Regulator', sector: 'policy' },
  { id: 'researcher_or_academic', en: 'Researcher or academic', sector: 'policy' },
  { id: 'restaurant_owner', en: 'Restaurant owner', sector: 'tourism' },
  { id: 'screenwriter', en: 'Screenwriter', sector: 'film' },
  { id: 'sculptor', en: 'Sculptor', sector: 'visual_art' },
  { id: 'singer', en: 'Singer', sector: 'music' },
  { id: 'social_media_manager', en: 'Social media manager', sector: 'media' },
  { id: 'software_developer', en: 'Software developer', sector: 'tech' },
  { id: 'songwriter', en: 'Songwriter', sector: 'music' },
  { id: 'sound_engineer', en: 'Sound engineer', sector: 'music' },
  { id: 'spoken_word_artist', en: 'Spoken-word artist', sector: 'performing' },
  { id: 'stage_manager', en: 'Stage manager', sector: 'events' },
  { id: 'storyteller', en: 'Storyteller', sector: 'performing' },
  { id: 'streamer', en: 'Streamer', sector: 'gaming' },
  { id: 'streaming_platform', en: 'Streaming platform', sector: 'tech' },
  { id: 'student', en: 'Student', sector: 'other' },
  { id: 'stylist', en: 'Stylist', sector: 'fashion' },
  { id: 'tailor_or_seamstress', en: 'Tailor or seamstress', sector: 'fashion' },
  { id: 'teacher_or_lecturer', en: 'Teacher or lecturer', sector: 'other' },
  { id: 'textile_and_fabric_maker', en: 'Textile and fabric maker', sector: 'fashion' },
  { id: 'theatre_artist', en: 'Theatre artist', sector: 'performing' },
  { id: 'ticketing', en: 'Ticketing', sector: 'events' },
  { id: 'tour_guide', en: 'Tour guide', sector: 'tourism' },
  { id: 'tour_operator', en: 'Tour operator', sector: 'tourism' },
  { id: 'tourism_authority', en: 'Tourism authority', sector: 'policy' },
  { id: 'tourism_board_staff', en: 'Tourism board staff', sector: 'tourism' },
  { id: 'trade_official', en: 'Trade official', sector: 'policy' },
  { id: 'translator', en: 'Translator', sector: 'other' },
  { id: 'transport_or_ride_service', en: 'Transport or ride service', sector: 'tourism' },
  { id: 'travel_agent', en: 'Travel agent', sector: 'tourism' },
  { id: 'travel_blogger', en: 'Travel blogger', sector: 'tourism' },
  { id: 'tv_presenter', en: 'TV presenter', sector: 'media' },
  { id: 'tv_producer', en: 'TV producer', sector: 'film' },
  { id: 'venture_capitalist', en: 'Venture capitalist', sector: 'finance' },
  { id: 'venue_owner_or_manager', en: 'Venue owner or manager', sector: 'events' },
  { id: 'videographer', en: 'Videographer', sector: 'film' },
  { id: 'visual_artist', en: 'Visual artist', sector: 'visual_art' },
  { id: 'voice_actor', en: 'Voice actor', sector: 'film' },
  { id: 'vr_or_ar_creator', en: 'VR or AR creator', sector: 'tech' },
  { id: 'weaver', en: 'Weaver', sector: 'design_craft' },
  { id: 'web_designer', en: 'Web designer', sector: 'tech' },
  { id: 'woodcarver', en: 'Woodcarver', sector: 'design_craft' },
];
export const activityById = new Map(ACTIVITIES.map((a) => [a.id, a]));

export const GOALS = [
  opt('pan_african', 'Meet Pan-African creatives'), opt('partners', 'Find partners'), opt('collaborators', 'Find people to create with'),
  opt('funding', 'Find funding or investors'), opt('audience', 'Reach a new audience'), opt('market', 'Open new markets'),
  opt('clients', 'Win clients or customers'), opt('insight', 'Learn what is happening right now'), opt('knowledge', 'Gain knowledge and skills'),
  opt('ideas', 'Get ideas and inspiration'), opt('decision_makers', 'Meet decision-makers'), opt('visibility', 'Get my work seen'), opt('story', 'Share my story'), opt('other', 'Something else'),
];

for (const r of ROLES) if (FR_ROLES[r.id]) r.fr = FR_ROLES[r.id];
for (const g of GOALS) if (FR_GOALS[g.id]) g.fr = FR_GOALS[g.id];
for (const a of ACTIVITIES) if (FR_ACTIVITIES[a.id]) a.fr = FR_ACTIVITIES[a.id];

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
export const countrySlug = (c) => String(c).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const OUTSIDE_AFRICA = 'Outside Africa (diaspora / other)';
// Every country in the world can be picked. Only the African ones have a nudge clip (public/audio/countries/<country>.mp3); everyone else quietly gets the Ghana clip.
// The old catch-all stays valid so earlier answers still load, but it is no longer offered.
export const AFRICAN_COUNTRIES = Object.values(REGION_MAP).flat().sort((a, b) => a.localeCompare(b));
const REST_OF_WORLD = ['Saint Kitts and Nevis', 'Saint Vincent and the Grenadines', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'Palau', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu', 'Timor-Leste', 'San Marino', 'Kosovo', 'Hong Kong', 'Afghanistan', 'Albania', 'Andorra', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Brunei', 'Bulgaria', 'Cambodia', 'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Denmark', 'Dominica', 'Dominican Republic', 'Ecuador', 'El Salvador', 'Estonia', 'Fiji', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Grenada', 'Guatemala', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malaysia', 'Maldives', 'Malta', 'Mexico', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Saint Lucia', 'Samoa', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Korea', 'Spain', 'Sri Lanka', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Thailand', 'Trinidad and Tobago', 'Turkey', 'Turkmenistan', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen'];
export const COUNTRIES = [...AFRICAN_COUNTRIES, ...REST_OF_WORLD, OUTSIDE_AFRICA];
export const PICKABLE_COUNTRIES = [...AFRICAN_COUNTRIES, ...REST_OF_WORLD].sort((a, b) => a.localeCompare(b));
// Country names in French for the picker (the stored value stays the English name). Intl does the translating; a few names need their code spelled out.
const CODE_FIX = { 'Antigua and Barbuda': 'AG', 'Bosnia and Herzegovina': 'BA', 'Cabo Verde': 'CV', 'Congo (Republic)': 'CG', "C\u00f4te d'Ivoire": 'CI', 'DR Congo': 'CD', 'Hong Kong': 'HK', Myanmar: 'MM', Palestine: 'PS', 'Saint Kitts and Nevis': 'KN', 'Saint Lucia': 'LC', 'Saint Vincent and the Grenadines': 'VC', 'S\u00e3o Tom\u00e9 and Pr\u00edncipe': 'ST', 'Trinidad and Tobago': 'TT', Turkey: 'TR' };
let _codes = null;
export function countryLabel(name, lang = 'en') {
  if (lang !== 'fr') return name;
  try {
    if (!_codes) { _codes = {}; const en = new Intl.DisplayNames(['en'], { type: 'region' }); for (let a = 65; a < 91; a++) for (let b = 65; b < 91; b++) { const c = String.fromCharCode(a, b); try { const n = en.of(c); if (n && n !== c) _codes[n] = c; } catch (e) { /* not a region */ } } }
    const code = CODE_FIX[name] || _codes[name];
    return code ? new Intl.DisplayNames(['fr'], { type: 'region' }).of(code) : name;
  } catch (e) { return name; }
}
export function regionOf(country) {
  for (const [r, list] of Object.entries(REGION_MAP)) if (list.includes(country)) return r;
  return COUNTRIES.includes(country) ? 'Outside Africa' : 'Unknown';
}

// Takes that are a choice between two options instead of Agree / Disagree. The answer is still stored as agree (first option) or disagree (second option);
// only the words shown to people change (the buttons, the stage deck, the welcome game).
export const TAKE_SIDES = {
  T1: { agree: 'A life of meaning', disagree: 'A life of wealth' },
  T2: { agree: 'Build Africa first', disagree: 'Go global now' },
  T3: { agree: 'Do it for free', disagree: 'Stand by your price' },
  T5: { agree: 'People and social experiences', disagree: 'Places and spaces' },
};
export const sidesOf = (id, lang = 'en') => (lang === 'fr' && FR_TAKES[id]?.sides) || TAKE_SIDES[id] || null;
// What a phone shows for those takes: a short question, then the good and the bad of BOTH options on the two tiles.
export const TAKE_DETAIL = {
  T1: { setup: 'Looking back at the end of your life.', stem: 'Which life would you rather have lived?',
    agree: { eg: 'You made meaningful work that touched many lives, and lived comfortably, but never became rich', good: 'Your work mattered, and reached people for generations', bad: 'You lived unappreciated and undervalued, and never reached the wealth you could have had' },
    disagree: { eg: 'You built the business side, and made real money', good: ['You shared it: you looked after your family and the people you love at the highest level, and then some', 'A comfort and luxury most people never see'], bad: 'You never felt completely fulfilled: you gave up your inner calling for a business that paid well but did not feel meaningful to you, and your impact stayed small' } },
  T2: { stem: 'One budget, one year. Where does it go?',
    agree: { good: 'Build an audience that knows you, backs you and grows with you', bad: 'It may take longer to reach the money and scale you\u2019re looking for: the market that values creatives is less prioritised here than in other countries' },
    disagree: { good: 'Go where creatives are valued and prioritised, and the audience, money and opportunity already are', bad: 'Without a home base, you are a guest everywhere' } },
  T3: { stem: 'A big opportunity comes, but they cannot pay for your work. Do you do it for free, or stand by your price?',
    agree: { good: 'You get in the rooms where you can be recognised globally', bad: 'You may not grow: clients start expecting it cheap, and it gets hard to charge more later' },
    disagree: { good: 'People respect your work and your price', bad: 'Global recognition comes slower, because people are not willing to pay Africans for their work, and you may not grow: fewer referrals, a smaller network' } },
  // Take 5 shows reasons only (no costs): both sides can be culturally relevant, and it is a matter of what each person values.
  T5: { stem: 'Which is more valuable to tourism and cultural experiences?',
    agree: { eg: 'Artists, storytellers, singers, dancers, guides, craftspeople, staff', good: ['People make a place unique: their stories, music and welcome are what visitors remember', 'Social experiences turn visitors into guests, and guests into people who return'] },
    disagree: { eg: 'Nature, architecture, cultural spaces, venues, airports', good: ['Places carry culture too: heritage, architecture and living spaces tell a country\u2019s story', 'Great spaces draw visitors and let them enjoy it their own way, with or without the crowd'] } },
};
export const detailOf = (id, lang = 'en') => (lang === 'fr' && FR_TAKES[id]?.stem ? FR_TAKES[id] : TAKE_DETAIL[id]) || null;
// The statement as shown to a delegate: the stored English text, or its French display version.
export const takeText = (take, lang = 'en') => (lang === 'fr' && FR_TAKES[take.id]?.text) || take.text;

// LOCKED once launched. Never reword after locked = 1. theme_tag: TBD per spec.
export const TAKES = [
  { id: 'T5', position: 1, theme_tag: null, text: 'Which is more valuable to tourism and cultural experiences: the people and social experiences (artists, storytellers, guides, craftspeople, staff), or the places and spaces (nature, architecture, cultural spaces, venues, airports)?' },
  { id: 'T1', position: 2, theme_tag: null, text: 'Looking back at the end of your life, which life would you rather have lived? A life of meaning: you made meaningful work that touched many lives, and lived comfortably, but unappreciated and undervalued, and never rich. Or a life of wealth: you built the business side and made real money, and you shared it, looking after your family and the people you love at the highest level, but you never felt completely fulfilled: you gave up your inner calling for a business that paid well but did not feel meaningful to you, and your impact stayed small.' },
  { id: 'T4', position: 3, theme_tag: null, text: 'I\u2019d rather see African work go global under foreign ownership than stay 100% African-owned and unseen.' },
  { id: 'T3', position: 4, theme_tag: null, text: 'A big opportunity comes, but they cannot pay for your work. Do you do it for free, or stand by your price? Do it free and you get in the rooms where you can be recognised globally, but you may not grow, as clients start expecting it cheap. Stand by your price and your work is respected, but global recognition comes slower, because people are not willing to pay Africans for their work.' },
  { id: 'T2', position: 5, theme_tag: null, text: 'One budget, one year. Where does it go? Build Africa first: build an audience that knows you, backs you and grows with you, but it may take longer to reach the money and scale you\u2019re looking for, because the market that values creatives is less prioritised here than in other countries. Or go global now: go where creatives are valued and prioritised, and the audience, money and opportunity already are, but without a home base, you are a guest everywhere.' },
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
  { file: 'africa-tourism-partners.png', alt: 'Africa Tourism Partners' },
  { file: 'ghana-arms.png', alt: 'Government of Ghana' },
  { file: 'black-star.png', alt: 'Black Star Experience' },
  { file: 'afcfta.png', alt: 'AfCFTA Secretariat' },
];

// The centrepiece of the opening screen: the full Creatives Connect Afrika mark (circle crop of the organisers' artwork).
export const CCA_HERO = { file: 'cca-hero.png', alt: 'Creatives Connect Afrika' };

// Faint oversized accent behind the opening headline: the northern half of the Africa artwork (no lettering).
export const CCA_ACCENT = { file: 'africa-accent.png' };

// Our own mark, bottom-right of every page and the stage. Always shown.
export const GCG_LOGO = { file: 'gcg.png', alt: 'Gold Coast Games' };
