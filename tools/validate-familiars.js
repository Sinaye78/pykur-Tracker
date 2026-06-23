#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const pykurDir = path.join(rootDir, "familiers", "pykur");
const dataPath = path.join(pykurDir, "data", "familiars.js");
const indexPath = path.join(pykurDir, "index.html");
const serverPath = path.join(rootDir, "server", "server.js");

const result = {
  errors: [],
  warnings: [],
  checkedAssets: 0,
  checkedFamiliars: 0,
  checkedMonsters: 0,
  checkedDungeons: 0
};

function fail(message) {
  result.errors.push(message);
}

function warn(message) {
  result.warnings.push(message);
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveSitePath(sitePath) {
  if (!sitePath || typeof sitePath !== "string") return null;
  if (/^(https?:)?\/\//i.test(sitePath) || sitePath.startsWith("data:")) return null;
  return path.resolve(pykurDir, sitePath.replace(/[?#].*$/, ""));
}

function checkAsset(owner, label, sitePath, required = true) {
  if (!sitePath) {
    if (required) fail(`${owner}: asset manquant pour ${label}.`);
    return;
  }
  const resolved = resolveSitePath(sitePath);
  if (!resolved) return;
  result.checkedAssets++;
  if (!fileExists(resolved)) fail(`${owner}: asset introuvable pour ${label}: ${sitePath}`);
}

function loadData() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(dataPath, "utf8"), sandbox, { filename: dataPath, timeout: 1500 });
  return sandbox.window.PYKUR_FAMILIAR_DATA;
}

function normalizeThreshold(mob) {
  const need = Number(mob?.ppNeed);
  const gainValue = Number(mob?.gainValue || 1);
  return {
    need: Number.isFinite(need) ? need : 0,
    gainValue: Number.isFinite(gainValue) ? gainValue : 0
  };
}

function validateFamiliar(id, familiar, runtime) {
  const owner = `${familiar?.label || id} (${id})`;
  result.checkedFamiliars++;

  [
    "id",
    "label",
    "shortLabel",
    "defaultProfileName",
    "progressLabel",
    "progressShort",
    "objectiveMax",
    "objectiveLabel",
    "icon",
    "image",
    "auraImage",
    "sleepingImage",
    "background",
    "bonusAmount",
    "difficultyStars",
    "dungeons"
  ].forEach((key) => {
    if (familiar?.[key] === undefined || familiar?.[key] === null || familiar?.[key] === "") {
      fail(`${owner}: champ obligatoire vide: ${key}`);
    }
  });

  if (familiar?.id !== id) fail(`${owner}: l'id interne "${familiar?.id}" ne correspond pas a la cle "${id}".`);
  if (!Array.isArray(familiar?.dungeons) || !familiar.dungeons.length) fail(`${owner}: aucun donjon declare.`);

  const objectiveMax = Number(familiar?.objectiveMax);
  if (!Number.isFinite(objectiveMax) || objectiveMax <= 0) fail(`${owner}: objectiveMax invalide.`);
  if (Number(familiar?.bonusAmount) > objectiveMax) warn(`${owner}: bonusAmount est superieur a objectiveMax.`);
  if (familiar?.objectiveLabel && !String(familiar.objectiveLabel).includes(String(objectiveMax))) {
    warn(`${owner}: objectiveLabel ne contient pas la valeur max (${objectiveMax}).`);
  }

  checkAsset(owner, "icone bonus", familiar?.icon);
  checkAsset(owner, "logo", familiar?.logo, false);
  checkAsset(owner, "image", familiar?.image);
  checkAsset(owner, "image terminee", familiar?.auraImage);
  checkAsset(owner, "image endormie", familiar?.sleepingImage);
  checkAsset(owner, "fond", familiar?.background);

  if (!runtime) {
    fail(`${owner}: runtime absent dans FAMILIAR_RUNTIME.`);
    return;
  }
  if (!runtime.runLimits) fail(`${owner}: runLimits absent.`);
  if (!runtime.mobs) fail(`${owner}: mobs absent.`);
  if (!runtime.gains) fail(`${owner}: gains absent.`);
  if (!Array.isArray(runtime.zoneIds)) fail(`${owner}: zoneIds absent ou invalide.`);

  const dungeonKeys = new Set();
  (familiar.dungeons || []).forEach((dungeon) => {
    result.checkedDungeons++;
    const dungeonOwner = `${owner} / donjon ${dungeon?.key || "?"}`;
    if (!dungeon?.key) fail(`${dungeonOwner}: key manquante.`);
    if (dungeonKeys.has(dungeon.key)) fail(`${owner}: donjon en double: ${dungeon.key}`);
    dungeonKeys.add(dungeon.key);
    if (!dungeon?.label) fail(`${dungeonOwner}: label manquant.`);
    if (!dungeon?.fullLabel) fail(`${dungeonOwner}: fullLabel manquant.`);
    if (!Number.isFinite(Number(dungeon?.defaultAverage)) || Number(dungeon.defaultAverage) < 0) {
      warn(`${dungeonOwner}: defaultAverage absent ou invalide.`);
    }
    checkAsset(dungeonOwner, "image donjon", dungeon?.asset, false);
    if (runtime.runLimits && !(dungeon.key in runtime.runLimits)) fail(`${dungeonOwner}: absent de runLimits.`);
    if (runtime.gains && !(dungeon.key in runtime.gains)) fail(`${dungeonOwner}: absent de gains.`);
  });

  const mobs = runtime.mobs || {};
  const mobIds = new Set(Object.keys(mobs));
  if (!mobIds.size) fail(`${owner}: aucun monstre dans le runtime.`);
  Object.entries(mobs).forEach(([mobId, mob]) => {
    result.checkedMonsters++;
    const mobOwner = `${owner} / monstre ${mobId}`;
    if (!mob?.name) fail(`${mobOwner}: name manquant.`);
    const threshold = normalizeThreshold(mob);
    if (!Number.isFinite(threshold.need) || threshold.need <= 0) fail(`${mobOwner}: ppNeed invalide.`);
    if (!Number.isFinite(threshold.gainValue) || threshold.gainValue <= 0) fail(`${mobOwner}: gainValue invalide.`);
    checkAsset(mobOwner, "sprite", mob?.imgPath, false);
    if (!mob?.imgPath) warn(`${mobOwner}: sprite non renseigne, le site utilisera un fallback visuel.`);
    if (!Array.isArray(mob?.cat) || !mob.cat.length) {
      fail(`${mobOwner}: cat doit contenir au moins une source.`);
    } else {
      mob.cat.forEach((cat) => {
        if (cat !== "zone" && !dungeonKeys.has(cat)) fail(`${mobOwner}: cat inconnue "${cat}".`);
      });
    }
  });

  Object.entries(runtime.gains || {}).forEach(([dungeonKey, gains]) => {
    if (!dungeonKeys.has(dungeonKey)) fail(`${owner}: gains declare une source inconnue "${dungeonKey}".`);
    Object.entries(gains || {}).forEach(([mobId, value]) => {
      if (!mobIds.has(mobId)) fail(`${owner}: ${dungeonKey} donne le monstre inconnu "${mobId}".`);
      if (!Number.isFinite(Number(value)) || Number(value) < 0) fail(`${owner}: gain invalide pour ${dungeonKey}.${mobId}.`);
    });
  });

  const computedZoneIds = Object.keys(mobs).filter((mobId) => Array.isArray(mobs[mobId]?.cat) && mobs[mobId].cat.includes("zone")).sort();
  const declaredZoneIds = [...(runtime.zoneIds || [])].sort();
  if (computedZoneIds.join("|") !== declaredZoneIds.join("|")) {
    warn(`${owner}: zoneIds ne correspond pas exactement aux monstres marques zone.`);
  }
}

function validateUiIntegration(familiarCount) {
  const index = fs.readFileSync(indexPath, "utf8");
  const server = fs.readFileSync(serverPath, "utf8");
  const checks = [
    ["catalogue", /Object\.values\(FAMILIARS\).*familiar-choice-card/s],
    ["detection Dofus", /dofusSelectedFamiliar|dofusFarmKeys|FAMILIARS\[dofusSelectedFamiliarId/s],
    ["galerie", /galleryArchiveFamiliar|gallery-familiar-select|data-gallery-familiar-filter/s],
    ["projection", /activeFamiliar\(\)|Projection du \$\{familiar\.shortLabel/s],
    ["admin panel", /admin-profile-familiar-card|familiarLabel|progressLabel/s],
    ["serveur profils publics", /loadPublicFamiliarsFromClientData|FAMILIAR_RUNTIME/s]
  ];
  checks.forEach(([label, regex]) => {
    const haystack = label === "serveur profils publics" ? server : index;
    if (!regex.test(haystack)) warn(`Integration ${label}: verification statique non trouvee.`);
  });
  if (familiarCount < 1) fail("Aucun familier detecte dans FAMILIARS.");
}

function main() {
  let shared;
  try {
    shared = loadData();
  } catch (error) {
    fail(`Impossible de charger ${path.relative(rootDir, dataPath)}: ${error.message}`);
  }
  if (!shared) {
    printAndExit();
    return;
  }
  const familiars = shared.FAMILIARS || {};
  const runtimes = shared.FAMILIAR_RUNTIME || {};
  Object.entries(familiars).forEach(([id, familiar]) => validateFamiliar(id, familiar, runtimes[id]));
  Object.keys(runtimes).forEach((id) => {
    if (!familiars[id]) fail(`Runtime orphelin sans familier: ${id}`);
  });
  validateUiIntegration(Object.keys(familiars).length);
  printAndExit();
}

function printAndExit() {
  const ok = result.errors.length === 0;
  console.log("");
  console.log(ok ? "Validation familiers OK" : "Validation familiers echouee");
  console.log(`${result.checkedFamiliars} familiers verifies`);
  console.log(`${result.checkedDungeons} donjons verifies`);
  console.log(`${result.checkedMonsters} monstres verifies`);
  console.log(`${result.checkedAssets} assets verifies`);
  if (result.warnings.length) {
    console.log("");
    console.log(`Avertissements (${result.warnings.length})`);
    result.warnings.forEach((message) => console.log(`- ${message}`));
  }
  if (result.errors.length) {
    console.log("");
    console.log(`Erreurs (${result.errors.length})`);
    result.errors.forEach((message) => console.log(`- ${message}`));
  }
  process.exitCode = ok ? 0 : 1;
}

main();
