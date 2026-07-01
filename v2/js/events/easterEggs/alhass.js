const REACTIONS = Object.freeze({
  run: Object.freeze([
    "Alhass valide cette run.",
    "Alhass inspecte le tracker...",
    "Aucun bug détecté."
  ]),
  milestone: Object.freeze([
    "Le testeur légendaire observe la progression.",
    "Alhass garde l'expédition sous contrôle."
  ]),
  guard: Object.freeze([
    "Alhass bloque l'excès avant qu'il ne devienne un bug."
  ])
});

export function createAlhassController(options = {}) {
  const {
    documentRef = document,
    notifications,
    onUnlock,
    random = Math.random,
    now = Date.now,
    logger = console
  } = options;
  const body = documentRef.body;
  const veil = documentRef.querySelector("#alhassVeil");
  const presence = documentRef.querySelector("#alhassPresence");
  const image = presence?.querySelector?.("img");
  let active = false;
  let lastReaction = 0;
  let destroyed = false;

  function setVisible(visible) {
    body?.classList?.toggle("alhass-mode", visible);
    veil?.setAttribute?.("aria-hidden", visible ? "false" : "true");
    presence?.setAttribute?.("aria-hidden", visible ? "false" : "true");
  }

  function hydrateImage() {
    if (!image || image.src) return;
    const source = image.dataset?.src || image.getAttribute?.("data-src");
    if (source) image.src = source;
  }

  function start() {
    if (destroyed || active || !presence || !veil) return false;
    active = true;
    lastReaction = now();
    hydrateImage();
    setVisible(true);
    onUnlock?.("egg_alhass");
    notifications?.notify?.({ message: "Alhass a rejoint l'expédition.", type: "rare" });
    logger?.info?.("[Alhass] Inspection du tracker...");
    logger?.info?.("[Alhass] Aucun bug critique détecté.");
    return true;
  }

  function stop(settings = {}) {
    if (!active) return false;
    active = false;
    lastReaction = 0;
    setVisible(false);
    if (!settings.silent) notifications?.info?.("Alhass retourne dans l'ombre.");
    logger?.info?.("[Alhass] Observation terminée.");
    return true;
  }

  function react(context = "run", force = false) {
    if (!active) return false;
    const current = now();
    if (!force && current - lastReaction < 45000) return false;
    if (!force && random() > 0.16) return false;
    lastReaction = current;
    const messages = REACTIONS[context] || REACTIONS.run;
    const message = messages[Math.floor(random() * messages.length)];
    notifications?.notify?.({ message, type: context === "guard" ? "warning" : "rare" });
    return message;
  }

  function toggle() {
    return active ? !stop() : start();
  }

  return Object.freeze({
    toggle,
    start,
    stop,
    deactivate: () => stop({ silent: true }),
    react,
    getElement: () => presence,
    isEnabled: () => active,
    getLastReaction: () => lastReaction,
    destroy() {
      stop({ silent: true });
      setVisible(false);
      destroyed = true;
    }
  });
}
