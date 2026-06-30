import assert from "node:assert/strict";
import test from "node:test";

import { collectSecretEgg, isSecretEggCollected } from "../../js/domain/easterEggs.js";
import { createEasterEggController } from "../../js/events/easterEggs.js";
import { createAinaController } from "../../js/events/easterEggs/aina.js";
import { createCharlieController } from "../../js/events/easterEggs/charlie.js";
import { createSecretSequenceController } from "../../js/events/easterEggs/sequence.js";
import { createToomController } from "../../js/events/easterEggs/toom.js";
import { createDefaultState } from "../../js/state/defaults.js";
import { createStateStore } from "../../js/state/store.js";

const NOW = "2026-06-30T18:00:00.000Z";

test("la collecte de l'oeuf est immutable et persistante", () => {
  const source = createDefaultState({ now: NOW });
  const result = collectSecretEgg(source, { now: NOW });
  assert.equal(result.collected, true);
  assert.equal(isSecretEggCollected(result.state), true);
  assert.equal(isSecretEggCollected(source), false);
  assert.equal(result.state.updatedAt, NOW);
});

test("un oeuf deja collecte ne peut pas etre collecte deux fois", () => {
  const first = collectSecretEgg(createDefaultState(), { now: NOW });
  const second = collectSecretEgg(first.state, { now: "2026-06-30T18:01:00.000Z" });
  assert.equal(second.collected, false);
  assert.equal(second.state, first.state);
  assert.equal(second.state.updatedAt, NOW);
});

test("le controleur persiste et notifie une seule collecte puis nettoie son ecouteur", () => {
  const listeners = new Map();
  const egg = {
    hidden: true,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); }
  };
  const previousDocument = globalThis.document;
  globalThis.document = {
    body: { classList: { toggle() {} } },
    querySelector: (selector) => selector === "#hiddenSecretEgg" ? egg : null,
    addEventListener(type, listener) { listeners.set(`document:${type}`, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(`document:${type}`) === listener) listeners.delete(`document:${type}`);
    }
  };
  const store = createStateStore(createDefaultState());
  let saves = 0;
  let notifications = 0;
  try {
    const controller = createEasterEggController({
      store,
      persistence: { save() { saves += 1; return { ok: true }; } },
      notifications: { notify() { notifications += 1; } }
    });
    assert.equal(egg.hidden, false);
    assert.equal(controller.collect(), true);
    assert.equal(controller.collect(), false);
    assert.equal(egg.hidden, true);
    assert.equal(saves, 1);
    assert.equal(notifications, 1);
    controller.destroy();
    assert.equal(listeners.has("click"), false);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("Charlie active puis desactive son curseur et nettoie ses ecouteurs", () => {
  const listeners = new Map();
  const bodyClasses = new Set();
  const cursorClasses = new Set();
  const styles = new Map();
  const cursor = {
    offsetWidth: 54,
    style: { setProperty(key, value) { styles.set(key, value); } },
    classList: {
      add(value) { cursorClasses.add(value); },
      remove(value) { cursorClasses.delete(value); }
    },
    removeAttribute(name) { if (name === "style") styles.clear(); }
  };
  const documentRef = {
    body: { classList: { toggle(name, enabled) { enabled ? bodyClasses.add(name) : bodyClasses.delete(name); } } },
    querySelector: () => cursor,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); }
  };
  const unlocked = [];
  const messages = [];
  const controller = createCharlieController({
    documentRef,
    onUnlock: (id) => unlocked.push(id),
    notifications: { info: (message) => messages.push(message) }
  });
  controller.toggle();
  assert.equal(controller.isEnabled(), true);
  assert.ok(bodyClasses.has("charlie-mode"));
  assert.deepEqual(unlocked, ["egg_charlie"]);
  listeners.get("pointermove")({ clientX: 100, clientY: 80 });
  assert.equal(styles.get("--charlie-x"), "82px");
  assert.equal(styles.get("--charlie-y"), "72px");
  controller.toggle();
  assert.equal(controller.isEnabled(), false);
  assert.deepEqual(messages, ["Charlie est là", "Charlie est reparti"]);
  controller.destroy();
  assert.equal(listeners.size, 0);
});

