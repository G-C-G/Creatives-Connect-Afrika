# Audio files you add (nothing here is bundled: add only what is cleared)

Every slot is optional. A missing file means the page plays its own original synthesised sound (or nothing) instead.
Files are MP3, short, and named exactly as below. Keep them small: many delegates are on limited data.

| File | When it plays |
|---|---|
| `welcome-home.mp3` | Starts at the opening tap, fades in, loops softly under the questions |
| `countries/<country>.mp3` | About 10 seconds, when a delegate picks that country on the first question. Stops when they move on. Anyone who picks "Outside Africa" gets `ghana.mp3`. Names are lower-case with hyphens, e.g. `ghana.mp3`, `south-africa.mp3`, `cote-d-ivoire.mp3` (the full list is every country in `src/content.js`, run through `countrySlug`) |
| `fx/stance-agree.mp3`, `fx/stance-disagree.mp3` | Tapping Agree / Disagree |
| `fx/strength-1.mp3` to `fx/strength-5.mp3` | "Not very" to "I'd fight you on this" |
| `fx/level-quiet.mp3`, `fx/level-aloud.mp3`, `fx/level-stage.mp3` | "Keeping that to myself" / "I'd say it out loud" / "Give me the microphone" |
| `fx/sector.mp3`, `fx/goal.mp3` | Picking a sector / why you are here |

Rights: recordings and voice clips belong to whoever made them. Crediting the source is good practice but is not permission. Do not commit a file to the repository, or host it, until you have the right to. Stage cues are a separate mechanism: `cues/<name>.mp3` next to the downloaded stage deck.
