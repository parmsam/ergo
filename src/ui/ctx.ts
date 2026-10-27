import type { Controller } from '../core/controller';
import type { Store } from '../core/store';
import type { Settings } from '../core/types';

export type View = 'today' | 'stats' | 'guide' | 'settings';

/** What views get to work with. */
export interface AppCtx {
  store: Store;
  ctrl: Controller;
  actions: { start(): void };
  /** Change settings, persist, and let the controller react (e.g. restart a lane whose rule changed). */
  updateSettings(fn: (s: Settings) => void): void;
  go(view: View): void;
}