test("le routeur reconnait Aina, Charlie et Toom sans intercepter les formulaires", () => {
  const listeners = new Map();
  const calls = [];
  const documentRef = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); }
  };
  const controller = createSecretSequenceController({
    documentRef,
    commands: { aina: () => calls.push("aina"), charlie: () => calls.push("charlie"), toom: () => calls.push("toom") }
  });
  const type = (word, target = { closest: () => null }) => {
    for (const key of word) listeners.get("keydown")({
      key,
      target,
      preventDefault() {},
      stopImmediatePropagation() {}
    });
  };
  type("toom", { closest: () => true });
  assert.deepEqual(calls, []);
  type("charlie");
  type("toom");
  type("aina");
  assert.deepEqual(calls, ["charlie", "toom", "aina"]);
  controller.destroy();
  assert.equal(listeners.size, 0);
});

test("Toom affiche la NRG, debloque son succes puis se nettoie", () => {
  const bodyClasses = new Set();
  const overlayClasses = new Set();
  const overlay = { classList: { toggle(name, enabled) { enabled ? overlayClasses.add(name) : overlayClasses.delete(name); } } };
  const documentRef = {
    body: { classList: { toggle(name, enabled) { enabled ? bodyClasses.add(name) : bodyClasses.delete(name); } } },
    querySelector: () => overlay
  };
  const unlocked = [];
  const notifications = [];
  const controller = createToomController({
    documentRef,
    onUnlock: (id) => unlocked.push(id),
    notifications: {
      notify: (value) => notifications.push(value.message),
      warning: (message) => notifications.push(message)
    }
  });
  assert.equal(controller.toggle(), true);
  assert.ok(bodyClasses.has("toom-mode"));
  assert.ok(overlayClasses.has("is-active"));
  assert.deepEqual(unlocked, ["egg_toom"]);
  assert.equal(controller.toggle(), false);
  assert.equal(bodyClasses.has("toom-mode"), false);
  assert.equal(overlayClasses.has("is-active"), false);
  assert.deepEqual(notifications, ["Félicitations, Toom a obtenu une NRG 500.", "Nipsey a récupéré la NRG 500."]);
  controller.destroy();
});

test("Aina limite les clics sur l'Ivoire, joue le son et nettoie la scene", () => {
  const bodyClasses = new Set();
  const overlayClasses = new Set();
  const dofusListeners = new Map();
  const overlay = { classList: { toggle(name, enabled) { enabled ? overlayClasses.add(name) : overlayClasses.delete(name); } } };
  const dofus = {
    addEventListener(type, listener) { dofusListeners.set(type, listener); },
    removeEventListener(type, listener) { if (dofusListeners.get(type) === listener) dofusListeners.delete(type); }
  };
  const documentRef = {
    body: { classList: { toggle(name, enabled) { enabled ? bodyClasses.add(name) : bodyClasses.delete(name); } } },
    querySelector(selector) {
      if (selector === "#ainaOverlay") return overlay;
      if (selector === "#ainaDofus") return dofus;
      return null;
    }
  };
  const unlocked = [];
  const messages = [];
  const sounds = [];
  let clock = 1000;
  const controller = createAinaController({
    documentRef,
    now: () => clock,
    random: () => 0,
    onUnlock: (id) => unlocked.push(id),
    audio: { play: (source) => sounds.push(source) },
    notifications: {
      notify: (value) => messages.push(value.message),
      info: (message) => messages.push(message)
    }
  });
  assert.equal(controller.toggle(), true);
  assert.deepEqual(unlocked, ["egg_aina"]);
  assert.ok(bodyClasses.has("aina-mode"));
  assert.ok(overlayClasses.has("is-active"));
  assert.equal(dofusListeners.get("click")(), true);
  clock = 1500;
  assert.equal(dofusListeners.get("click")(), false);
  clock = 1900;
  assert.equal(dofusListeners.get("click")(), true);
  assert.equal(sounds.length, 2);
  assert.ok(sounds.every((source) => source.endsWith("reset_soft.wav")));
  assert.equal(controller.toggle(), false);
  assert.equal(bodyClasses.has("aina-mode"), false);
  assert.equal(overlayClasses.has("is-active"), false);
  assert.deepEqual(messages, [
    "Aina brandit le Dofus Ivoire.",
    "Impossible de récupérer le Dofus Ivoire.",
    "Impossible de récupérer le Dofus Ivoire.",
    "Le Dofus Ivoire disparaît dans la brume."
  ]);
  controller.destroy();
  assert.equal(dofusListeners.size, 0);
});
