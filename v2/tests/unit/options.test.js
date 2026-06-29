import assert from "node:assert/strict";
import test from "node:test";

import { findShortcutConflict, normalizeShortcut, shortcutFromEvent } from "../../js/config/shortcuts.js";
import {
  resetKeybinds,
  setGalleryShared,
  setOptionsShared,
  updateKeybind,
  updateNotificationDuration,
  updateSetting,
  updateSoundVolume
} from "../../js/domain/options.js";
import { createProfile } from "../../js/domain/profiles.js";
import { resolveFamiliar } from "../../js/config/familiars.js";
import { createDefaultState } from "../../js/state/defaults.js";

function stateWithProfiles() {
  let state = createProfile(createDefaultState(), { familiarId: "pykur", name: "Un" }, { resolveFamiliar, idFactory: () => "one" }).state;
  state = createProfile(state, { familiarId: "abra-kadabra", name: "Deux" }, { resolveFamiliar, idFactory: () => "two" }).state;
  state.active = "one";
  return state;
}

test("une option locale ne modifie que le profil actif", () => {
  const state = stateWithProfiles();
  const next = updateSetting(state, "night", true);
  assert.equal(next.profiles.one.data.settings.night, true);
  assert.equal(next.profiles.two.data.settings.night, false);
  assert.equal(state.profiles.one.data.settings.night, false);
});

test("lier les options copie les réglages actifs à tous les profils", () => {
  let state = stateWithProfiles();
  state = updateSetting(state, "night", true);
  state = setOptionsShared(state, true);
  assert.equal(state.optionsShared, true);
  assert.equal(state.sharedSettings.night, true);
  assert.equal(state.profiles.two.data.settings.night, true);
  state = updateSetting(state, "largeFont", true);
  assert.equal(state.profiles.one.data.settings.largeFont, true);
  assert.equal(state.profiles.two.data.settings.largeFont, true);
});

test("volume et durée sont bornés", () => {
  let state = stateWithProfiles();
  state = updateSoundVolume(state, 145);
  state = updateNotificationDuration(state, 9999);
  assert.equal(state.profiles.one.data.settings.soundVolume, 100);
  assert.equal(state.profiles.one.data.settings.notificationDuration, 3200);
});

test("la galerie partagée fusionne les archives sans doublon", () => {
  const state = stateWithProfiles();
  state.galleryShared = false;
  state.sharedGallery.completedPykurs = [{ id: "a" }];
  state.profiles.one.data.gallery.completedPykurs = [{ id: "a" }, { id: "b" }];
  const next = setGalleryShared(state, true);
  assert.deepEqual(next.sharedGallery.completedPykurs.map((item) => item.id), ["a", "b"]);
});

test("les raccourcis sont modifiables et réinitialisables", () => {
  let state = stateWithProfiles();
  state = updateKeybind(state, "addRun", "F8");
  assert.equal(state.profiles.one.data.settings.keybinds.addRun, "F8");
  state = resetKeybinds(state);
  assert.equal(state.profiles.one.data.settings.keybinds.addRun, "+");
});

test("normalisation, capture et conflits de raccourcis sont cohérents", () => {
  assert.equal(normalizeShortcut("Control + g"), "Ctrl+g");
  assert.equal(shortcutFromEvent({ key: "g", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false }), "Ctrl+G");
  assert.equal(shortcutFromEvent({ key: "+", ctrlKey: false, altKey: false, shiftKey: true, metaKey: false }), "+");
  assert.equal(findShortcutConflict({ openGallery: "Ctrl+G" }, "ctrl+g")?.id, "openGallery");
});
