# Changelog

All notable changes to ergo. Versions follow [semver](https://semver.org); the version in `package.json` is shown in the app header and in Settings → About.

## [0.6.2] - 2026-10-28

### Fixed
- The tab title keeps its 👁 and 🧍 timers while paused, marked with ⏸, instead of switching to plain "Paused".

## [0.6.1] - 2026-10-27

### Added
- The eye logo in the header blinks every few seconds while reminders are running. Paused or off, it stays open. No blinking with reduced motion.

## [0.6.0] - 2026-10-27

### Added
- **Pop-out mini timer** (Chrome and Edge). A small always-on-top window with both countdowns and Start/Pause. During a break it shows the break with Done and Skip. Press <kbd>P</kbd> or use the header button.
- **Full screen** button in the header (<kbd>F</kbd>), where the browser supports it.
- **One timer only.** Each track's rule now has an **Off** choice, so you can run just the eye timer or just the body timer. Today shows a single centered lane, and the off track's tiles are hidden.

### Notes
- The pop-out and full-screen buttons are hidden on phones: there's no room, and phones have no pop-out window.

## [0.5.1] - 2026-10-27

### Changed
- **Settings icon is a gear.** The old one looked like a sun and read as a theme toggle.
- Settings: rule dropdowns show the short rule name (no more cut-off text), and the chosen rule's description appears under the label. Every number field now shows its unit.
- Pause and End day are the same size.

### Fixed
- The full-screen break is now opaque. The Today page's own timers used to show faintly behind it.
- Phones: Done, 5 min and Skip fit on one row (keyboard hints are hidden on touch screens), and the break no longer runs off the bottom of the screen.
- Phones: the lane icon no longer squashes, and the evidence badge sits under the rule text instead of squeezing it.

## [0.5.0] - 2026-10-27

### Added
- **Ring when iPhone is silenced** (on by default). On iPhone and iPad (Safari, iOS 17+), chimes now play even with the silent switch on, using Safari's Audio Session API. ergo switches to "playback" only from just before each chime until just after, then hands audio back, because holding playback mode can pause other audio such as music.

### Notes
- iOS still suspends web apps in the background, so chimes only play while ergo is open on screen. System notification sounds follow iOS's own silent and Focus settings; a web app can't override them.

## [0.4.0] - 2026-10-27

### Added
- **Page icons in the header** (top right) for Today, Progress, Guide and Settings, replacing the floating bottom bar (which covered content on phones).

### Fixed
- Mobile: Settings rows with dropdowns now stack so long option text doesn't squeeze them; the Progress table scrolls inside its card; and horizontal overflow is clipped at the root so pages can't appear zoomed out.

## [0.3.0] - 2026-10-27

### Added
- **"Look around" eye exercise** in the eye-break rotation: slow up/down, left/right and diagonal eye movements, then rest. Labelled **Mixed evidence**: small, low-quality studies and a yoga trial (Telles 2006) report less eye fatigue, but nothing isolates eye movements. Evidence in `evidence/eye-movement-exercises.md`.
- Exercises can carry their own evidence label and link in the Guide.
- **Expand all / Collapse all** for each area of the exercise library.

### Fixed
- Today: the Pause menu opened upward, off the top of the screen, so its options couldn't be seen or picked. It now opens downward.
- Today: choosing a pause option, Resume or End day didn't update the controls (no Resume button appeared after pausing) until something else redrew the page.
- Guide: double-clicking an exercise card could leave a stale painted block behind. Cards no longer stretch their row-mates, the view's entry animation no longer holds a composited layer, and card titles aren't text-selected on double-click.

### Changed
- CI and deploy workflows use current GitHub Actions versions (checkout/setup-node/upload-artifact v7, upload-pages-artifact/deploy-pages v5), clearing the Node 20 deprecation warning.

## [0.2.0] - 2026-10-27

### Added
- **"3 min active / 30" body rule** (Dempsey 2016): every 30 min, 3 min of half-squats, calf raises, knee raises, glute squeezes or a walk. Includes new no-equipment exercises.
- **Daily sitting budget** (Canadian 24-Hour Movement Guidelines: 8 h or less):
  - A "Sitting (est.)" tile on Today, and a sitting chart with a budget line on Progress.
  - A coach note near the limit.
  - Configurable; 0 hides it.
- **Exercise snack nudge** (Stamatakis 2022): an optional vigorous minute every 2 h, with "Did it" logging and a tile on Today.
- **Myths** in the Guide: blue-light glasses, 90-90-90 posture, "a standing desk solves sitting", "screens permanently damage eyes".
- New **Observational** evidence label for cohort-study findings.
- Evidence: `sitting-budget.md`, `exercise-snacks.md`, `blue-light-glasses.md`; Dempsey 2016 added to `walking-breaks.md`; Nosch 2015 added to `blinking-dry-eye.md`; the 90-90-90 myth added to `posture-variety.md`.

### Changed
- Standing time you confirm is recorded and subtracted from estimated sitting.
- "I'm standing" and "Did it" also work for 10 minutes after a cue ends.
- Settings label nudge intervals as defaults rather than researched numbers.
- Lighter rendering (no full-screen blur filters on the background or cards) for smoother performance on slower devices.

### Removed
- **The blink nudge.** People normally blink 15–20 times a minute, so a reminder every few minutes didn't address the real problem (fewer, incomplete blinks during screen use). Blinking stays in eye-break exercises and dry-eye tips.

### Fixed
- CI: end-to-end tests timed out in Linux WebKit, which blocked the first Pages deploy.

## [0.1.0] - 2026-10-27

First release.

### Added
- **Eye and body tracks** running side by side, derived from timestamps (no drift), with phase timelines.
- **Rules**:
  - Eyes: 20-20-20, 30-30-30, and the hourly NIOSH microbreak.
  - Body: 20-8-2 sit/stand/move, 5 min walk every 30, and 2 min walk every 20.
  - Custom rules for both tracks.
- **Evidence:** every rule labeled with its evidence strength and linked to sourced write-ups in `evidence/`.
- **Break overlay:** animated visuals, a guided exercise stepper (14 exercises), Done / Snooze / Skip, and a corner-card mode.
- **Standing cues** with "I'm standing" logging.
- **Nudges:** blink and posture-reset.
- **Coaching:** a daily coach note and gentle escalation after repeated skips.
- **Workstation checklist:** 12 sourced items.
- **Progress:** daily ergo score, streak, 7-day charts (with a table view), and a break log.
- **Alerts:** chimes scheduled on the Web Audio clock, and system notifications with Done/Snooze actions.
- **Away handling:** a sleeping laptop counts as a break and restarts the cycles.
- **Pausing:** pause for meetings, with auto-resume.
- **Installable PWA:** offline support, link actions and app shortcuts.
- **Keyboard shortcuts.** Light and dark themes. Reduced-motion support.
- **Data:** JSON backup export and import. No activity monitoring.
