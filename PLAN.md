# PLAN

The living plan for ergo. Tick items as they land; add dated lines to the decisions log when direction changes.

## Goal

A personal, installable break-reminder app focused on **eye health** and **posture/movement**:
- Grounded in reputable evidence, with sources kept in `evidence/`.
- Pleasant enough to keep using, with nice UI and meaningful animation.
- Honest tracking that stays private.

Inspired by [pomotimer2](https://github.com/parmsam/pomotimer2) (stack, PWA approach, conventions) and by commercial stretch-break coaching tools (guided exercises, escalation, a score). Unlike those tools, ergo does **no activity monitoring**.

## v0.1.0: foundation ✅

- [x] Two-track engine (eyes, body) derived from timestamps; pause/resume, snooze, skip, done, break-now
- [x] Rules with evidence labels: 20-20-20, 30-30-30, hourly microbreak; 20-8-2, walk 5/30, walk 2/20; custom
- [x] Standing cues with acknowledgment; blink and posture-reset nudges
- [x] Animated break overlay with exercise stepper; corner-card mode
- [x] Coach notes and gentle escalation after repeated skips
- [x] Workstation checklist (sourced) feeding the ergo score
- [x] Progress: score, streak, 7-day charts with table view, break log
- [x] Worker ticks, audio-clock chimes, notifications with actions (SW), away handling
- [x] PWA (offline, install, shortcuts), link actions, keyboard shortcuts, light/dark themes, reduced motion
- [x] Evidence folder with sourced write-ups and a test that enforces sourcing
- [x] Unit + e2e tests; CI and Pages deploy workflows
- [x] README with logo, screenshots and version badge; AGENTS.md; CHANGELOG

## v0.2.0: more evidence-based options ✅

- [x] "3 min active / 30" body rule (Dempsey 2016) with no-equipment strength moves
- [x] Daily sitting budget from the Canadian 24-Hour Movement Guidelines (estimated sitting, chart, coach note)
- [x] Optional exercise-snack nudge (VILPA, Stamatakis 2022), labelled Observational
- [x] Myths section in the Guide (blue-light glasses, 90-90-90, standing desks, permanent eye damage)
- [x] Remove the blink nudge (didn't make physiological sense)
- [x] Fix CI WebKit timeouts so Pages deploys

## v0.3.0 ✅

- [x] "Look around" eye exercise, labelled Mixed evidence, with its own evidence file
- [x] Update GitHub Actions versions (Node 20 deprecation)

## v0.4.0 ✅

- [x] Page icons in the header (top right), replacing the floating bottom bar
- [x] Mobile layout: stacked settings rows, scrollable table, root overflow clip

## v0.5.0 ✅

- [x] Chimes ring through the iPhone silent switch (Audio Session API, held only around each chime)
- [ ] Confirm on a real iPhone: silent switch on, ergo open, a break chime plays

## Next

- [ ] **Work hours schedule:** auto-start and stop on chosen days and times
- [ ] **Pop-out mini timer** (Document Picture-in-Picture, Chromium) that floats over other windows
- [ ] **Weekly review:** compare this week with last, best and worst times of day for skipping
- [ ] **Per-exercise preferences:** hide exercises you can't or won't do; favorites
- [ ] **Break-length nudge:** suggest a longer eye break when eye-break follow-through is high but symptoms persist (user-reported)
- [ ] **Optional symptom check-in** (1–5 eye strain / neck / back at end of day) to see whether habits help *you*. Kept local
- [ ] **Hydration nudge**, if a credible source can justify the framing
- [ ] **Posture-reset interval:** find a source for a reset cadence, or reconsider the nudge (its 15 min is a default)
- [ ] **Localization** of units (ft/m) based on locale
- [ ] **Accessibility audit** with screen readers on the overlay and charts
- [ ] **Evidence review cadence:** re-check sources yearly; track `Last reviewed` dates

## Not doing

- Keyboard/mouse/idle monitoring, camera posture detection, or any telemetry (privacy).
- Accounts or sync servers. Use export/import instead.
- Medical claims or diagnosis.

## Decisions log

- 2026-10-27: Name **ergo** (short for ergonomics, short and memorable). Repo `parmsam/ergo`, served at `/ergo/`.
- 2026-10-27: Stack mirrors pomotimer2: Vite + strict TS, no framework, vite-plugin-pwa with a prompt-to-update flow.
- 2026-10-27: Two independent lanes (eye, body) plus optional nudge lanes. Each is a repeating list of phases (`work` | `cue` | `break`) with an anchor timestamp.
- 2026-10-27: **Honor system by default.** A break that runs out without Skip counts as done, because you're supposed to be looking away, not clicking. It can be switched off so only breaks seen in ergo count.
- 2026-10-27: A finished body break restarts the eye timer (you looked away while moving). On by default.
- 2026-10-27: **No activity monitoring** (user decision). Idle Detection was considered for crediting natural pauses and rejected for privacy. The only away signal is a gap in ergo's own ticks (laptop asleep), which counts as a break and restarts cycles.
- 2026-10-27: Evidence labels are honest. 20-20-20 is "Mixed": a reminders trial helped short-term, but the specific numbers are debated. 30-30-30 is "Expert guidance": no trials found. No schedule is rated "Strong".
- 2026-10-27: Ticks run in a Web Worker and chimes are scheduled on the AudioContext clock, to survive background-tab throttling.
- 2026-10-27: The ergo score is 40% eye follow-through, 40% body follow-through and 20% workstation setup, reweighted when a part has nothing to measure.
- 2026-10-27 (v0.2.0): **No invented numbers.** Intervals and thresholds need a source and must make physiological sense; unavoidable defaults are labelled as defaults. The blink nudge (every 10 min) was removed under this rule, since people normally blink 15–20 times a minute.
- 2026-10-27 (v0.2.0): Sitting is estimated as running time minus body breaks and confirmed standing. It undercounts sitting away from the computer, and the UI says so.
- 2026-10-27 (v0.2.0): Exercise snacks are off by default and kept out of the ergo score; the evidence is observational, and vigorous effort isn't for everyone.
- 2026-10-27 (v0.5.0): Silent-switch audio follows pomotimer2: "playback" session only around each chime (2.5 s before to 2.5 s after), then "auto", so music isn't paused for the whole workday. Switching happens on the tick loop, which runs whenever ergo is on screen; iOS suspends it in the background anyway.
- 2026-10-27 (v0.3.0): Eye movement exercises are offered only as one optional step in eye breaks, labelled Mixed evidence. No dedicated reminder, and no claims about vision correction.
- 2026-10-27 (v0.2.0): Linux WebKit e2e runs with reduced motion; continuous animations plus slow CI rendering kept elements from settling.

## Reference notes

- Commercial stretch-break coaching tools (e.g. Wellnomics) combine guided exercises, sit-stand prompts, escalation on repeated skips, a live wellbeing score and ergonomic tips. ergo adopts the coaching ideas but not their keyboard/mouse activity monitoring.
