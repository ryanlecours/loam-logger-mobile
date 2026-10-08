# Changelog

All notable changes to the Loam Logger mobile app, newest first.

Each release leads with its **App Store "What's New"** copy — the text that
goes into App Store Connect — followed by an optional **Internal** section for
dev-facing changes that don't belong in store copy.

> **Backfill note:** entries for 1.0.4–1.0.6 were reconstructed from git history
> after the fact, so their wording is a summary rather than the exact App Store
> copy used at the time. Dates are the version-bump commit dates. From 1.0.7
> onward, the "What's New" section is the copy actually submitted.

## 1.3.1 - 2026-10-08

### App Store "What's New"

Improved
- Looks Good now logs an inspection. Pick how many more hours the part is good
  for (half its service interval is suggested), and the next service you log
  ends the extension
- Undo after Looks Good now removes the inspection completely
- A part's logbook shows how many more hours each inspection gave it

### Internal

Inspection copy and undo
- The API turned `snoozeComponent` into "log an inspection" (loam-logger #332):
  it writes an `INSPECTION` service log instead of raising `serviceDueAtHours`.
  `ComponentActionSheet`, `ComponentDetailSheet` and the calibration sheet now
  say so ("Good for Nh more", "Inspection logged").
- The suggested hours come from the prediction's `recommendedExtensionHours`,
  falling back to half of `serviceIntervalHours`. Previously the action sheet
  offered the full interval and the detail sheet offered the interval or 50h.
  Custom hours are limited to 1 to 400, the range the server keeps.
- Undo deleted nothing: it wrote `serviceDueAtHours` back, which left the
  inspection in place and, from the action sheet, saved the predicted interval
  as a custom override. Undo now calls `deleteServiceLog` on the new inspection,
  whose id comes back in the `snoozeComponent` response.
- The component history logbook appends ", good for Nh more" to inspections,
  from `serviceEvents.serviceExtensionHours`, as the web logbook does. The
  "Inspection: Nh since last check, every Nh" caption is gone: it keyed off
  `Component.inspectionDueAtHours`, which is always null now.
- The Gear and calibration queries no longer request `inspectionStatus`,
  `inspectionIntervalHours`, `hoursSinceInspection`, `inspectionHoursRemaining`
  or `limitingClock`, and the history query no longer requests
  `inspectionDueAtHours` or `hoursSinceInspection`. Nothing read them.
  loam-logger #333 removes the prediction fields and `inspectionDueAtHours`,
  but builds up to 1.3.0 still request them, so the API must keep them until
  those builds age out.

## 1.3.0 - 2026-10-07

### App Store "What's New"

New
- See the whole life of any part. Tap View full history on a component to see
  every bike it has been on, and the hours, rides and distance it picked up on
  each one
- Flip between a part's lifetime totals and its totals since the last service:
  hours, rides, distance and climbing
- Every part gets a logbook of its services and inspections, with the hours it
  had on it at the time
- Pro members can see the weather a part has been ridden in. Conditions are
  shown for the record only and do not change service intervals
- Hours you entered for a part that came to you used are counted in its
  lifetime total, and the history says how many of them there are

### Internal

Component history (PR #85)
- `feat(component)`: a pushed route, `app/component/[id].tsx`, reached from a
  "View full history" row on `ComponentDetailSheet`. `onViewHistory` is
  optional and the row is hidden without it. Backed by the `componentHistory`
  query, which is aggregate-only, so the response stays constant-size for any
  length of history. Depends on the API change (loam-logger #321) being in
  production; the generated types reference `componentHistory`, `priorHours`,
  `lifetimeHours` and `ServiceLogKind`.
- `feat(component)`: hours come from the API's stored counters rather than
  ride-summed tenure totals, because `lifetimeHours` includes `priorHours`
  (hours declared for a part that arrived used), which no ride data can
  reconstruct. Rides, distance and elevation stay ride-derived. The since-
  service tab follows the counter rule: `sinceService` is totalled from
  tenure-bounded rides since the latest service and its hours are the counter,
  so a part that has moved bikes no longer contradicts itself.
  `consistencyWarning` and its banner are gone with the schema field.
- `feat(component)`: conditions are descriptive only, and the screen says so,
  since the service engine is hours-only and a conditions panel beside a
  health badge implies causation by adjacency. The Pro gate is enforced by the
  API, which returns zeroed buckets to free users. The upsell copy says Pro
  unlocks viewing, not recording, because weather is recorded on every ride
  regardless of tier. Bars use a lightness ramp from the neutral and sage
  families, never the health ramp, and are hand-rolled `View`s: mobile has no
  chart library, and adding one is a native dependency and an EAS rebuild.
- `feat(component)`: the logbook labels SERVICE and INSPECTION entries. The
  zero-hour service logs the old model wrote on every install are gone
  server-side, so this screen drops the `hoursAtService > 0` filter that also
  hid a genuine service on a part with no hours. The logbook renders even when
  coverage is `NO_TENURE_DATA`, since a spare can be serviced or inspected
  before it is ever installed.
- `fix(component)`: dates use the device locale, and the condition label and
  count use `minWidth` so they grow under Dynamic Type instead of clipping.
- `chore(graphql)`: prediction selections in `gear.graphql` and
  `calibration.graphql` grew by the two-clock fields, because the generated
  query result is assigned to the full schema type and new required fields
  have to be selected.

Crash reporting (PR #86)
- `fix(sentry)`: production events, including iOS watchdog terminations,
  arrived with release `unknown`, so no crash could be tied to a build or
  symbolicated. The EAS workflow set `EXPO_PUBLIC_SENTRY_RELEASE` on the
  GitHub runner, but `eas build` runs on Expo's servers, which never see the
  runner's environment, so `Sentry.init` always fell back to the literal
  `'unknown'`, overriding the SDK's own default. `release` is now left unset,
  and the SDK reads `bundleId@version+build` from the native build, the same
  release the build phase uploads source maps and debug symbols under using
  the `SENTRY_AUTH_TOKEN` stored in the EAS production environment.

## 1.2.0 - 2026-08-29

### App Store "What's New"

New
- Record a ride right in the app. Start it at the trailhead, lock your phone,
  and it keeps tracking: distance, climbing and time, with a live map of where
  you have been
- Start a recording straight from the dashboard, or jump back into one that is
  already running
- Your route is saved with the ride, so you can look back at where you actually
  went
- Recording pauses itself when you stop moving and picks back up when you ride
  on, so a long stop at the top does not count as ride time
- Climbing is measured with your phone's barometer, the same kind of sensor a
  bike computer uses, instead of GPS altitude alone
- Riding Insights now shows your totals for whichever timeframe you pick: rides,
  time, distance and climbing, plus how your time splits across your bikes
- Assign a batch of unassigned rides to a bike in one pass, chosen by provider
  and date range. You see how many rides and how many hours it will credit
  before you confirm
- E-bikes now track motor and battery hours alongside the rest of your parts
- Choose whether Loam can use AI to write your maintenance summaries, in
  Settings

Improvements
- Bike search shows a photo of each model, so four trim levels of the same bike
  are no longer four identical rows
- The dashboard names your bikes when everything is in good shape, instead of
  leaving the space under the headline empty
- Rides you log without signal are saved on your phone and upload themselves
  once you are back in range
- Stats you share now sit on a panel that keeps them readable over a bright
  photo
- A dropped connection mid-ride no longer signs you out
- Signing out now ends the session on our side too, not just on your phone
- A fresh look for the app icon, splash and sign-in screen

Fixes
- Typing an hours value or a service note no longer leaves the keyboard sitting
  on top of the field. Number pads now get a Done button, so entering a custom
  snooze or editing a note is not a dead end
- Screens no longer draw under the status bar or the home indicator, so a title
  is not hidden behind the clock
- Changing a notification or sync setting no longer reports a failure over a
  change that actually saved

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
- `fix(recording)`: the barometric path was the only altitude path with no
  smoothing on it, and a deadband in front of a one-sided sum has a cliff
  rather than a slope: at 0.3 m of input noise it books nothing, at 0.75 m it
  books hundreds of feet across one descent. The noise is not sensor error,
  which is why the accuracy gates never saw it: airflow over a jersey pocket
  is worth ~3 m of apparent altitude at 8 m/s, hidden inside a climb total
  that is mostly real and fully exposed on a descent where the right answer
  is zero. A ride alongside a Garmin read 2,555 ft against its 1,736 ft, the
  entire difference booked descending. The fused series is now low-passed at
  a ~10 s time constant before the deadband, since buffeting lives at seconds
  and terrain a rider would call a climb lives at tens of seconds.

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

Dashboard and first run (PR #84, plus `685ace8`)
- `feat(dashboard)`: a rider who finishes onboarding used to meet a headline
  over empty space, because triage sorts an unflagged bike into `healthy`,
  healthy bikes get no row, and the "good to go" summary is skipped when the
  headline already says it. All three are right at 300 rides and wrong on day
  one. The all-clear case now renders identity (photo, name, parts under watch)
  instead of silence, a first-run card carries the actions that start the
  clocks, and the Pro card is demoted below them for a rider with no hours to
  sell against.
- `feat(dashboard)`: ride recording is now reachable from the dashboard, which
  is the screen riders open first. It was previously only behind the Rides
  tab's floating button, inside an alert offering two choices, which is three
  taps and a guess away. It appears in the first-run card as a real button
  between connecting an account and typing a ride in by hand, in the
  recent-rides empty state in that same order, and in the recent-rides header
  for everyone else. Connecting stays primary because it backfills a whole
  history at once, where recording only produces the ride about to happen. All
  three flip to "Back to your ride" when a session is live, since the root
  layout re-surfaces the record screen once per liveness and a rider who backed
  out of it lands here mid-ride.

Insights and sharing (PRs #81, #82)
- `feat(insights)`: Riding Insights answered "how consistently, and where" but
  never "how much". `useRideStats` already returned totalRides, totalDistance,
  totalElevation, totalHours and bikeTime for every timeframe; the screen never
  rendered them. No hook, GraphQL or API change. Time by bike waits for a
  second bike, since one bike at 100% is not a breakdown. These four numbers
  appear on the dashboard too, deliberately: two screens each showing its own
  timeframe control right above its own answer is not the two-controls-on-one-
  scroll hazard `RideStatsCard` warns about.
- `fix(share)`: the exported stats overlay was white text on full transparency
  leaning on a text shadow, which outlines letterforms without putting anything
  behind them. Over a white photo it measured 1.06:1, which is not hard to read
  but invisible. It now sits on a forest-tinted obsidian panel at 65% alpha
  with a mint edge-light, the frosted-glass surface DESIGN.md specifies
  elsewhere, taking the worst case to 5.82:1 and a mid-grey photo to 11.52:1.
  The border and radius are doubled from their on-screen values because the
  export renders at roughly 2x phone scale.

Bulk ride assignment (PR #83)
- `feat`: an assign-rides screen for the case a Garmin backfill creates, where
  fixing unassigned rides one row at a time is the wrong shape of work. It
  picks a bike, a provider and a date window and lets the server decide which
  rides that selects, because the list is paginated 20 at a time and anything
  filtering the loaded page would mean "some of my Garmin rides" while looking
  like it meant all of them. The count, the hours credited and the date span
  are previewed and confirmed with both numbers named, since this is not one
  tap reversible and those hours can push components past a service threshold
  in a single move.
- `fix`: `useBulkBikeAssignment` reads ride ids at submit time rather than
  reusing the preview's, writes in bounded chunks, and returns a typed outcome
  (assigned, nothing, partial, failed) so the screen reports what actually
  landed. A server refusal caused by a webhook assigning a bike mid-flight
  retries once against a fresh id list, but only while nothing has committed,
  since re-reading after a chunk lands would double-count progress the rider
  has already seen.

Bike search (PR #84)
- `feat(bike-search)`: search results carry the 99spokes product shot, because
  "Evil Offering" returns four rows separated only by a trim code a secondhand
  buyer may not know, and colorway is the fastest way to tell them apart. The
  API was already fetching the thumbnail and discarding it, so this costs no
  extra call. `BikeThumbnail` gains a `fit` prop: the default crop is right for
  a rider's own bike, but a center crop of a wide catalog shot shows nothing
  but a shock. Results now arrive newest model year first.
- `feat(bike-search)`: onboarding stops offering frame-only listings. A
  frameset carries no fork, drivetrain, brakes or tires from 99spokes, so the
  flow ended on a bike with nothing to track while the next step asked whether
  its nonexistent components were stock. Add Bike keeps them, for a rider who
  really did build one up.
- `fix(bike-search)`: a search result's year is typed as nullable, following
  the API.

Layout and keyboard (PRs #78, #84)
- `fix(ui)`: added `src/components/common/Screen.tsx`, the root element for any
  screen the navigator renders without a native header. Every stack runs
  `headerShown: false` and Android runs `edgeToEdgeEnabled`, so nothing
  reserved the status bar, the notch or the home indicator: onboarding drew its
  title behind the clock, and screens that coped did it with a hard-coded
  `marginTop: 76` that is a guess at one device. `Screen` reads the real OS
  insets and applies them on top of the caller's own padding, with an `edges`
  prop for where something else owns an edge (the tab bar, an autofocused
  keyboard). The two hand-rolled implementations and their magic numbers fold
  into it.
- `fix(ui)`: dropped the background five screens were painting underneath the
  one `Screen` already paints.

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

Settings (PR #80)
- `fix(settings)`: toggling Weekend Bike Check raised "Failed to update
  notification preferences" over a write the API had already committed. PostHog
  has the server-side `user_preferences_updated` event and Sentry has no
  matching error, so the mutation succeeded and only the response was lost
  coming back, leaving the switch disagreeing with the server until next
  launch. `describeSaveError` is the write-side counterpart to `describeError`
  and splits the three outcomes that need different words: a RATE_LIMITED
  rejection reports the server's own `retryAfter` (the limiter caps
  `updateUserPreferences` at 20 a minute, and NODE-7 held one account over that
  cap for four months), a transport failure says the change is uncertain rather
  than failed and sets `resync` so the control settles on what the server
  stored, and anything else is a refusal where nothing changed. Applied to all
  four preference writes.

Release tooling
- `ci(eas)`: the EAS Build workflow runs on Node 22. `eas-version: latest`
  reached eas-cli 23.0.0, whose `@oclif/plugin-autocomplete` requires Node
  >= 22, so installing the CLI on the pinned 20.18.0 runner failed and the job
  died before dispatching a build. The Node the app is compiled with is
  `build.base.node` in eas.json, still 20.18.0 on the EAS worker and
  deliberately unchanged.

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
