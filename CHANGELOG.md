# Changelog

All notable changes to the Loam Logger mobile app, newest first.

Each release leads with its **App Store "What's New"** copy — the text that
goes into App Store Connect — followed by an optional **Internal** section for
dev-facing changes that don't belong in store copy.

> **Backfill note:** entries for 1.0.4–1.0.6 were reconstructed from git history
> after the fact, so their wording is a summary rather than the exact App Store
> copy used at the time. Dates are the version-bump commit dates. From 1.0.7
> onward, the "What's New" section is the copy actually submitted.

## Unreleased

### App Store "What's New"

Fixes
- Typing an hours value or a service note no longer leaves the keyboard sitting
  on top of the field. Number pads now get a Done button, so entering a custom
  snooze or editing a note is not a dead end

### Internal

Keyboard handling
- `fix(ui)`: extracted the bottom-sheet scaffold every sheet was hand-rolling
  (scrim, slide-up card, handle, safe-area padding) into
  `src/components/common/BottomSheet.tsx`, and wrapped it in a
  `KeyboardAvoidingView`. A sheet is bottom-anchored by definition, so the
  keypad rose into exactly the band holding the inputs and the action footer.
  An inner ScrollView cannot rescue a footer that is its sibling, so Save,
  Apply and Delete were unreachable. Adopted by `ComponentDetailSheet`,
  `ComponentActionSheet`, `EditServiceSheet` and `ReplaceComponentSheet`, which
  are the four sheets carrying text fields. The extraction is pixel-preserving:
  the scrim value and the off-scale 20pt corner radius were carried over as-is
  rather than moved onto `colors.scrim` and the radius scale, which is a design
  decision and not part of a bug fix.
- `fix(ui)`: a scrim tap while a field is focused now dismisses the keyboard
  instead of closing the sheet. It used to close and discard whatever had been
  typed, which mattered because it was also the only dismissal gesture
  available to a numeric field.
- `fix(ui)`: added `src/components/common/KeyboardDoneAccessory.tsx`, an iOS
  `InputAccessoryView` carrying a Done button. iOS renders `number-pad` and
  `decimal-pad` as a bare 10-key with no return key, so the
  `returnKeyType="done"` on the service-interval field was silently inert.
  Wired into every field on the sheets above plus the ride add/edit,
  save-recording, add-bike, onboarding bike and age, service-reminder and
  component-rides screens. Renders nothing on Android, where the system back
  gesture already dismisses.
