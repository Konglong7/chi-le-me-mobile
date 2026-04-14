import { createSeedState } from '../app/seed';
import type { PersistedState } from '../app/types';

export const APP_STORAGE_KEY = 'chi-le-me-state';

export function loadPersistedState(): PersistedState {
  const seed = createSeedState();

  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);

    if (!raw) {
      return seed;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;

    return {
      currentUser: parsed.currentUser ?? seed.currentUser,
      proposals: Array.isArray(parsed.proposals) ? parsed.proposals : seed.proposals,
      shares: Array.isArray(parsed.shares) ? parsed.shares : seed.shares,
      wheelOptions: Array.isArray(parsed.wheelOptions) ? parsed.wheelOptions : seed.wheelOptions,
      sessionToken: parsed.sessionToken ?? null,
      deviceId: parsed.deviceId ?? null,
    };
  } catch {
    return {
      ...seed,
      sessionToken: null,
      deviceId: null,
    };
  }
}

export function savePersistedState(state: PersistedState) {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
}
