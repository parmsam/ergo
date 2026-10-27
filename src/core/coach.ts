import { CHECKLIST, FACTS } from './guide';
import type { DaySummary } from './stats';
import type { TrackId } from './types';

export interface CoachNote {
  text: string;
  /** evidence/ slug backing the note, when there is one. */
  evidence?: string;
  tone: 'cheer' | 'nudge' | 'tip';
}

export interface CoachInput {
  today: DaySummary;
  /** Consecutive skipped/missed breaks per track. */
  skips: Record<TrackId, number>;
  checklist: Record<string, boolean>;
  /** Minutes the reminders have been running today. */
  activeMin: number;
  /** Daily sitting budget in hours (0 = off). */
  sitBudgetH?: number;
  seed: number;
}

/**
 * Picks one coaching note. Priority: respond to skipped breaks, then celebrate, then
 * point at an unchecked setup item, then a sourced fact. Pure, so it's easy to test.
 */
export function coach(i: CoachInput): CoachNote {
  if (i.skips.body >= 2)
    return {
      text: `${i.skips.body} body breaks skipped in a row. Even 60 seconds on your feet helps; try the next one standing.`,
      evidence: 'walking-breaks',
      tone: 'nudge',
    };
  if (i.skips.eye >= 3)
    return {
      text: `${i.skips.eye} eye breaks skipped. Twenty seconds of looking out a window is enough. No need to leave your desk.`,
      evidence: '20-20-20-rule',
      tone: 'nudge',
    };
  const budget = (i.sitBudgetH ?? 0) * 3600;
  if (budget && i.today.sittingSec >= budget * 0.85)
    return {
      text: `About ${Math.round(i.today.sittingSec / 360) / 10} h of sitting tracked today, near your ${i.sitBudgetH} h budget. Take calls standing or walk for the rest of the day where you can.`,
      evidence: 'sitting-budget',
      tone: 'nudge',
    };
  const done = i.today.eye.done + i.today.body.done;
  if (done > 0 && done % 10 === 0) return { text: `${done} breaks today. That’s a solid rhythm; keep it going.`, tone: 'cheer' };
  if (i.activeMin >= 120 && i.today.stand.done === 0 && i.today.body.done === 0)
    return { text: 'Two hours in without standing. A short walk now resets your posture and your eyes.', evidence: 'walking-breaks', tone: 'nudge' };

  const unchecked = CHECKLIST.filter((c) => !i.checklist[c.id]);
  if (unchecked.length && i.seed % 3 === 0) {
    const c = unchecked[i.seed % unchecked.length];
    return { text: `Setup tip: ${c.text.toLowerCase()}. ${c.detail}`, evidence: c.evidence, tone: 'tip' };
  }
  const f = FACTS[i.seed % FACTS.length];
  return { text: f.text, evidence: f.evidence, tone: 'tip' };
}
