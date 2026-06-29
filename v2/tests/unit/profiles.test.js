import assert from "node:assert/strict";
import test from "node:test";

import { FAMILIAR_CATALOG, resolveFamiliar, searchFamiliars } from "../../js/config/familiars.js";
import { createProfile, createProfileCleanupRegistry, deleteProfile, normalizeProfileName, pageFamiliars, renameProfile, switchProfile } from "../../js/domain/profiles.js";
import { createDefaultState } from "../../js/state/defaults.js";
import { migrateState } from "../../js/state/migrations.js";

const NOW = "2026-06-28T18:00:00.000Z";

function addProfile(state, id, familiarId, name) {
  return createProfile(state, { familiarId, name }, {
    resolveFamiliar,
    idFactory: () => id,
    now: NOW
  }).state;
}

test("le catalogue V2 expose les 20 familiers sans doublon", () => {
  assert.equal(FAMILIAR_CATALOG.length, 20);
  assert.equal(new Set(FAMILIAR_CATALOG.map((item) => item.id)).size, 20);
  assert.equal(searchFamiliars("dragoeufs")[0].id, "dragoune-noir");
  assert.equal(pageFamiliars(FAMILIAR_CATALOG, 99, 4).pageCount, 5);
});

test("la création conserve le familier et initialise ses propres donjons", () => {
  const result = createProfile(createDefaultState({ now: NOW }), {
    familiarId: "abra-kadabra",
    name: "  Mon   Abra  "
  }, { resolveFamiliar, idFactory: () => "p_abra", now: NOW });

  assert.equal(result.profileId, "p_abra");
  assert.equal(result.state.active, "p_abra");
  assert.equal(result.state.profiles.p_abra.name, "Mon Abra");
  assert.equal(result.state.profiles.p_abra.data.familiarId, "abra-kadabra");
  assert.deepEqual(Object.keys(result.state.profiles.p_abra.data.runs), ["donjonAbraknyde", "cheneMou", "salleAbrakne"]);
  assert.equal(result.state.needsFamiliarChoice, false);
});

test("renommer et changer de profil ne modifient pas les autres données", () => {
  let state = createDefaultState({ now: NOW });
  state = addProfile(state, "p_one", "pykur", "Principal");
  state = addProfile(state, "p_two", "dragoune-noir", "Dragoune");
  const beforeRuns = structuredClone(state.profiles.p_one.data.runs);
  state = renameProfile(state, "p_one", "  Profil   renommé ", { now: NOW });
  state = switchProfile(state, "p_one", { now: NOW });

  assert.equal(state.active, "p_one");
  assert.equal(state.profiles.p_one.name, "Profil renommé");
  assert.deepEqual(state.profiles.p_one.data.runs, beforeRuns);
  assert.equal(state.profiles.p_two.data.familiarId, "dragoune-noir");
});

test("la suppression crée un tombstone et la migration ne ressuscite pas le profil", () => {
  let state = createDefaultState({ now: NOW });
  state = addProfile(state, "p_one", "pykur", "Principal");
  state = addProfile(state, "p_two", "dragoune-noir", "Dragoune");
  state = deleteProfile(state, "p_two", { now: NOW });
  const deletedCopy = structuredClone(state.profiles.p_two);
  const payload = structuredClone(state);
  payload.profiles.p_two = deletedCopy || { name: "Fantôme", data: { familiarId: "dragoune-noir" } };
  const migrated = migrateState(payload, { resolveFamiliar, now: NOW });

  assert.equal(state.profiles.p_two, undefined);
  assert.equal(state.deletedProfiles.p_two.familiarId, "dragoune-noir");
  assert.equal(migrated.profiles.p_two, undefined);
  assert.equal(migrated.active, "p_one");
});

test("le dernier profil et les identifiants supprimés sont protégés", () => {
  let state = createDefaultState({ now: NOW });
  state = addProfile(state, "p_one", "pykur", "Principal");
  assert.throws(() => deleteProfile(state, "p_one", { now: NOW }), (error) => error.code === "LAST_PROFILE");
  state.deletedProfiles.p_old = { deletedAt: NOW };
  assert.throws(
    () => createProfile(state, { familiarId: "pykur", name: "Retour" }, { resolveFamiliar, idFactory: () => "p_old", now: NOW }),
    (error) => error.code === "PROFILE_ID_CONFLICT"
  );
});

test("les noms de profils sont nettoyés et bornés", () => {
  assert.equal(normalizeProfileName("  A   B  "), "A B");
  assert.equal(normalizeProfileName("x".repeat(80)).length, 60);
});

test("les ressources du profil sont nettoyées une seule fois avant changement", () => {
  const registry = createProfileCleanupRegistry();
  let cleaned = 0;
  registry.register(() => { cleaned += 1; });
  assert.equal(registry.size(), 1);
  registry.run();
  registry.run();
  assert.equal(cleaned, 1);
  assert.equal(registry.size(), 0);
});
