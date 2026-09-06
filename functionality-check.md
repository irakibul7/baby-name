# Baby Bloom functionality check — 2026-09-06

## Passed in the browser

- Existing user session reconnects and loads the family count and user-added names.
- Search returns an existing name; selecting it clears search and selects the card.
- Member dialog loads the member list, shows You, and hides Admin badges.
- Dialog keyboard focus stays inside; Escape closes and restores focus.
- Name Lab heritage selection and Generate another change the displayed suggestion.
- Poll form rejects blank and case-insensitive duplicate names without publishing.
- Shortlist loads the existing boy finalist and shows an empty girl shortlist.
- Invite dialog shows the expected `/join/8H2K` URL; Copy reports success when the browser API resolves. Independent clipboard-content verification was inconclusive because the automation clipboard returned an older value.
- Existing multi-line name card inspected at 320x568, 390x844, and 1280x900. No horizontal page overflow at these sizes.
- Empty add-name submission now shows an explicit error.

## Passed in isolated PostgreSQL

`npm run test:admins` applies the actual migrations in PGlite with stubbed Supabase Auth:

- Name creation, editing, and case-insensitive duplicate handling.
- Favorite/pass persistence.
- Poll creation, option linking, invalid duplicate rejection, voting, duplicate-vote rejection.
- Final name selection, invalid gender rejection, reopening the shortlist.
- Cross-family read and write restrictions.
- Admin role check; ordinary members cannot grant themselves admin or remove others.
- Admin name deletion and member removal; self-removal denied.
- Removed membership loses access and cannot rejoin with the same account.

## Build and hosting

- Production build passed.
- All four Sites tests passed.
- `git diff --check` passed.
- Existing build warning: main JavaScript chunk exceeds 500 kB minified.

## Fixes made during this check

- Empty name submission now explains what is required.
- Added input length limits matching database limits for name, native script, and meaning.
- Clipboard unavailable/rejected errors no longer report false success; the invite URL is selectable for manual copying.
- Copy feedback resets on reopening the invite dialog.
- Add-name errors clear on dismissal and do not duplicate behind the dialog.

## Coverage limits

No live family names, votes, polls, or memberships were created/deleted for this test. Successful write flows were tested at the database layer, not end-to-end through the live UI. New-user onboarding, real two-device Realtime delivery, Rakib's own admin browser session, drag gestures, clipboard permission-denial behavior, and real Safari/device behavior were not fully exercised. This is not a claim that every production scenario is verified. Admin identity remains tied to the existing anonymous browser account.
