import type { Focus } from './types';

export interface Exercise {
  id: string;
  name: string;
  /** Which break focuses this suits. */
  for: Focus[];
  /** Short, plain steps. Shown one at a time during a break. */
  steps: string[];
  /** Body area, for the guide. */
  area: 'Eyes' | 'Neck' | 'Shoulders & back' | 'Wrists & hands' | 'Hips & legs' | 'Whole body';
  /** Gentle caution, when one applies. */
  caution?: string;
}

/**
 * Low-risk, desk-friendly movements. Evidence that any specific stretch matters is weak (see evidence/stretching.md):
 * the point is to change position and move, so prompts stay simple and never push into pain.
 */
export const EXERCISES: Exercise[] = [
  {
    id: 'far-gaze',
    name: 'Far gaze',
    for: ['far', 'eyes'],
    area: 'Eyes',
    steps: ['Find the farthest thing you can see: out a window, down a hallway', 'Let your eyes rest on it, soft focus', 'Blink normally and breathe out slowly'],
  },
  {
    id: 'slow-blinks',
    name: 'Slow full blinks',
    for: ['blink', 'eyes', 'far'],
    area: 'Eyes',
    steps: ['Close your eyes gently, all the way', 'Pause for a second, then squeeze softly', 'Open and relax. Repeat 10 times'],
  },
  {
    id: 'palming',
    name: 'Palming',
    for: ['eyes'],
    area: 'Eyes',
    steps: ['Rub your palms together to warm them', 'Cup them over closed eyes, no pressure on the eyeballs', 'Rest in the dark and breathe slowly'],
  },
  {
    id: 'near-far',
    name: 'Near-far focus',
    for: ['eyes', 'far'],
    area: 'Eyes',
    steps: ['Hold a thumb about 25 cm (10 in) from your face and focus on it', 'Shift focus to something across the room', 'Switch back and forth slowly, 10 times'],
  },
  {
    id: 'chin-tuck',
    name: 'Chin tucks',
    for: ['stretch', 'posture', 'stand'],
    area: 'Neck',
    steps: ['Sit or stand tall, eyes level', 'Glide your chin straight back, making a gentle double chin', 'Hold 3 seconds and release. Repeat 8 times'],
  },
  {
    id: 'neck-side',
    name: 'Side neck stretch',
    for: ['stretch'],
    area: 'Neck',
    steps: ['Drop your right ear toward your right shoulder', 'Let your left shoulder sink down. Hold 15 s', 'Switch sides'],
    caution: 'Keep it gentle; no bouncing.',
  },
  {
    id: 'shoulder-rolls',
    name: 'Shoulder rolls',
    for: ['stretch', 'posture', 'stand'],
    area: 'Shoulders & back',
    steps: ['Lift your shoulders toward your ears', 'Roll them back and down, slowly', 'Repeat 8 times, then reverse'],
  },
  {
    id: 'chest-opener',
    name: 'Chest opener',
    for: ['stretch', 'stand'],
    area: 'Shoulders & back',
    steps: ['Clasp your hands behind your back (or hold a doorway)', 'Lift your chest and draw shoulder blades together', 'Breathe and hold 20 s'],
  },
  {
    id: 'seated-twist',
    name: 'Gentle twist',
    for: ['stretch'],
    area: 'Shoulders & back',
    steps: ['Sit tall, feet flat', 'Turn your upper body to the right, hand on the chair back', 'Hold 15 s, then the other side'],
  },
  {
    id: 'wrist-stretch',
    name: 'Wrist stretches',
    for: ['stretch'],
    area: 'Wrists & hands',
    steps: ['Arm out, palm up. Gently pull the fingers back with the other hand, 15 s', 'Turn the palm down and gently press the hand toward you, 15 s', 'Switch arms, then make loose fists and open wide 5 times'],
  },
  {
    id: 'hip-flexor',
    name: 'Standing hip stretch',
    for: ['stretch', 'stand'],
    area: 'Hips & legs',
    steps: ['Step one foot back into a short lunge, hold the desk for balance', 'Tuck your hips under until you feel the front of the hip stretch', 'Hold 20 s, then switch legs'],
  },
  {
    id: 'calf-raises',
    name: 'Calf raises',
    for: ['stand', 'stretch', 'walk'],
    area: 'Hips & legs',
    steps: ['Stand tall, hands on the desk', 'Rise up onto your toes, then lower slowly', 'Repeat 12 times'],
  },
  {
    id: 'walk',
    name: 'Walk it out',
    for: ['walk', 'stretch'],
    area: 'Whole body',
    steps: ['Get up and walk: a hallway lap, the stairs, refill your water', 'Let your arms swing and your eyes look far ahead', 'Easy pace is fine; light walking is what the studies used'],
  },
  {
    id: 'shake-out',
    name: 'Shake out',
    for: ['stretch', 'walk', 'stand'],
    area: 'Whole body',
    steps: ['Stand up and shake out your hands and arms', 'March in place for 20 seconds', 'Reach both arms overhead and take a big breath'],
  },
];

/** Exercises for a break, rotated by a seed so consecutive breaks vary. */
export function pickExercises(focus: Focus | undefined, seed: number, count = 2): Exercise[] {
  const pool = EXERCISES.filter((e) => e.for.includes(focus ?? 'stretch'));
  if (!pool.length) return [];
  const start = Math.abs(Math.floor(seed)) % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}
