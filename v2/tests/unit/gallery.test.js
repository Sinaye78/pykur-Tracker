import assert from "node:assert/strict";
import test from "node:test";

import { GELUTIN_BOSS_GAINS, resolveFamiliar, resolveFamiliarRuntime } from "../../js/config/familiars.js";
import {
  archiveAndRestartFamiliar,
  buildFamiliarArchive,
  discoverGalleryEvent,
  removeGalleryArchive,
  resetGallery,
  selectGalleryForProfile
} from "../../js/domain/gallery.js";
import { createProfile } from "../../js/domain/profiles.js";
import { applyRunDelta } from "../../js/domain/runs.js";
import { createDefaultState } from "../../js/state/defaults.js";
import { migrateState } from "../../js/state/migrations.js";

const NOW = "2026-06-30T12:00:00.000Z";
const dependencies = { resolveFamiliar, resolveRuntime: resolveFamiliarRuntime, gelutinBossGains: GELUTIN_BOSS_GAINS };

function pykurState() {
  return createProfile(createDefaultState({ now: NOW }), { familiarId: "pykur", name: "Galerie" }, {
    resolveFamiliar,
    idFactory: () => "p_gallery",
    now: NOW
  }).state;
}

function completedPykur() {
  let state = pykurState();
  for (let index = 0; index < 640; index += 1) state = applyRunDelta(state, "p_gallery", 1, dependencies).state;
  return state;
}

test("un familier incomplet ne peut pas être archive", () => {
  assert.throws(() => buildFamiliarArchive(pykurState(), "p_gallery", dependencies), /pas encore atteint/);
});

test("archiver un familier conserve la mémoire et redémarre uniquement son cycle", () => {
  const source = completedPykur();
  source.profiles.p_gallery.data.settings.soundVolume = 37;
  source.profiles.p_gallery.data.dofusDetection.refs.morose.imageKey = "ref-morose";
  const result = archiveAndRestartFamiliar(source, "p_gallery", dependencies, {
    nowMs: Date.parse("2026-07-01T12:00:00.000Z"),
    nowIso: "2026-07-01T12:00:00.000Z",
    id: "archive-1"
  });
  assert.equal(result.archive.familiarId, "pykur");
  assert.equal(result.archive.pp, 90);
  assert.equal(result.state.sharedGallery.completedPykurs.length, 1);
  assert.equal(result.state.profiles.p_gallery.data.runs.morose, 0);
  assert.equal(result.state.profiles.p_gallery.data.settings.soundVolume, 37);
  assert.equal(result.state.profiles.p_gallery.data.dofusDetection.refs.morose.imageKey, "ref-morose");
  assert.equal(source.sharedGallery.completedPykurs.length, 0);
});

test("supprimer une archive pose un tombstone qui empêche sa réapparition", () => {
  const archived = archiveAndRestartFamiliar(completedPykur(), "p_gallery", dependencies, { id: "archive-2", nowIso: NOW }).state;
  const removed = removeGalleryArchive(archived, "p_gallery", "archive-2", { nowIso: NOW });
  assert.equal(removed.sharedGallery.completedPykurs.length, 0);
  assert.equal(removed.sharedGallery.removedPykurs["archive-2"], NOW);
});

test("reset galerie conserve des tombstones pour les archives et événements", () => {
  let state = archiveAndRestartFamiliar(completedPykur(), "p_gallery", dependencies, { id: "archive-3", nowIso: NOW }).state;
  state = discoverGalleryEvent(state, "p_gallery", "pluie", { nowIso: NOW });
  const reset = resetGallery(state, "p_gallery", { nowIso: NOW });
  assert.equal(reset.sharedGallery.completedPykurs.length, 0);
  assert.deepEqual(reset.sharedGallery.eventsDiscovered, {});
  assert.equal(reset.sharedGallery.removedPykurs["archive-3"], NOW);
  assert.equal(reset.sharedGallery.removedEvents.pluie, NOW);
});

test("une nouvelle apparition peut redécouvrir un événement retiré", () => {
  let state = pykurState();
  state.sharedGallery.removedEvents.pluie = NOW;
  state = discoverGalleryEvent(state, "p_gallery", "pluie", { nowIso: "2026-07-01T00:00:00.000Z" });
  const gallery = selectGalleryForProfile(state, "p_gallery");
  assert.equal(gallery.removedEvents.pluie, undefined);
  assert.equal(gallery.eventsDiscovered.pluie.count, 1);
});

test("la migration réunit les anciennes galeries locales dans la galerie du compte", () => {
  const source = pykurState();
  source.galleryShared = false;
  source.profiles.p_gallery.data.gallery.completedPykurs = [{ id: "locale", familiarId: "pykur" }];
  source.sharedGallery.completedPykurs = [{ id: "compte", familiarId: "pykur" }];
  const migrated = migrateState(source, { resolveFamiliar, now: NOW });
  assert.equal(migrated.galleryShared, true);
  assert.deepEqual(migrated.sharedGallery.completedPykurs.map((item) => item.id), ["compte", "locale"]);
});
