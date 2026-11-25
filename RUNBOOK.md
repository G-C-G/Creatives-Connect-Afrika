# CCA game: event-day runbook (one page)

**Owner of data readiness on Day 3:** ______________ (name one person, rehearse with test data)

## Before launch (Thu 26 Nov)
1. Set env vars: `ADMIN_PASSWORD`, `SESSION_SECRET`, `BASE_URL`, `DB_PATH` (persistent disk), optional `RESEND_API_KEY` + `MAIL_FROM`.
2. Open `/admin` (user: anything, password: `ADMIN_PASSWORD`). Set **Event starts**, **Day 3 opens**, **Day 3 closes** (times are UTC, which equals Accra time).
3. Facts: leave **unverified** unless you have checked the source. Unverified facts are never shown anywhere.
4. 10-person run-through on real phones: time it (target under 5 min), confirm the number shows AND the email arrives (check `/admin` for "unsent"), confirm the magic link opens Day 3.
5. Send organisers the link: `BASE_URL/` (first page: the CCA game experience). Door QR: `BASE_URL/play`.
6. **Takes lock on the first stored response. Do not reword them after that.** Test responses count: rehearse on a separate DB (`DB_PATH=./data/rehearsal.db npm run seed-demo`), never the live one.

## Mon 30 Nov (welcome game: on phones and tablets, upright or sideways)
Door QR points to `BASE_URL/play`. People self-serve: **has code** = first name + code, plays. **No code** = "Get my code" (short onboarding), then "Continue to the welcome game". **Lost code** = "Email it to me". Your team should not need to intervene.
1. Before doors open: `/admin/icebreaker`. Review the suggestions (most even split, highest strength). Pick two statements. Save.
2. `/admin` > verify the hot facts you are happy to use. Unverified facts are left out of the game.
3. `/admin/play` > **Freeze deck now**, check the rounds listed, then **Open game**. (Freeze again if you change picks or facts, before opening. The deck is fixed once players are in.)
4. Prize: `/admin/play` shows the leaderboard. Each person's first play counts.
5. Close the game with **Close game** when the session ends.
6. Optional big-screen companion: `/admin/snapshots` > freeze the icebreaker snapshot, open `/stage/icebreaker` (landscape slides for a projector).

## Conference game (the 10-minute stage slot, Day 1, 2 or 3)
Show the room what the onboarding said, get them to predict it, then find opposites and debate.
1. Before the slot: `/admin/casting`. Statements are listed most divisive first. Pick one: the page suggests **opposing pairs** (the most willing, then most passionate, on each side: microphone volunteers first, then "out loud"). Quiet people are never suggested. Names are for you only. If a side has nobody, the page says so: ask the floor.
2. `/admin/snapshots` > **Freeze conference snapshot** (aggregates only: no names). Open `/stage/conference` on the stage laptop (right arrow / space = reveal or next, M mute, F full screen).
3. On stage, each statement is a round (right arrow, space or click moves on). **Press 1:** the statement alone, then a 3-2-1 countdown ends on "Cards up!". Everyone shows a card: mostly agree, split or mostly disagree. **Press 2:** drum roll with the marquee bulbs, then the crowd of dots sorts into Agree and Disagree, the screen flashes and a stamp gives the answer ("Split.", "Mostly agree."). Give a point to everyone holding the matching card. **Press 3:** how many would take the microphone (the ringed dots) and how many said "I'd fight you on this". **Press 4:** next round.
4. "Find your opposite": "Who said Agree? Stand up. Now find someone who said Disagree." To help people remember their answer, switch ON the **My-answers page** (`/me`) on the casting page. It shows each person only their own answers. **Switch it OFF afterwards.**
5. Call people up. **Ask first, in person:** "You said you'd take the microphone on this: still up for it?" Let anyone decline. Tap **Mark called** so you do not call the same person twice.
6. Debate on two podiums, 90 seconds each: **press** starts the Agree clock (buzzer at zero), **press again** to stop early and move to the Disagree podium, **press** starts that clock, **press** to finish, **press** for "Hands up again. Did anyone move?"
7. **Anchoring:** hearing others' views and seeing your own answers can nudge the Day 3 re-ask. That is part of the experience we measure ("how the room moved"), but if you want a cleaner Day 3, keep `/me` off and run this slot after the Day 3 form closes.

## Day 3 (the review game: then vs now)
1. Form closes automatically at the time you set (1 hour before the slot). Check `/admin` shows it set.
2. At close: `/admin/final` to review. Check n. If matched is very low, say so openly on stage.
3. `/admin/stories`: read each story. Mark **Vetted** then **Use in room**. Only vetted + consented stories can reach the screen.
4. `/admin/volunteers`: pick one who changed their mind and one who did not. Brief them beforehand.
5. `/admin/snapshots` > **Freeze final snapshot**. Open `/stage/final`. Also download the .html (works offline: just double-click it).
6. Big screen keys: right arrow / space / click = reveal or next, left arrow = back, **M = mute/unmute** (sound is ON by default on the stage laptop, so test the speakers before the session), F = full screen. Flow: "Did we move?" > return rate > "shifted on X of 5" > each statement (smallest shift first, biggest mover last: statement, THEN, drum-roll, NOW) > stories (if any vetted) > close. If the Wi-Fi dies, the downloaded file still works.
7. If the freeze looks wrong: fix data, freeze again. `/stage/final?prev=1` is the previous snapshot.

## Lost number
`/admin/lookup`: search by name or email (min 3 characters). Read the number to the person. Do not read out anyone else's details.
After 2 failed tries on Day 3 a person can continue as **post-only**. They are reported separately.

## After (within 48h)
`/admin/report` prints the one-page report. Share only `/admin/export/aggregate.csv` with organisers. **Never** share the private CSV.

## If something breaks
| Problem | Do |
|---|---|
| Emails not arriving | Number is still on screen. `/admin` > Retry unsent emails. Desk lookup covers the rest. |
| Wi-Fi down on stage | Use the downloaded snapshot .html. Run hands/colour cards. |
| Low return rate | Show Day 3 alone (slide says so), run live hand votes, say it openly. |
| Admin locked out | Check `ADMIN_PASSWORD` env var. Admin is disabled if it is unset. |

## Wording rules for the report and the stage
"Measured shift across the event." Never "caused". Self-selected, directional, not statistical.
