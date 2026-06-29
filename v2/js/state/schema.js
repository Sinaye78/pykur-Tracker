export const CURRENT_STATE_VERSION = 1;

export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function assertStateShape(state) {
  const errors = [];
  if (!isRecord(state)) return ["L'état racine doit être un objet."];
  if (state.schemaVersion !== CURRENT_STATE_VERSION) errors.push("Version de schéma invalide.");
  if (!isRecord(state.profiles)) errors.push("profiles doit être un objet.");
  if (!isRecord(state.deletedProfiles)) errors.push("deletedProfiles doit être un objet.");
  if (state.active !== null && typeof state.active !== "string") errors.push("active doit être une chaîne ou null.");
  if (isRecord(state.profiles)) {
    for (const [id, profile] of Object.entries(state.profiles)) {
      if (!isRecord(profile)) errors.push(`Profil ${id} invalide.`);
      else if (!isRecord(profile.data)) errors.push(`Données du profil ${id} invalides.`);
    }
  }
  return errors;
}

function sortForSerialization(value) {
  if (Array.isArray(value)) return value.map(sortForSerialization);
  if (!isRecord(value)) return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = sortForSerialization(value[key]);
    return result;
  }, {});
}

export function serializeState(state) {
  const errors = assertStateShape(state);
  if (errors.length) throw new TypeError(errors.join(" "));
  return JSON.stringify(sortForSerialization(state));
}
