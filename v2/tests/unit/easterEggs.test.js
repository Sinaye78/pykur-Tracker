import assert from "node:assert/strict";
import test from "node:test";

import { collectSecretEgg, isSecretEggCollected, recordHappiosHover } from "../../js/domain/easterEggs.js";
import { createProfile } from "../../js/domain/profiles.js";
import { resolveFamiliar } from "../../js/config/familiars.js";
import { createEasterEggController } from "../../js/events/easterEggs.js";
import { createAinaController } from "../../js/events/easterEggs/aina.js";
import { createAlhassController } from "../../js/events/easterEggs/alhass.js";
import { createBrakoController } from "../../js/events/easterEggs/brako.js";
import { createCapyController } from "../../js/events/easterEggs/capy.js";
import { createCharlieController } from "../../js/events/easterEggs/charlie.js";
import { createRajController } from "../../js/events/easterEggs/raj.js";
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

test("le troisieme survol de Happios demande le succes sans muter l'etat source", () => {
  const source = createDefaultState({ now: NOW });
  const first = recordHappiosHover(source, { now: NOW });
  const second = recordHappiosHover(first.state, { now: NOW });
  const third = recordHappiosHover(second.state, { now: NOW });
  const fourth = recordHappiosHover(third.state, { now: NOW });
  assert.equal(source.sharedAchievements.counters.happiosHover, 0);
  assert.equal(third.count, 3);
  assert.equal(third.shouldUnlock, true);
  assert.equal(fourth.count, 4);
  assert.equal(fourth.shouldUnlock, false);
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

test("le routeur reconnait Aina, Alhass, Brako, Capy, Charlie, Raj et Toom sans intercepter les formulaires", () => {
  const listeners = new Map();
  const calls = [];
  const documentRef = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); }
  };
  const controller = createSecretSequenceController({
    documentRef,
    commands: {
      aina: () => calls.push("aina"),
      alhass: () => calls.push("alhass"),
      brako: () => calls.push("brako"),
      capy: () => calls.push("capy"),
      charlie: () => calls.push("charlie"),
      raj: () => calls.push("raj"),
      toom: () => calls.push("toom")
    }
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
  type("raj");
  type("brako");
  type("alhass");
  type("capy");
  assert.deepEqual(calls, ["charlie", "toom", "aina", "raj", "brako", "alhass", "capy"]);
  controller.destroy();
  assert.equal(listeners.size, 0);
});

test("Capy remplace seulement l'identite visuelle du profil actif puis restaure son familier", () => {
  const created = createProfile(createDefaultState({ now: NOW }), { familiarId: "pykur", name: "Pykur test" }, {
    resolveFamiliar,
    idFactory: () => "p_capy",
    now: NOW
  });
  const store = createStateStore(created.state, { resolveFamiliar });
  const bodyClasses = new Set();
  const imageListeners = new Map();
  const image = {
    src: "",
    alt: "",
    addEventListener(type, listener) { imageListeners.set(type, listener); },
    removeEventListener(type, listener) { if (imageListeners.get(type) === listener) imageListeners.delete(type); }
  };
  const caption = { textContent: "" };
  const documentRef = {
    body: { classList: {
      toggle(name, enabled) { enabled ? bodyClasses.add(name) : bodyClasses.delete(name); },
      remove(name) { bodyClasses.delete(name); }
    } },
    querySelector(selector) {
      if (selector === ".familiar-image") return image;
      if (selector === ".familiar-caption") return caption;
      return null;
    }
  };
  const unlocked = [];
  const messages = [];
  let saves = 0;
  const controller = createCapyController({
    documentRef,
    store,
    resolveFamiliar,
    persistence: { save() { saves += 1; return { ok: true }; } },
    onUnlock: (id) => unlocked.push(id),
    notifications: {
      notify: ({ message }) => messages.push(message),
      error: (message) => messages.push(message)
    }
  });
  assert.equal(controller.start(), true);
  assert.equal(controller.isEnabled(), true);
  assert.ok(bodyClasses.has("capy-mode"));
  assert.ok(image.src.endsWith("/capy.png"));
  assert.equal(image.alt, "Capykur");
  assert.equal(caption.textContent, "Progression du Capykur");
  assert.deepEqual(unlocked, ["egg_capy"]);
  assert.equal(controller.deactivate(), true);
  assert.equal(controller.isEnabled(), false);
  assert.equal(bodyClasses.has("capy-mode"), false);
  assert.equal(image.src, resolveFamiliar("pykur").image);
  assert.equal(caption.textContent, "Progression du Pykur");
  assert.equal(saves, 2);
  assert.equal(messages.length, 1);
  controller.destroy();
  assert.equal(imageListeners.size, 0);
});

test("Alhass observe le tracker, respecte son cooldown et nettoie sa presence", () => {
  const bodyClasses = new Set();
  const attributes = new Map();
  const image = { src: "", dataset: { src: "../familiers/pykur/assets/images/alhass.png" } };
  const presence = {
    querySelector: (selector) => selector === "img" ? image : null,
    setAttribute(name, value) { attributes.set(`presence:${name}`, value); }
  };
  const veil = { setAttribute(name, value) { attributes.set(`veil:${name}`, value); } };
  const documentRef = {
    body: { classList: { toggle(name, enabled) { enabled ? bodyClasses.add(name) : bodyClasses.delete(name); } } },
    querySelector(selector) {
      if (selector === "#alhassPresence") return presence;
      if (selector === "#alhassVeil") return veil;
      return null;
    }
  };
  const unlocked = [];
  const messages = [];
  let clock = 1000;
  const controller = createAlhassController({
    documentRef,
    now: () => clock,
    random: () => 0,
    logger: { info() {} },
    onUnlock: (id) => unlocked.push(id),
    notifications: {
      notify: ({ message }) => messages.push(message),
      info: (message) => messages.push(message)
    }
  });
  assert.equal(controller.start(), true);
  assert.ok(bodyClasses.has("alhass-mode"));
  assert.equal(image.src, "../familiers/pykur/assets/images/alhass.png");
  assert.equal(attributes.get("presence:aria-hidden"), "false");
  assert.deepEqual(unlocked, ["egg_alhass"]);
  assert.equal(controller.react("run"), false);
  clock += 45000;
  assert.equal(controller.react("run"), "Alhass valide cette run.");
  assert.equal(controller.react("guard", true), "Alhass bloque l'excès avant qu'il ne devienne un bug.");
  assert.equal(controller.stop(), true);
  assert.equal(bodyClasses.has("alhass-mode"), false);
  assert.equal(attributes.get("veil:aria-hidden"), "true");
  assert.ok(messages.includes("Alhass retourne dans l'ombre."));
  controller.destroy();
});

test("Brako demarre sur desktop, debloque sa scene et nettoie son calque", async () => {
  const classes = new Set();
  const children = [];
  const layer = {
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); }
    },
    append(node) { children.push(node); },
    setAttribute() {},
    replaceChildren() { children.length = 0; }
  };
  const unlocked = [];
  const messages = [];
  const controller = createBrakoController({
    documentRef: { querySelector: () => layer, createElement() { throw new Error("Aucun acteur ne doit être créé sans fight()."); } },
    windowRef: { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) },
    autoRun: false,
    random: () => 0.9,
    onUnlock: (id) => unlocked.push(id),
    notifications: { notify: ({ message }) => messages.push(message), warning: (message) => messages.push(message) }
  });
  assert.equal(controller.start(), true);
  assert.equal(controller.isEnabled(), true);
  assert.ok(classes.has("is-active"));
  assert.deepEqual(unlocked, ["egg_brako"]);
  assert.equal(await controller.rollLoot(), false);
  assert.deepEqual(unlocked, ["egg_brako", "secret_brako_no_drop"]);
  assert.ok(messages.some((message) => message.includes("pas d'œuf")));
  assert.equal(controller.stop({ silent: true }), true);
  assert.equal(controller.isEnabled(), false);
  assert.equal(classes.has("is-active"), false);
  assert.equal(children.length, 0);
  controller.destroy();
});

