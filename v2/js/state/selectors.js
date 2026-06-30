export const selectProfileMap = (state) => state?.profiles || {};
export const selectProfileIds = (state) => Object.keys(selectProfileMap(state));
export const selectProfiles = (state) => Object.entries(selectProfileMap(state)).map(([id, profile]) => ({ id, ...profile }));
export const selectProfileById = (state, profileId) => selectProfileMap(state)[profileId] || null;
export const selectActiveProfileId = (state) => state?.active || null;
export const selectActiveProfile = (state) => selectProfileById(state, selectActiveProfileId(state));
export const selectActiveProfileData = (state) => selectActiveProfile(state)?.data || null;
export const selectHasActiveProfile = (state) => Boolean(selectActiveProfile(state));
export const selectNeedsFamiliarChoice = (state) => Boolean(state?.needsFamiliarChoice || !selectHasActiveProfile(state));
export const selectGallery = (state) => state?.sharedGallery || null;
export const selectSettings = (state) => state?.optionsShared
  ? state?.sharedSettings || null
  : selectActiveProfileData(state)?.settings || state?.sharedSettings || null;
export const selectAchievements = (state) => state?.sharedAchievements || selectActiveProfileData(state)?.achievements || null;
export const selectProfileCount = (state) => selectProfileIds(state).length;
