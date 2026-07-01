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

export function recordHappiosHover(state, options = {}) {
  const next = cloneValue(state);
  const achievements = {
    ...createDefaultAchievements(),
    ...(next.sharedAchievements || {})
  };
  achievements.counters = {
    ...createDefaultAchievements().counters,
    ...(achievements.counters || {})
  };
  const count = Math.max(0, Number(achievements.counters.happiosHover) || 0) + 1;
  achievements.counters.happiosHover = count;
  next.sharedAchievements = achievements;
  next.updatedAt = options.now || new Date().toISOString();
  return Object.freeze({ state: next, count, shouldUnlock: count === 3 });
}
