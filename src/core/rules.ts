import type { Focus, NudgeId, Phase, Rule, Settings, Strength, TrackId } from './types';

const MIN = 60;

export const EYE_RULES: Rule[] = [
  {
    id: '20-20-20',
    track: 'eye',
    name: '20-20-20',
    tagline: 'Every 20 min, look 20 ft away for 20 s',
    summary:
      'The most widely recommended habit for digital eye strain. Relaxes focusing effort and prompts fuller blinks. Reminders helped symptoms in a 2023 trial, though the exact numbers are debated.',
    phases: [
      { kind: 'work', sec: 20 * MIN, label: 'Screen time' },
      { kind: 'break', sec: 20, label: 'Look far', prompt: 'Look at something about 20 ft (6 m) away', focus: 'far' },
    ],
    strength: 'limited',
    evidence: '20-20-20-rule',
  },
  {
    id: '30-30-30',
    track: 'eye',
    name: '30-30-30',
    tagline: 'Every 30 min, look 30 ft away for 30 s',
    summary: 'A gentler-cadence variant with a longer look-away. Fewer interruptions; supported by clinical advice rather than trials.',
    phases: [
      { kind: 'work', sec: 30 * MIN, label: 'Screen time' },
      { kind: 'break', sec: 30, label: 'Look far', prompt: 'Look at something about 30 ft (9 m) away', focus: 'far' },
    ],
    strength: 'expert',
    evidence: '30-30-30-rule',
  },
  {
    id: 'micro-5-60',
    track: 'eye',
    name: 'Hourly microbreak',
    tagline: 'Every 55 min, a 5 min screen-off break',
    summary:
      'Based on NIOSH field studies: adding a 5 min break to each hour lowered eyestrain and body discomfort with no loss of productivity.',
    phases: [
      { kind: 'work', sec: 55 * MIN, label: 'Screen time' },
      { kind: 'break', sec: 5 * MIN, label: 'Screen off', prompt: 'Step away from screens: look far, blink, rest your eyes', focus: 'eyes' },
    ],
    strength: 'moderate',
    evidence: 'microbreaks',
  },
];

export const BODY_RULES: Rule[] = [
  {
    id: '20-8-2',
    track: 'body',
    name: '20-8-2',
    tagline: 'Sit 20 min, stand 8 min, move 2 min',
    summary:
      'Cornell ergonomist Alan Hedge’s half-hour rhythm for sit-stand desks: about 16 posture changes a day, 2 h standing, 30 min moving. Neither all-day sitting nor all-day standing.',
    phases: [
      { kind: 'work', sec: 20 * MIN, label: 'Sitting' },
      { kind: 'cue', sec: 8 * MIN, label: 'Standing', prompt: 'Stand up and keep working standing for 8 min', focus: 'stand' },
      { kind: 'break', sec: 2 * MIN, label: 'Move', prompt: 'Move for 2 min: walk, stretch, shake it out', focus: 'stretch' },
    ],
    strength: 'expert',
    evidence: '20-8-2-sit-stand-move',
  },
  {
    id: 'walk-5-30',
    track: 'body',
    name: '5 min walk / 30',
    tagline: 'Every 30 min of sitting, walk 5 min',
    summary:
      'In a 2023 Columbia trial this was the only schedule (of five) that improved both blood sugar and blood pressure versus sitting all day.',
    phases: [
      { kind: 'work', sec: 30 * MIN, label: 'Sitting' },
      { kind: 'break', sec: 5 * MIN, label: 'Walk', prompt: 'Light walk for 5 min: hallway, stairs, around the room', focus: 'walk' },
    ],
    strength: 'moderate',
    evidence: 'walking-breaks',
  },
  {
    id: 'walk-2-20',
    track: 'body',
    name: '2 min walk / 20',
    tagline: 'Every 20 min of sitting, walk 2 min',
    summary: 'Short, frequent light-walking bouts lowered post-meal glucose and insulin versus uninterrupted sitting (Dunstan 2012).',
    phases: [
      { kind: 'work', sec: 20 * MIN, label: 'Sitting' },
      { kind: 'break', sec: 2 * MIN, label: 'Walk', prompt: 'Light walk for 2 min', focus: 'walk' },
    ],
    strength: 'moderate',
    evidence: 'walking-breaks',
  },
  {
    id: 'active-3-30',
    track: 'body',
    name: '3 min active / 30',
    tagline: 'Every 30 min, 3 min of walking or simple strength moves',
    summary:
      'Half-squats, calf raises and knee raises, or a light walk. In a 2016 trial, 3 min every 30 min improved blood sugar versus sitting; the strength moves also lowered triglycerides. No equipment, no need to leave your desk.',
    phases: [
      { kind: 'work', sec: 30 * MIN, label: 'Sitting' },
      { kind: 'break', sec: 3 * MIN, label: 'Get active', prompt: '3 min: half-squats, calf raises, knee raises, or a brisk walk', focus: 'active' },
    ],
    strength: 'moderate',
    evidence: 'walking-breaks',
  },
];

