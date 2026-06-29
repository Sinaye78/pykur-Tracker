import { findShortcutConflict, normalizeShortcut, shortcutFromEvent } from "../config/shortcuts.js";
import { updateKeybind } from "../domain/options.js";
import { selectSettings } from "../state/selectors.js";

function isTypingTarget(target) {
  return target?.matches?.("input, textarea, select, [contenteditable='true']");
}

export function createShortcutsController(options) {
  const { store, persistence, notifications, actions = {} } = options;
  let capture = null;

  function saveKey(actionId, value) {
    const next = updateKeybind(store.getState(), actionId, value);
    store.replaceState(next);
    const result = persistence.save(next);
    if (!result.ok) notifications?.error(result.error.userMessage);
    return result.ok;
  }

  function startCapture(actionId, onComplete) {
    capture = { actionId, onComplete };
    notifications?.info("Appuyez sur une touche. Échap annule, Suppr désactive.", { persistent: true });
  }

  function handleCapture(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      capture = null;
      notifications?.clear();
      return;
    }
    if (["Backspace", "Delete"].includes(event.key)) {
      event.preventDefault();
      const done = capture;
      capture = null;
      saveKey(done.actionId, "");
      notifications?.clear();
      notifications?.info("Raccourci désactivé.");
      done.onComplete?.();
      return;
    }
    const value = shortcutFromEvent(event);
    if (!value) return;
    event.preventDefault();
    const settings = selectSettings(store.getState()) || {};
    const conflict = findShortcutConflict(settings.keybinds, value, capture.actionId);
    if (conflict) {
      notifications?.warning(`Raccourci déjà utilisé par « ${conflict.label} ».`);
      return;
    }
    const done = capture;
    capture = null;
    if (saveKey(done.actionId, value)) notifications?.success(`Raccourci enregistré : ${value}.`);
    done.onComplete?.();
  }

  function handleShortcut(event) {
    if (capture) return handleCapture(event);
    const settings = selectSettings(store.getState()) || {};
    if (settings.shortcutsEnabled === false || isTypingTarget(event.target) || event.defaultPrevented) return;
    const value = normalizeShortcut(shortcutFromEvent(event)).toLowerCase();
    if (!value) return;
    const entry = Object.entries(settings.keybinds || {}).find(([, key]) => normalizeShortcut(key).toLowerCase() === value);
    if (!entry || typeof actions[entry[0]] !== "function") return;
    event.preventDefault();
    actions[entry[0]]();
  }

  document.addEventListener("keydown", handleShortcut);
  return Object.freeze({ startCapture, destroy() { document.removeEventListener("keydown", handleShortcut); } });
}
