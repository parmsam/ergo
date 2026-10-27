# Changelog

All notable changes to ergo. Versions follow [semver](https://semver.org); the version in `package.json` is shown in the app header and in Settings → About.

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
