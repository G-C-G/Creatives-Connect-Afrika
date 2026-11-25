# CCA game: event-day runbook (one page)

**Owner of data readiness on Day 3:** ______________ (name one person, rehearse with test data)

## Before launch (Thu 26 Nov)
1. Set env vars: `ADMIN_PASSWORD`, `SESSION_SECRET`, `BASE_URL`, `DB_PATH` (persistent disk), optional `RESEND_API_KEY` + `MAIL_FROM`.
2. Open `/admin` (user: anything, password: `ADMIN_PASSWORD`). Set **Event starts**, **Day 3 opens**, **Day 3 closes** (times are UTC, which equals Accra time).
3. Facts: leave **unverified** unless you have checked the source. Unverified facts are never shown anywhere.
4. 10-person run-through on real phones: time it (target under 5 min), confirm the number shows AND the email arrives (check `/admin` for "unsent"), confirm the magic link opens Day 3.
5. Send organisers the link: `BASE_URL/start`. Door QR: `BASE_URL/door`.
6. **Takes lock on the first stored response. Do not reword them after that.** Test responses count: rehearse on a separate DB (`DB_PATH=./data/rehearsal.db npm run seed-demo`), never the live one.

## Mon 30 Nov (welcome game)
1. Morning: `/admin/icebreaker`. Review the suggestions (most even split, highest strength). Pick two. Save.
2. `/admin/snapshots` > **Freeze icebreaker snapshot**. Download the .html to the stage laptop as a backup.
3. Stage laptop: open `/stage/icebreaker`. Keys: Right/space/click = reveal then next, Left = back, `f` = fullscreen.
4. Volunteers: `/admin/volunteers` (pre-event, per take and side). Hands up first, then reveal the split.

## Day 3 (final game)
1. Form closes automatically at the time you set (1 hour before the slot). Check `/admin` shows it set.
2. At close: `/admin/final` to review. Check n. If matched is very low, say so openly on stage.
3. `/admin/stories`: read each story. Mark **Vetted** then **Use in room**. Only vetted + consented stories can reach the screen.
4. `/admin/volunteers`: pick one who changed their mind and one who did not. Brief them beforehand.
5. `/admin/snapshots` > **Freeze final snapshot**. Open `/stage/final`. Also download the .html (works offline: just double-click it).
6. Slides: 1 headline and return rate, 2 prompt then reveal (cards up first), 3 stories. If the Wi-Fi dies, the downloaded file still works.
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
