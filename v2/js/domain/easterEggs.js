import { cloneValue, createDefaultAchievements } from "../state/defaults.js";

export function isSecretEggCollected(state) {
  return Boolean(state?.sharedAchievements?.eggCollected);
}

export function collectSecretEgg(state, options = {}) {
  if (isSecretEggCollected(state)) return Object.freeze({ state, collected: false });
  const next = cloneValue(state);
  next.sharedAchievements = {
    ...createDefaultAchievements(),
    ...(next.sharedAchievements || {}),
    eggCollected: true
  };
  next.updatedAt = options.now || new Date().toISOString();
  return Object.freeze({ state: next, collected: true });
}
