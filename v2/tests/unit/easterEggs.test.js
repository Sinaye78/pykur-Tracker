import assert from "node:assert/strict";
import test from "node:test";

import { collectSecretEgg, isSecretEggCollected } from "../../js/domain/easterEggs.js";
import { createEasterEggController } from "../../js/events/easterEggs.js";
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
  globalThis.document = { querySelector: (selector) => selector === "#hiddenSecretEgg" ? egg : null };
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