test("Raj demande a Brako d'interrompre son combat au lieu de lancer une seconde scene", () => {
  const layer = { classList: { add() {}, remove() {} }, append() {}, setAttribute() {}, replaceChildren() {} };
  let interruptions = 0;
  const controller = createRajController({
    documentRef: { querySelector: () => layer },
    windowRef: { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) },
    autoRun: false,
    notifications: { notify() {}, warning() {} }
  });
  controller.setRivalController({
    isEnabled: () => true,
    requestRajInterrupt: () => { interruptions += 1; }
  });
  assert.equal(controller.start(), false);
  assert.equal(interruptions, 1);
  assert.equal(controller.isEnabled(), false);
  controller.destroy();
});

test("Raj se connecte sur desktop, debloque son succes et nettoie sa scene", () => {
  const classes = new Set();
  const children = [];
  const createElement = () => {
    const ownClasses = new Set();
    const node = {
      children: [],
      style: { setProperty() {} },
      classList: {
        add(...values) { values.forEach((value) => ownClasses.add(value)); },
        remove(...values) { values.forEach((value) => ownClasses.delete(value)); },
        contains(value) { return ownClasses.has(value); }
      },
      append(...values) { node.children.push(...values); },
      prepend(...values) { node.children.unshift(...values); },
      querySelector(selector) {
        if (selector === "img") return node.children.find((child) => child.tagName === "IMG") || null;
        return null;
      },
      remove() { node.removed = true; },
      setAttribute() {}
    };
    return node;
  };
  const layer = {
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); }
    },
    append(node) { children.push(node); },
    setAttribute() {},
    replaceChildren() { children.length = 0; }
  };
  const documentRef = {
    createElement(tagName) {
      const node = createElement();
      node.tagName = tagName.toUpperCase();
      return node;
    },
    querySelector: () => layer
  };
  const unlocked = [];
  const messages = [];
  const controller = createRajController({
    documentRef,
    windowRef: { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) },
    autoRun: false,
    onUnlock: (id) => unlocked.push(id),
    notifications: {
      notify: ({ message }) => messages.push(message),
      warning: (message) => messages.push(message)
    }
  });
  assert.equal(controller.start(), true);
  assert.equal(controller.isEnabled(), true);
  assert.ok(classes.has("is-active"));
  assert.deepEqual(unlocked, ["egg_raj"]);
  assert.ok(children.length > 0);
  assert.match(children[0].className, /interactive/);
  assert.ok(children[0].children.some((child) => child.className === "raj-nameplate"));
  assert.equal(controller.stop(), true);
  assert.equal(controller.isEnabled(), false);
  assert.equal(classes.has("is-active"), false);
  assert.equal(children.length, 0);
  assert.ok(messages.some((message) => message.includes("connect")));
  controller.destroy();
});

