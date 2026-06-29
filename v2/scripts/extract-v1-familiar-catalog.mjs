import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const sourceUrl = new URL("../../familiers/pykur/data/familiars.js", import.meta.url);
const outputUrl = new URL("../js/config/familiarCatalog.generated.js", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const context = vm.createContext({ window: {} });
vm.runInContext(source, context, { filename: sourceUrl.pathname });

const catalog = Object.values(context.window.PYKUR_FAMILIAR_DATA.FAMILIARS).map((familiar) => ({
  id: familiar.id,
  label: familiar.label,
  shortLabel: familiar.shortLabel,
  defaultProfileName: familiar.defaultProfileName,
  progressLabel: familiar.progressLabel,
  progressShort: familiar.progressShort,
  objectiveMax: familiar.objectiveMax,
  objectiveLabel: familiar.objectiveLabel,
  icon: familiar.icon,
  logo: familiar.logo,
  image: familiar.image,
  auraImage: familiar.auraImage,
  sleepingImage: familiar.sleepingImage,
  background: familiar.background,
  status: familiar.status,
  statusLabel: familiar.statusLabel,
  description: familiar.description,
  estimateNote: familiar.estimateNote,
  bonusAmount: familiar.bonusAmount,
  difficultyLabel: familiar.difficultyLabel,
  difficultyStars: familiar.difficultyStars,
  dofusCooldownMin: familiar.dofusCooldownMin,
  farmMethods: familiar.farmMethods,
  dungeons: familiar.dungeons,
  specialDefaults: familiar.specialDefaults || {}
}));
const runtime = context.window.PYKUR_FAMILIAR_DATA.FAMILIAR_RUNTIME;
const gelutinBossGains = context.window.PYKUR_FAMILIAR_DATA.GELUTIN_BLOP_BOSS_GAINS;

const banner = "// Fichier généré depuis la source de vérité V1. Ne pas modifier à la main.\n";
await writeFile(outputUrl, [
  banner,
  `export const GENERATED_FAMILIAR_CATALOG = Object.freeze(${JSON.stringify(catalog, null, 2)});\n`,
  `export const GENERATED_FAMILIAR_RUNTIME = Object.freeze(${JSON.stringify(runtime, null, 2)});\n`,
  `export const GENERATED_GELUTIN_BOSS_GAINS = Object.freeze(${JSON.stringify(gelutinBossGains, null, 2)});\n`
].join(""), "utf8");
console.log(`${catalog.length} familiers exportés.`);
