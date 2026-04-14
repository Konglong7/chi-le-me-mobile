import { describe, expect, it } from 'vitest';
import { APP_STORAGE_KEY, loadPersistedState, savePersistedState } from './storage';

describe('storage persistence', () => {
  it('preserves explicitly persisted empty collections', () => {
    const persisted = {
      currentUser: null,
      proposals: [],
      shares: [],
      wheelOptions: [],
      sessionToken: null,
      deviceId: null,
    };

    savePersistedState(persisted);

    expect(localStorage.getItem(APP_STORAGE_KEY)).toBeTruthy();

    const loaded = loadPersistedState();

    expect(loaded.proposals).toEqual([]);
    expect(loaded.shares).toEqual([]);
    expect(loaded.wheelOptions).toEqual([]);
  });
});