- `fix(ui)`: the full-screen forms had no keyboard handling at all. Ride
  add/edit, save-recording and service reminders now set
  `automaticallyAdjustKeyboardInsets` (iOS pads the scroll insets and scrolls
  the focused field into view; Android's `adjustResize` already covers it),
  plus `keyboardShouldPersistTaps="handled"` and an interactive dismiss.
  Add-bike and the onboarding steps already had a `KeyboardAvoidingView` and
  only needed the persist-taps and the Done bar.

## 1.2.0 - 2026-08-19

### App Store "What's New"

New
- Record a ride right in the app. Start it at the trailhead, lock your phone,
  and it keeps tracking: distance, climbing and time, with a live map of where
  you have been
- Your route is saved with the ride, so you can look back at where you actually
  went
- Recording pauses itself when you stop moving and picks back up when you ride
  on, so a long stop at the top does not count as ride time
- Climbing is measured with your phone's barometer, the same kind of sensor a
  bike computer uses, instead of GPS altitude alone
- E-bikes now track motor and battery hours alongside the rest of your parts
- Choose whether Loam can use AI to write your maintenance summaries, in
  Settings

Improvements
- Rides you log without signal are saved on your phone and upload themselves
  once you are back in range
- A dropped connection mid-ride no longer signs you out
- Signing out now ends the session on our side too, not just on your phone
- A fresh look for the app icon, splash and sign-in screen

### Internal

Recording (PRs #69, #70, #72, #73, #77)
- `feat(recording)`: in-app GPS recording, built in phases. Phase 1 was a
  foreground `watchPositionAsync` loop; phase 2 moved to a background location
  task with a crash-safe SQLite buffer, so a lock, an app switch or an OS
  jettison no longer loses a ride. `restoreIfNeeded()` rebuilds an interrupted
  session on next launch, deliberately PAUSED, because the recorder cannot know
  whether the rider kept riding while the process was dead.
- `fix(recording)`: concurrent `restoreIfNeeded` callers now share one in-flight
  promise. The background task and the layout effect can race on the same
  launch, and the slower one was stomping whatever happened in between,
  including a Resume the rider had just tapped.
- `feat(recording)`: live map on the record screen, route line plus position
  dot, fed from accuracy-accepted fixes only so the drawn line agrees with the
  distance total. A chunk-boundary bug that left a permanent gap in the line is
  fixed.
- `feat(recording)`: elevation now comes from the barometer, fused with GPS
  through a complementary filter. The previous accumulator summed raw GPS
  altitude and let its anchor follow every downward sample with no threshold,
  so each noise trough became a lower launchpad and every wobble cycle booked
  its amplitude as climb. On a real 8.4 mi ride that reported 4,002 ft against
  a Fenix 8's 1,532 ft. The deadband is now symmetric and the band travels with
  the reading, so a barometer dropout falls back to smoothed GPS and a wider
  band rather than re-inflating. Verified against a synthetic ride with a known
  gain: within 5% on the barometer, within 10% on GPS alone.
- `feat(recording)`: auto-pause, ours rather than CoreLocation's.
  `pausesUpdatesAutomatically` stops delivering updates and is unreliable about
  resuming, which can cost a rider the back half of a ride. Motion is judged
  from net displacement over a trailing window (net, not summed path length,
  which is the quantity jitter inflates), with two thresholds to stop flapping.
  This changes what duration means for in-app rides: moving time, matching what
  a provider-synced ride reports, so component hours stop accruing while the
  bike is stationary.
- `feat(recording)`: the per-point track is uploaded with the ride and stored
  server-side as a `RideStream`, which puts in-app recordings on the ride-track
  map and through lift detection like any synced ride, and makes their
  elevation re-derivable rather than frozen at whatever the phone computed.
  Requires the matching API change to be deployed first.
- `fix(recording)`: several correctness fixes gathered along the way: the (0,0)
  no-fix sentinel is dropped entirely, the start coordinate waits for an
  accuracy-accepted fix, Discard is inert during an in-flight save, Android
  hardware back is intercepted on the record and save screens, keep-awake is
  held only while a session is live, and Android location permissions the
  recorder needs are unblocked.

Offline and auth (PRs #67, #71)
- `feat(offline)`: a durable AddRide outbox and a persisted Apollo cache, both
  on SQLite, so a ride logged out of signal survives a cold start and uploads
  itself later. HTTP-layer 429 and 408 now retry instead of parking the row as
  failed, and a modulo pagination gate that the dedup fix broke is removed.
- `fix(web)`: Metro now bundles `expo-sqlite`'s wasm for the web export, which
  is a bundling smoke test rather than a shipped surface.
- `fix(auth)`: transient auth failures no longer log a rider out mid-ride. The
  ME retry backs off, reports, covers 403, and is one-shot so the timer and the
  connectivity listener cannot double-fire.
- `feat(auth)`: logout revokes the server-side session rather than only
  clearing local tokens.
- `feat(settings)`: an AI maintenance summary opt-in toggle, default off.

Growth and brand (PRs #66, #74)
- `feat(growth)`: Pro value surfaced at gated touchpoints with unified gating
  visuals. The predictions upsell re-arms per part rather than once globally,
  the PDF upsell uses session-only dismissal, and the re-arm math is extracted
  and unit-tested.
- `fix(gear)`: `ReplaceComponentSheet` resets its form state when left via
  Upgrade, instead of carrying it into the next open.
- `copy`: new sign-in line, obsidian splash and icon backgrounds.

E-bike (PR #75)
- `feat(gear)`: MOTOR and BATTERY render in their own E-bike group on bike
  detail rather than falling through to Other. Both are hours-only on the API
  side, so they show hours and no health status, and no service interval.

## 1.1.4 - 2026-08-05

### App Store "What's New"

New
- Rides that sync without a bike now say so on the ride list, and you can pick
  the bike right from the ride instead of hunting for it
- The dashboard tells you how many rides are still waiting on a bike, and taps
  through to just those rides. Until a ride has a bike, its hours are not
  counted toward any part's wear
- Rode a demo, a loaner or a rental? Mark it "Not my bike" and it stops asking
- Choose how ride sync alerts behave: every ride, only rides that need your
  attention, or off
- Weekend Bike Check (Pro): one Friday-morning summary of every bike, so you
  know what needs a wrench before you plan the weekend
- Several rides syncing at once now send one notification instead of a pile

Improvements
- Assigning rides to a bike now warns you right away if that pushed a part
  past its service window, instead of waiting for your next ride
- Signing out now stops notifications for that account on this device
- The notifications switch in Settings updates as soon as you grant
  permission in system settings

### Internal
- `feat(rides)`: the ride-detail bike picker now shows for any unassigned ride.
  It was gated on arriving from the "Which bike did you ride?" push
  (`action=pickBike`), and nothing in the app produced that param, so a missed
  or dismissed notification stranded the ride: the list row rendered nothing
  (the bike slot is gated on a truthy name) and the detail screen hid its bike
  section outright. The deep link still works, it just no longer has to be the
  way in. `pickerDismissed` became `justAssigned`, since only a successful
  assignment ever set it.
- `feat(rides)`: rows carry an "Assign bike" chip when a ride has no bike,
  keyed on `bikeId` rather than a missing bike name so it cannot flash at a
  rider whose bikes have not loaded yet. Not its own touchable: the row already
  navigates to the ride, which now opens onto the picker.
- `feat(dashboard)`: a banner counting rides that need a bike across the whole
  history (server-side `unassignedRideCount`, not derived from the three-ride
  preview), linking to the rides tab filtered to them, with a clear-filter row
  and its own empty state.
- `feat(rides)`: "Not my bike (demo or loaner)" in the detail picker, the edit
  form and the manual add form, mapped to the API's `unownedBike` flag with a
  null bikeId via a shared sentinel. Without it the only ways to clear the new
  prompt were to ignore it forever or to assign a bike that never turned a
  wheel on that ride, which is the one action that corrupts component wear.
  Marked rides drop out of the count and the filter, show "Not my bike" where a
  bike name would sit, and can be changed back from the edit screen. All three
  surfaces offer the answer even with no bikes on the account, since a rider
  with no bikes is exactly the one whose rides sit unassigned; the detail
  picker adapts its copy rather than asking which bike they rode when there
  are none.
- `feat(notifications)`: ride-sync pushes gain a three-mode preference
  (`rideSyncNotificationMode`: all / action-needed / off) rendered as a
  segmented control in Settings. Existing users keep their current behavior
  via migration; new accounts default to action-needed. Older app versions'
  boolean toggle still works through a server-side two-way mapping.
- `feat(notifications)`: Weekend Bike Check digest toggle (Pro-only, hidden
  for free users rather than upsold: a toggle that stores but never sends
  would be a lie). Device timezone now rides along with every push-token
  upload so the digest can land at 8am local.
- `fix(notifications)`: logout unregisters the device's push token
  (best-effort, 3s cap, never prompts for permission) so a shared device
  stops receiving the previous account's pushes. Scoped rather than a blind
  clear: expoPushToken is one column per user, not per device, so the same
  account signed into two devices shares a single slot and whichever
  registers last silently wins it. Logout now sends this device's own
  token to a compare-and-clear mutation that only clears the column if it
  still matches, so logging out on one device can never kill push on a
  different, currently-active device signed into the same account.
- `fix(settings)`: permission status re-checks on app foreground via an
  AppState listener, fixing the stale "off" switch after granting permission
  in system settings.
- `feat(notifications)`: `screen: 'dashboard'` deep-link routing for the
  digest push. Onboarding pitch copy updated to match the action-needed
  default.
- Requires the API changes in loam-logger#289, #291 and #293. Sage
  interactive voice throughout, never the component-health ramp: an
  unassigned or unowned ride is a missing input, not a worn part.

## 1.1.2 - 2026-07-30

### App Store "What's New"

Improvements
- Your riding totals on the dashboard no longer run into each other
- The sync sheet now looks like the rest of the app, and its Done button is a
  proper button again
- Garmin Connect™ is named in full wherever you sync from it

### Internal
- `fix(dashboard)`: the four totals in "Your riding" were laid out at 25% each
  with no column gap, so on a 440pt screen the columns were 94pt wide and
  butted against each other ("175h 24m853 mi"). Two across at 182pt with a
  12pt gutter, matching the two-column stat grids in the component sheets. The
  longest value no longer shrinks to fit either.
- `fix(import)`: the complete step's footer is a child of a centered container
  rather than a sibling of the sheet, so the Done button and its divider hugged
  the word "Done" instead of spanning the sheet. The container stretches now
  and its children center themselves.
- `fix(import)`: the sheet's primary action was the provider's brand color,
  which made it Garmin blue or Strava orange depending on who was connected.
  DESIGN.md's Guest Jersey Rule reserves those colors for the integrations' own
  logos and badges. All chrome speaks sage now, and two off-system literals went
  with it: `#fff` on the button label (banned outright, and the wrong ink on a
  sage fill at 3.37:1) and `#10b981` on the completed checkmark (a stoplight
  green this palette does not contain).
- `fix(garmin)`: the sheet read "Sync Garmin Rides" and "sync rides from
  Garmin". Those name the connection, which the Garmin Developer API Brand
  Guidelines require the unabbreviated app name in, so they read from
  GARMIN_CONNECT_APP_NAME now. Device attribution is a different context and is
  unchanged: rides still credit "Garmin Edge 840" or plain "Garmin". Mirrored on
  web in loam-logger#272, which fixes the same naming in the Settings import
  modal, the admin clear-rides control, and an onboarding label that was missing
  its ™.

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
