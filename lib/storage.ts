import type { AppState } from "./contracts";
import { starterWatchlist } from "./fixtures";

const storageKey = "market-brief-state-v1";

export const defaultState: AppState = {
  savedStories: [],
  completedStoryIds: [],
  watchlist: starterWatchlist
};

export function loadState(): AppState {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as Partial<AppState>;

    return {
      savedStories: parsed.savedStories ?? [],
      completedStoryIds: parsed.completedStoryIds ?? [],
      watchlist: parsed.watchlist?.length ? parsed.watchlist : starterWatchlist
    };
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function clearState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}
