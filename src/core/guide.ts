/** Workstation and habit recommendations. Every item cites a file in evidence/. */

export interface CheckItem {
  id: string;
  group: 'Screen' | 'Eyes' | 'Chair & desk' | 'Habits';
  text: string;
  detail: string;
  evidence: string;
}

export const CHECKLIST: CheckItem[] = [
  {
    id: 'screen-distance',
    group: 'Screen',
    text: 'Screen about an arm’s length away',
    detail: 'AAO suggests about 25 in (64 cm); OSHA gives 20–40 in (50–100 cm). Too close makes your eyes work harder; too far makes you lean in.',
    evidence: 'workstation-setup',
  },
  {
    id: 'screen-height',
    group: 'Screen',
    text: 'Top of the screen at or slightly below eye level',
    detail: 'So your gaze falls slightly downward. A downward gaze also exposes less of the eye surface, which helps with dryness.',
    evidence: 'workstation-setup',
  },
  {
    id: 'glare',
    group: 'Screen',
    text: 'No glare: screen side-on to windows',
    detail: 'Place the monitor perpendicular to windows, and use blinds or a matte filter if reflections persist.',
    evidence: 'workstation-setup',
  },
  {
    id: 'brightness',
    group: 'Screen',
    text: 'Brightness matched to the room, text large enough',
    detail: 'A screen much brighter or darker than its surroundings is harder on the eyes. Bump up text size and contrast rather than leaning in.',
    evidence: 'workstation-setup',
  },
  {
    id: 'dry-air',
    group: 'Eyes',
    text: 'Dry eyes? Try artificial tears or a humidifier',
    detail: 'Screen use cuts blinking sharply. The AAO suggests lubricating drops and a humidifier for dry, warm rooms.',
    evidence: 'blinking-dry-eye',
  },
  {
    id: 'glasses',
    group: 'Eyes',
    text: 'Glasses prescription is current',
    detail: 'Uncorrected vision is a common cause of digital eye strain. If you wear contacts, give your eyes glasses breaks.',
    evidence: 'digital-eye-strain',
  },
  {
    id: 'feet',
    group: 'Chair & desk',
    text: 'Feet flat, thighs roughly level',
    detail: 'Use a footrest if your feet don’t reach the floor once the chair is at desk height.',
    evidence: 'workstation-setup',
  },
  {
    id: 'back',
    group: 'Chair & desk',
    text: 'Back supported, relaxed upright or slightly reclined',
    detail: 'Use the chair’s lumbar support. There’s no single perfect posture; comfortable and supported beats rigidly straight.',
    evidence: 'posture-variety',
  },
  {
    id: 'arms',
    group: 'Chair & desk',
    text: 'Elbows near your sides, wrists straight',
    detail: 'Keyboard and mouse close and at about elbow height, so shoulders stay relaxed and wrists stay neutral.',
    evidence: 'workstation-setup',
  },
  {
    id: 'sit-stand',
    group: 'Chair & desk',
    text: 'A way to stand while working',
    detail: 'A sit-stand desk, a high counter, or taking calls on your feet. Alternate rather than standing all day.',
    evidence: '20-8-2-sit-stand-move',
  },
  {
    id: 'move-daily',
    group: 'Habits',
    text: 'Weekly activity: 150+ min moderate',
    detail: 'WHO guidelines for adults, alongside cutting down sitting time. Breaks help, but they don’t replace exercise.',
    evidence: 'walking-breaks',
  },
  {
    id: 'eye-exam',
    group: 'Habits',
    text: 'Regular eye exams',
    detail: 'Persistent eye strain, headaches or blurred vision are worth checking with an optometrist or ophthalmologist.',
    evidence: 'digital-eye-strain',
  },
];

export const setupPct = (checked: Record<string, boolean>) => CHECKLIST.filter((c) => checked[c.id]).length / CHECKLIST.length;

/** Popular beliefs the evidence doesn't support, with what to do instead. */
export const MYTHS: { myth: string; truth: string; evidence: string }[] = [
  {
    myth: 'Blue-light glasses prevent digital eye strain.',
    truth: 'A 2023 Cochrane review of 17 trials found blue-light filtering lenses may not reduce short-term eye strain from computer work. Breaks, blinking and screen setup matter more.',
    evidence: 'blue-light-glasses',
  },
  {
    myth: 'Sit at 90-90-90: hips, knees and elbows all at right angles.',
    truth: 'There’s no single correct posture. OSHA shows several neutral postures, upright and reclined, and changing between them is the point. Supported and comfortable beats rigidly square.',
    evidence: 'posture-variety',
  },
  {
    myth: 'A standing desk solves sitting.',
    truth: 'Standing all day has its own problems. The goal is to alternate, and to move: walking breaks have the stronger evidence.',
    evidence: '20-8-2-sit-stand-move',
  },
  {
    myth: 'Screens permanently damage your eyes.',
    truth: 'The AAO says screen use doesn’t cause permanent damage. Strain and dryness are real but temporary, and breaks help.',
    evidence: 'digital-eye-strain',
  },
];

/** Short, sourced facts for the coach and the guide. */
export const FACTS: { text: string; evidence: string }[] = [
  { text: 'People blink about 15 times a minute normally, but only 5–7 while using a screen.', evidence: 'blinking-dry-eye' },
  { text: 'Adding a 5 min break to each hour lowered eyestrain and discomfort for data-entry workers, with no drop in output.', evidence: 'microbreaks' },
  { text: 'A 5 min light walk every 30 min cut post-meal blood sugar spikes by 58% versus sitting all day.', evidence: 'walking-breaks' },
  { text: 'Sitting all day and standing all day are both hard on the body. The goal is to keep changing.', evidence: '20-8-2-sit-stand-move' },
  { text: 'There’s no single correct posture. The best posture is the next one: change position often.', evidence: 'posture-variety' },
  { text: 'Reminders to take breaks eased eye strain and dry-eye symptoms, but the benefit faded once reminders stopped.', evidence: '20-20-20-rule' },
  { text: 'Short microbreaks (under 10 min) reliably boost energy and reduce fatigue.', evidence: 'microbreaks' },
  { text: 'Screen time won’t permanently damage your eyes, but strain and dryness are real and common.', evidence: 'digital-eye-strain' },
  { text: 'Canada’s 24-hour movement guidelines suggest keeping sitting to 8 hours a day or less, and breaking it up as often as you can.', evidence: 'sitting-budget' },
  { text: 'Three minutes of half-squats or calf raises every 30 minutes improved blood sugar versus sitting, with no equipment needed.', evidence: 'walking-breaks' },
  { text: 'A few one-minute bursts of vigorous everyday activity a day were linked to markedly lower mortality in a large wearable study.', evidence: 'exercise-snacks' },
];
