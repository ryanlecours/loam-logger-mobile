# Changelog

All notable changes to the Loam Logger mobile app, newest first.

Each release leads with its **App Store "What's New"** copy — the text that
goes into App Store Connect — followed by an optional **Internal** section for
dev-facing changes that don't belong in store copy.

> **Backfill note:** entries for 1.0.4–1.0.6 were reconstructed from git history
> after the fact, so their wording is a summary rather than the exact App Store
> copy used at the time. Dates are the version-bump commit dates. From 1.0.7
> onward, the "What's New" section is the copy actually submitted.

## 1.1.1 - 2026-07-30

### App Store "What's New"

Improvements
- Syncing previous rides from Garmin now lets you choose the last 7, 14 or 30
  days instead of pulling the whole season
- You can run a Garmin sync again to pick up rides recorded since the last one

### Internal
- `feat(garmin)`: the import sheet offers real rolling windows (`7d`/`14d`/
  `30d`). The single option it had, labeled "Last 30 Days", sent `ytd`, which
  the API expanded to Jan 1 through now. Windows nest, so the sheet takes one
  choice and the sync button names it.
- A finished run no longer locks a window: re-running one is how a rider picks
  up rides recorded since. The completed checkmark is now reserved for closed
  spans, where it means something.
- Fixes a Pro lock that would have caught every window on a free account:
  `parseInt('7d')` is `7`, which is not the current year, so each window read as
  a past season. Now mirrors the server's `canBackfillYear`.
- Requires the API side (loam-logger#270) for the window keys. It still accepts
  `ytd`, so this build is safe ahead of that deploy, but the windows only
  behave correctly once it lands.
- Maps on backfilled Garmin rides are fixed server-side in loam-logger#271, not
  here. Nothing in this build affects it; affected rides get their track once
  the rider runs a sync covering them after that deploy.

> **Note:** 1.1.0 shipped without an entry in this file.

## 1.0.10 - 2026-07-26

### App Store "What's New"

New: See which Garmin device recorded each ride
Rides synced from Garmin now name the watch or bike computer behind them.
You'll see "Garmin Edge 840" rather than just "Garmin" on your rides list, on
ride detail, and in the rides behind each part's hours.

Improvements
- Garmin Connect now appears with its proper name and app icon wherever you
  connect or switch data sources
- Updated Privacy Policy and Terms with more detail on how Garmin data and
  AI-generated maintenance summaries are handled

### Internal
- Garmin Connect Developer Program production-access compliance, mirroring the
  web app (loam-logger#255). Required before the Garmin production API key is
  granted, which is the gate on marketing.
- `feat(attribution)`: Garmin device-model attribution on ride rows, ride
  detail, and component ride lists, per the Garmin API Brand Guidelines'
  title-level and secondary-screen rules. Falls back to plain "Garmin" when
  Garmin reports no device, which the guidelines permit.
- Ride badges now render *every* contributing provider. A ride matched across
  Strava and Garmin previously showed Strava alone and dropped the Garmin
  attribution entirely. The inverse is equally binding: no Garmin mark renders
  where Garmin contributed nothing.
- `feat(brand)`: the official Garmin Connect app tile replaces the Ionicons
  `watch-outline` glyph that was standing in for the Garmin mark on connect,
  settings and OAuth screens. Full "Garmin Connect™" naming throughout; the
  guidelines forbid abbreviating or stylizing it. Garmin blue moved onto the
  theme token with a lightened on-dark tint for legible small text.
- `docs(legal)`: privacy policy §4a "Garmin Connect Data" (Activity API only,
  no health data, what is collected and what disconnection deletes), Anthropic
  added to the processor list, and Terms §13.1 on machine-generated content
  ported across. Mobile shipped without it despite claiming the same terms
  version, leaving the AI sub-processor undisclosed in-app.
- Attribution strings and legal copy are hand-mirrored from `loam-logger`;
  this repo has no dependency on `@loam/shared`. The files carry `MIRROR`
  notes and must be updated in both repos together.

## 1.0.9 — 2026-07-21

### App Store "What's New"

New: See the rides behind each part's hours
Tap a component to see every ride that adds up to its tracked hours. Swapped a
wheel or fork for a few rides? You can now remove a ride from a part — or apply
a ride from another bike — so each part's hours reflect what you actually rode.

Improvements
- Behind-the-scenes fixes and polish

### Internal
- `feat(gear)`: component ride attribution. New pushed route
  `app/component-rides/[componentId]` with Counted-rides (Remove/Restore =
  EXCLUDE/clear) and Add-rides (Apply = INCLUDE, with search + date filter)
  tabs, opened from a "View rides behind these hours" action on
  `ComponentDetailSheet`. Per-row in-flight tracked with a `Set` (no cross-row
  double-submit); no optimistic updates — refetch `ComponentRides` + `Bike`
  after each change.
- Client-only port: reuses the shared `componentRides` query and
  `set`/`clearComponentRideAdjustment` mutations (new `componentRides.graphql`
  + codegen). No backend changes.

## 1.0.7 — 2026-07-16

### App Store "What's New"

New: AI Maintenance Summary
Bikes that are due for service now show a short, plain-English summary of what
needs attention — so you can see what to work on before your next ride at a
glance. Summaries are generated by AI and clearly labeled. Available to Pro
riders.

Improvements
- More accurate, reliable maintenance status on the bike screen
- Behind-the-scenes fixes and polish

### Internal
- `fix(cache)`: normalize `BikePredictionSummary` + `ComponentPrediction` in the
  Apollo cache to prevent partial-write clobbering (the separate advisor-summary
  fetch merging into, not overwriting, the core predictions).
- `observability(advisor)`: report unexpected client-side advisor query errors
  to Sentry.

## 1.0.6 — 2026-07-14

### App Store "What's New"

- Free riders now see a simple service status (ready to ride vs. needs service)
  on each bike, with an easy path to upgrade for full predictions.
- Ride-import fixes: importing the current year is no longer Pro-locked, and the
  year picker no longer lists duplicate years.

### Internal
- Shared `formatComponentType` helper extracted for consistent component labels.
- Bike-limit messaging reuses the shared upsell copy.

## 1.0.5 — 2026-07-06

### App Store "What's New"

- New Pro upsell experience with clearer Pro gating and a shareable signup link.
- Deeper ride-import history for Pro riders.
- Simplified plans down to a single Free tier.
- Removed the referral program.

## 1.0.4 — 2026-07-06

Maintenance release: version bump and release-pipeline preparation. No
user-facing changes.
