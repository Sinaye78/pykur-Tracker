import {
  GENERATED_FAMILIAR_CATALOG,
  GENERATED_FAMILIAR_RUNTIME,
  GENERATED_GELUTIN_BOSS_GAINS
} from "./familiarCatalog.generated.js";

const V1_PAGE_BASE = new URL("../../../familiers/pykur/", import.meta.url);

function assetUrl(path) {
  if (!path) return "";
  return new URL(path, V1_PAGE_BASE).href;
}

function normalizeFamiliar(entry) {
  return Object.freeze({
    ...entry,
    icon: assetUrl(entry.icon),
    logo: assetUrl(entry.logo),
    image: assetUrl(entry.image),
    auraImage: assetUrl(entry.auraImage),
    sleepingImage: assetUrl(entry.sleepingImage),
    background: assetUrl(entry.background),
    dungeons: Object.freeze((entry.dungeons || []).map((dungeon) => Object.freeze({
      ...dungeon,
      asset: assetUrl(dungeon.asset)
    }))),
    farmMethods: Object.freeze([...(entry.farmMethods || [])]),
    specialDefaults: Object.freeze({ ...(entry.specialDefaults || {}) })
  });
}

export const FAMILIAR_CATALOG = Object.freeze(GENERATED_FAMILIAR_CATALOG.map(normalizeFamiliar));
export const FAMILIARS = Object.freeze(Object.fromEntries(FAMILIAR_CATALOG.map((familiar) => [familiar.id, familiar])));
export const GELUTIN_BOSS_GAINS = Object.freeze(GENERATED_GELUTIN_BOSS_GAINS);
export const FAMILIAR_RUNTIME = Object.freeze(Object.fromEntries(
  Object.entries(GENERATED_FAMILIAR_RUNTIME).map(([id, runtime]) => [
    id,
    Object.freeze({
      ...runtime,
      runLimits: Object.freeze({ ...(runtime.runLimits || {}) }),
      gains: Object.freeze({ ...(runtime.gains || {}) }),
      zoneIds: Object.freeze([...(runtime.zoneIds || [])]),
      specialGains: Object.freeze({ ...(runtime.specialGains || {}) }),
      mobs: Object.freeze(Object.fromEntries(
        Object.entries(runtime.mobs || {}).map(([mobId, mob]) => [
          mobId,
          Object.freeze({
            ...mob,
            imgPath: assetUrl(mob.imgPath || (mob.img ? `./assets/images/${mob.img}` : "")),
            cat: Object.freeze([...(mob.cat || [])])
          })
        ])
      ))
    })
  ])
));

export function resolveFamiliar(id) {
  return FAMILIARS[id] || null;
}

export function resolveFamiliarRuntime(id) {
  return FAMILIAR_RUNTIME[id] || null;
}

export function searchFamiliars(query = "") {
  const normalized = String(query).trim().toLocaleLowerCase("fr");
  if (!normalized) return FAMILIAR_CATALOG;
  return FAMILIAR_CATALOG.filter((familiar) => [
    familiar.label,
    familiar.progressLabel,
    familiar.description,
    ...(familiar.farmMethods || [])
  ].join(" ").toLocaleLowerCase("fr").includes(normalized));
}
