# Onboarding: design + UX audit and redesign (25 Nov 2026)

Goal: the first 2 to 3 minutes should feel like a trailer, not a registration form. Curious > identify > take a side > invested > stop > want to come back.

## 1. Audit of the previous design (what was wrong)

| Area | Finding | Fix |
|---|---|---|
| Typography | Everything was the device's system sans in heavy uppercase. It rendered differently on every phone and read as "conference software". No display voice; statements, buttons and labels all shouted equally. | One display serif for statements and questions; sans only for labels, buttons and numbers. |
| Hierarchy | "Statement 1 of 5" and a progress bar were as loud as the statement. The proposition was not the hero. | The statement is the hero (38 to 76 px, line-height 1). Progress is a quiet "01 / 05" plus five ticks. |
| Opening | "Welcome to the game" + a paragraph: explained instead of intriguing. | "What do you actually think?" Five statements. No right answers. About three minutes. |
| Rhythm | Every statement identical, so it read as form field, form field, form field. | A different build-up line per statement; a lock-in line after each tap. |
| Interaction | A tap advanced the screen with no moment of consequence. | Tap locks the choice (fills red with a tick), the others recede, a line acknowledges it, then it moves on. |
| Scale | Numbers 1 to 5 in boxes: abstract. | Words: Not too bothered / I feel strongly / I feel very strongly / I'd fight you on this (four options; asks how passionate, not how certain) (still stored as 1 to 5). |
| Extras | Project, values and contact-sharing screens fed nothing in the plan. | Cut from the flow (the server still accepts them). |
| Ending | A number and an instruction: administrative. | A staged black ending: "That's all. For now." > "What does everyone else think?" > "Come back Monday." > the code. |
| Bug found in review | A CSS name collision made the black mood class bold and unwrappable. | Renamed (`night`). |

## 2. Type system

Directions considered (one chosen):
1. **Editorial contrast (chosen):** Instrument Serif (display) + the device sans for UI. Condensed, so long statements stay very large. Free (SIL OFL), self-hosted, about 43 KB for regular + italic.
2. Confident grotesque, single family: Bricolage Grotesque (variable width and weight). More game-show, less editorial; larger download.
3. Brand-faithful heavy sans (a geometric ExtraBold in caps, like CCA's own graphics). Safest brand match, highest risk of looking like event software.

Roles: **headline / statement / question = Instrument Serif 400** (italic for the build-up line, the echo and the acknowledgement). **UI = system sans** 500 / 700 / 800 (Inter would make it identical on every device, for about 60 KB more). **Numbers (stats, scores, the code) = system sans 800**, tabular, for impact at distance. Instrument Serif has only one weight and fine hairlines: never use it below about 19 px.

Scale (mobile > tablet): eyebrow 12 px caps .2em; count 13 px tabular; build-up line italic 23 to 30; **statement 38 to 68 (76 tablet)**; question 34 to 54 (58); answer tiles 38 to 56 serif (60); scale options 19 sans 700 (21); buttons 14 to 15 caps .14em; supporting copy 14 to 16; acknowledgement italic 30; reveal numbers 100 to 190 sans 800; code 96 to 170 sans 800. Long statements are never shrunk to fit: the serif is condensed, so they wrap into a block instead.

## 3. Colour roles (only white, black, CCA red, gold)

Background white; text near-black; secondary text grey; CTA red; **selected / locked: red fill + tick + the word "Locked."** (never colour alone); unselected: white with a 2 px black outline; reveal: gold when right, red when not; the stop: black; attention: dark red text with a left rule.

## 4. Interaction, sound, motion

Lock (fill, others fade to 14%, tile scales 2.5%) > acknowledgement line > about 650 ms > next screen. Reduced-motion users get about 160 ms and no animation. Sound is synthesized (no files): a soft low "lock", a rising cue for suspense, a long low note at the start of the ending and a single hit as the big question lands. **Off by default** (a quiet toggle top-right), because a delegate may open this in a meeting; vibration is a 12 ms tick.

## 5. Final test, answered honestly

- Looks like a survey? No: one question, serif statement, no form chrome. (Who/consent screens are necessarily plainer.)
- Obvious hero on every screen? Yes, apart from the "who" page, which has three fields by design.
- Statement readable at a glance? Yes: the largest thing on the screen.
- Anything unnecessarily complicated? Removed three screens; 20 remain (15 are single taps).
- Cliffhanger strong enough? It withholds the result and names the question; whether it pulls people back on Monday is a hypothesis to test.

**What I cannot judge from here:** how the sound feels (I cannot hear it), how the serif renders on older Android phones, and whether the tone lands with ministry staff. Test those Thursday.

## 6. Still to do

The welcome game uses the same serif for questions and verdicts, but the Day 3 big-screen deck is still in the earlier heavy-sans look: a consistency pass is needed. The playful lines are my draft for you to approve.
