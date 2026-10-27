# Changelog

All notable changes to ergo. Versions follow [semver](https://semver.org); the version in `package.json` is shown in the app header and in Settings → About.

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
