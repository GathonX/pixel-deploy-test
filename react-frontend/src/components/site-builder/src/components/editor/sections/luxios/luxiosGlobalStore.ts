// Global Luxios theme store — allows ThemeEditor to push color changes
// to all Luxios sections in real-time without touching per-section styles.

type LuxiosGlobal = {
  gold: string;
  bg:   string;
  fg:   string;
};

// Default Luxios tokens (mirrored from LX constants to avoid circular import)
let _state: LuxiosGlobal = {
  gold: '#c99645',
  bg:   '#14171f',
  fg:   '#f4f3ef',
};

const _listeners = new Set<() => void>();

export const luxiosGlobalStore = {
  get: (): LuxiosGlobal => _state,

  set: (vals: Partial<LuxiosGlobal>) => {
    _state = { ..._state, ...vals };
    _listeners.forEach(fn => fn());
  },

  subscribe: (fn: () => void): (() => void) => {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },
};
