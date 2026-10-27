import { loadAll, write, type Persisted } from './storage';

type Listener = (s: Persisted) => void;

/** Single source of truth for persisted state. UI modules subscribe; they don't keep their own copies. */
export function createStore(initial: Persisted = loadAll()) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    /** Mutate a draft, persist the touched slices, notify subscribers. */
    update(fn: (draft: Persisted) => void, keys: (keyof Persisted)[] = ['settings', 'session', 'log', 'days', 'checklist']) {
      const draft = structuredClone(state);
      fn(draft);
      state = draft;
      for (const k of keys) write(k, state[k]);
      listeners.forEach((l) => l(state));
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
