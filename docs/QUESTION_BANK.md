# CCA welcome game: sourced question bank (first pass, 25 Nov 2026)

**Status of every item: UNVERIFIED.** The game only uses a fact after Hinda ticks "verified" in `/admin`. "Evidence" below says what Claude actually saw. Content lives in `src/content.js` (`FACTS` and `GAME_QUESTIONS`); the admin page shows the same sources beside each fact.

Story arc (7 rounds): how big is it > Africa already > growth > a global deal > capital > new infrastructure > **predict the room** (from the onboarding data, always last).

| # | Question (as asked) | Answer | Source | Evidence seen |
|---|---|---|---|---|
| 1 F4 | In 2022, how much did creative services generate in exports worldwide? | $1.4 trillion | UNCTAD, Creative Economy Outlook 2024 | **Not opened** (fetch timed out twice). Search results describing the page: $1.4tn in 2022, +29% since 2017, 19% of global services exports. Not a verbatim quote. |
| 2 F5 | UNESCO's 2021 mapping estimated roughly how many people work in Africa's film and audiovisual industries? | About 5 million | UNESCO (2021) via UN News, 5 Oct 2021 | UN News page read: "the first-ever mapping of the sector, which currently employs some five million people and accounts for $5 billion in GDP across Africa." Potential: "over 20 million jobs" and "$20 billion". **UNESCO's own report returned 403**, so please check it. |
| 3 F6 | How much did recorded-music revenue grow in Sub-Saharan Africa in 2025? | 15.2% | IFPI Global Music Report 2026, 18 Mar 2026 | IFPI page read: "Sub-Saharan Africa saw recorded music revenue growth of 15.2% and these revenues reached US$120 million." |
| 4 F7 | In 2024, which global music company announced a majority investment in Nigeria's Mavin Global? | Universal Music Group | UMG press release, 26 Feb 2024 | Release read: "today announced a majority investment in ... Mavin Global (Mavin)." |
| 5 F8 | How much did Sony initially allocate to its Sony Innovation Fund: Africa? | US$10 million | Sony Group, 11 Oct 2023 | Page read: "Sony is initially allocating US$10 million towards such investments." |
| 6 F9 | In 2023, IFC made its first investment in Africa's creative sector. What kind of business received it? | An online sales platform for creators and merchants (ANKA) | IFC press release, 19 Sep 2023 | Page read: "IFC's $3.4 million equity investment ... into Côte d'Ivoire-based ANKA marks IFC's first investment into Africa's creative sector." |
| 7 | Predict the room (two statements, from the onboarding answers) | from the data | n/a | n/a |

## Things the first draft got wrong, or that need care

- **UNESCO figures are from 2021.** The first draft said "currently". The question now says "UNESCO's 2021 mapping".
- **IFPI rank:** IFPI's page does **not** say Sub-Saharan Africa ranked second-fastest. Do not claim a rank. It does say South Africa is 78.1% of the region's revenue, so say "Sub-Saharan Africa", not "Africa".
- **UMG / Mavin:** the release says "announced", and that the deal "remains subject to regulatory approval". I could not confirm it closed. Never say "bought" or "acquired". UMG gives **no valuation**: the figures floating around ($125m to $200m, $150m to $200m) come from other outlets. Left out.
- **UNCTAD:** a newer UNCTADstat figure exists for 2024. Always say "in 2022".
- **Sony:** the page says "movie", not "film".
- **IFC / ANKA:** one secondary outlet reported US$1.7 million. IFC's own release says US$3.4 million, which is what we use.

## Cut from the first draft (and why)

- "Biggest knock-on effect" and "which assets count as economic value": no objectively correct answer, so they cannot be scored.
- Copyright and AfCFTA IP legal questions: legal wording needs clearance by the AfCFTA Secretariat and a lawyer first.
- Mavin valuation: not in the primary source.
- Select-all questions: not needed; every round fits multiple choice or predict-the-room.

## Original examples, kept out of the game

F1 (Armstrong), F2 (Burna Boy) and F3 (AfCFTA true/false) are still in the seed for the door cards and form interludes, but `game: false` keeps them out of the seven rounds. F2 was your own example: set `game: true` in `GAME_QUESTIONS` to bring it back (it is also unverified).

## Method note

The facts are context, not an argument for any of the five statements, so the welcome game does not try to move people on the takes. The final result is reported as "how the room moved", never "caused".
