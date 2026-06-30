const REACTION_SOUND = "../familiers/pykur/assets/sons/reset_soft.wav";
const REACTION_DELAY = 900;
const REACTIONS = Object.freeze([
  "Impossible de récupérer le Dofus Ivoire.",
  "Ce drop appartient déjà à Aina.",
  "Probabilité de récupération : 0.000001%."
]);

export function createAinaController(options = {}) {
  const {
    documentRef = document,
    notifications,
    audio,
    onUnlock,
    now = () => Date.now(),
    random = Math.random
  } = options;
  const overlay = documentRef.querySelector("#ainaOverlay");
  const dofus = documentRef.querySelector("#ainaDofus");
  let enabled = false;
  let lastReaction = 0;
  let destroyed = false;

  function react() {
    if (!enabled || destroyed) return false;
    const current = now();
    if (current - lastReaction < REACTION_DELAY) return false;
    lastReaction = current;
    audio?.play(REACTION_SOUND, { gain: 0.7 });
    const index = Math.min(REACTIONS.length - 1, Math.floor(random() * REACTIONS.length));
    notifications?.notify({ message: REACTIONS[index], type: "aina" });
    return true;
  }

  function setEnabled(value, options = {}) {
    if (!overlay || destroyed || enabled === Boolean(value)) return enabled;
    enabled = Boolean(value);
    documentRef.body.classList.toggle("aina-mode", enabled);
    overlay.classList.toggle("is-active", enabled);
    overlay.setAttribute?.("aria-hidden", String(!enabled));
    if (enabled) {
      onUnlock?.("egg_aina");
      if (!options.silent) notifications?.notify({ message: "Aina brandit le Dofus Ivoire.", type: "aina" });
    } else if (!options.silent) {
      notifications?.info("Le Dofus Ivoire disparaît dans la brume.");
    }
    return enabled;
  }

  function toggle() {
    return setEnabled(!enabled);
  }

  dofus?.addEventListener("click", react);

  return Object.freeze({
    toggle,
    react,
    isEnabled: () => enabled,
    destroy() {
      setEnabled(false, { silent: true });
      destroyed = true;
      dofus?.removeEventListener("click", react);
    }
  });
}
