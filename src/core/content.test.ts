import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { coach } from './coach';
import { EXERCISES, pickExercises } from './exercises';
import { CHECKLIST, FACTS } from './guide';
import { BODY_RULES, EYE_RULES, NUDGES, customBodyRule } from './rules';
import { DEFAULT_SETTINGS } from './storage';
import { summarize } from './stats';

const evidence = (slug: string) => resolve(process.cwd(), 'evidence', `${slug}.md`);

describe('every recommendation is sourced', () => {
  const slugs = new Set([
    ...[...EYE_RULES, ...BODY_RULES].map((r) => r.evidence),
    ...Object.values(NUDGES).map((n) => n.evidence),
    ...CHECKLIST.map((c) => c.evidence),
    ...FACTS.map((f) => f.evidence),
    'stretching',
  ]);
  for (const slug of slugs) {
    it(`evidence/${slug}.md exists and cites a link`, () => {
      expect(existsSync(evidence(slug))).toBe(true);
      expect(readFileSync(evidence(slug), 'utf8')).toMatch(/https?:\/\//);
    });
  }
});

describe('rules', () => {
  it('every rule has exactly one break phase and positive durations', () => {
    for (const r of [...EYE_RULES, ...BODY_RULES]) {
      expect(r.phases.filter((p) => p.kind === 'break')).toHaveLength(1);
      expect(r.phases.every((p) => p.sec > 0)).toBe(true);
    }
  });
  it('custom body rule drops a zero-minute standing phase', () => {
    const r = customBodyRule({ ...DEFAULT_SETTINGS, custom: { ...DEFAULT_SETTINGS.custom, body: { sitMin: 25, standMin: 0, moveMin: 5 } } });
    expect(r.phases.map((p) => p.label)).toEqual(['Sitting', 'Move']);
  });
});

describe('exercises & coach', () => {
  it('has exercises for every break focus', () => {
    for (const f of ['far', 'eyes', 'stretch', 'walk', 'stand'] as const) expect(pickExercises(f, 3).length).toBeGreaterThan(0);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });
  it('responds to repeated skipped body breaks first', () => {
    const note = coach({ today: summarize([], {}, 'x'), skips: { eye: 5, body: 2 }, checklist: {}, activeMin: 0, seed: 1 });
    expect(note.tone).toBe('nudge');
    expect(note.text).toMatch(/body breaks skipped/);
  });
});