export const NUDGES: Record<NudgeId, { name: string; prompt: string; focus: Focus; evidence: string; strength: Strength }> = {
  posture: {
    name: 'Posture reset',
    prompt: 'Shift position: drop your shoulders, ease your head back, feet flat',
    focus: 'posture',
    evidence: 'posture-variety',
    strength: 'expert',
  },
  snack: {
    name: 'Exercise snack',
    prompt: 'One vigorous minute: take the stairs fast, walk briskly uphill, or carry something heavy',
    focus: 'active',
    evidence: 'exercise-snacks',
    strength: 'observational',
  },
};

export const STRENGTH_LABEL: Record<Strength, string> = {
  strong: 'Strong evidence',
  moderate: 'Trial evidence',
  observational: 'Observational',
  limited: 'Mixed evidence',
  expert: 'Expert guidance',
};

export const EVIDENCE_BASE = 'https://github.com/parmsam/ergo/blob/main/evidence/';
export const evidenceUrl = (slug: string) => `${EVIDENCE_BASE}${slug}.md`;

/** Drop zero-length phases so a custom rule with "stand 0 min" simply has no standing phase. */
const clean = (phases: Phase[]) => phases.filter((p) => p.sec > 0);

export function customEyeRule(s: Settings): Rule {
  const { workMin, breakSec } = s.custom.eye;
  return {
    id: 'custom-eye',
    track: 'eye',
    name: 'Custom',
    tagline: `Every ${workMin} min, look away for ${breakSec} s`,
    summary: 'Your own cadence.',
    phases: clean([
      { kind: 'work', sec: Math.max(1, workMin) * MIN, label: 'Screen time' },
      { kind: 'break', sec: Math.max(5, breakSec), label: 'Look far', prompt: 'Look at something far away', focus: 'far' },
    ]),
    strength: 'expert',
    evidence: '20-20-20-rule',
  };
}

export function customBodyRule(s: Settings): Rule {
  const { sitMin, standMin, moveMin } = s.custom.body;
  const parts = [`sit ${sitMin}`, standMin > 0 ? `stand ${standMin}` : '', `move ${moveMin}`].filter(Boolean);
  return {
    id: 'custom-body',
    track: 'body',
    name: 'Custom',
    tagline: parts.join(', ').replace(/^s/, 'S') + ' min',
    summary: 'Your own sit / stand / move rhythm.',
    phases: clean([
      { kind: 'work', sec: Math.max(1, sitMin) * MIN, label: 'Sitting' },
      { kind: 'cue', sec: standMin * MIN, label: 'Standing', prompt: `Stand up and work standing for ${standMin} min`, focus: 'stand' },
      { kind: 'break', sec: Math.max(1, moveMin) * MIN, label: 'Move', prompt: `Move for ${moveMin} min`, focus: 'stretch' },
    ]),
    strength: 'expert',
    evidence: '20-8-2-sit-stand-move',
  };
}

/** A track can be switched off (rule "off") to run only the other timer. */
export const trackOn = (s: Settings, track: TrackId) => (track === 'eye' ? s.eyeRule : s.bodyRule) !== 'off';

export function ruleFor(s: Settings, track: TrackId): Rule {
  if (track === 'eye') return s.eyeRule === 'custom-eye' ? customEyeRule(s) : (EYE_RULES.find((r) => r.id === s.eyeRule) ?? EYE_RULES[0]);
  return s.bodyRule === 'custom-body' ? customBodyRule(s) : (BODY_RULES.find((r) => r.id === s.bodyRule) ?? BODY_RULES[0]);
}

/** A nudge is a lane with one long work phase and a short cue. */
export function nudgePhases(id: NudgeId, everyMin: number): Phase[] {
  const n = NUDGES[id];
  return [
    { kind: 'work', sec: Math.max(1, everyMin) * MIN, label: n.name },
    // A snack cue spans the vigorous minute itself; other cues are a brief prompt.
    { kind: 'cue', sec: id === 'snack' ? 60 : 15, label: n.name, prompt: n.prompt, focus: n.focus },
  ];
}
