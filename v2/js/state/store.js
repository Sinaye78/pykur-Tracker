import { cloneValue, createDefaultState } from "./defaults.js";
import { migrateState } from "./migrations.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

export function createStateStore(initialState = createDefaultState(), options = {}) {
  let state = deepFreeze(migrateState(initialState, options));
  const listeners = new Set();

  function getState() {
    return state;
  }

  function replaceState(nextState) {
    const previous = state;
    state = deepFreeze(migrateState(nextState, options));
    if (state !== previous) listeners.forEach((listener) => listener(state, previous));
    return state;
  }

  function updateState(updater) {
    if (typeof updater !== "function") throw new TypeError("updateState attend une fonction.");
    const draft = cloneValue(state);
    const result = updater(draft);
    return replaceState(result === undefined ? draft : result);
  }

  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("subscribe attend une fonction.");
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({ getState, replaceState, updateState, subscribe });
}