test("Raj peut capturer un easter egg actif via son contrat public", () => {
  const makeNode = () => {
    const classes = new Set();
    const node = {
      children: [],
      style: { setProperty() {} },
      classList: {
        add(...values) { values.forEach((value) => classes.add(value)); },
        remove(...values) { values.forEach((value) => classes.delete(value)); },
        contains(value) { return classes.has(value); }
      },
      append(...nodes) { node.children.push(...nodes); },
      prepend(...nodes) { node.children.unshift(...nodes); },
      querySelector(selector) {
        if (selector === "img") return node.children.find((child) => child.tagName === "IMG") || null;
        if (selector === ".raj-dofus-trophy") return null;
        return null;
      },
      remove() {},
      setAttribute() {}
    };
    return node;
  };
  const layer = { classList: { add() {}, remove() {} }, append() {}, setAttribute() {}, replaceChildren() {} };
  let deactivated = 0;
  const targetElement = { getBoundingClientRect: () => ({ left: 500, top: 300, width: 120, height: 100 }) };
  const messages = [];
  const controller = createRajController({
    documentRef: {
      querySelector: () => layer,
      createElement: (tag) => Object.assign(makeNode(), { tagName: tag.toUpperCase() })
    },
    windowRef: { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) },
    autoRun: false,
    targets: [{
      id: "toom",
      label: "Toom",
      controller: {
        isEnabled: () => true,
        getElement: () => targetElement,
        deactivate: () => { deactivated += 1; }
      }
    }],
    notifications: { notify: ({ message }) => messages.push(message), warning() {} }
  });
  controller.start();
  assert.equal(controller.claimAvailableTarget("toom"), true);
  assert.equal(deactivated, 1);
  assert.ok(messages.some((message) => message.includes("NRG 500")));
  controller.destroy();
});

test("Raj annule proprement une ronde Happios encore en attente", async () => {
  const timers = new Map();
  const appended = [];
  let timerId = 0;
  const makeNode = () => {
    const listeners = new Map();
    return {
      children: [],
      style: { setProperty() {} },
      classList: { add() {}, remove() {}, contains() { return false; } },
      append(...nodes) { this.children.push(...nodes); },
      prepend(...nodes) { this.children.unshift(...nodes); },
      querySelector(selector) { return selector === "img" ? this.children[0] || null : null; },
      addEventListener(type, listener) { listeners.set(type, listener); },
      emit(type) { listeners.get(type)?.(); },
      remove() {},
      setAttribute() {}
    };
  };
  const layer = { classList: { add() {}, remove() {} }, append(node) { appended.push(node); }, setAttribute() {}, replaceChildren() {} };
  let hoverCount = 0;
  const controller = createRajController({
    documentRef: {
      querySelector: () => layer,
      createElement: (tag) => Object.assign(makeNode(), { tagName: tag.toUpperCase() })
    },
    windowRef: { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) },
    autoRun: false,
    onHappiosHover: () => { hoverCount += 1; },
    setTimer(callback) { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimer(id) { timers.delete(id); },
    notifications: { notify() {}, warning() {} }
  });
  controller.start();
  const moderation = controller.moderateNow();
  appended[1].emit("mouseenter");
  appended[1].emit("mouseenter");
  appended[1].emit("mouseenter");
  assert.equal(hoverCount, 3);
  assert.equal(timers.size, 1);
  controller.stop({ silent: true });
  assert.equal(timers.size, 0);
  assert.equal(await moderation, false);
  controller.destroy();
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
