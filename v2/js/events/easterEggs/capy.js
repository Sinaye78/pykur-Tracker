const CAPY_IMAGE = "../familiers/pykur/assets/images/capy.png";

export function createCapyController(options = {}) {
  const {
    documentRef = document,
    store,
    persistence,
    notifications,
    onUnlock,
    resolveFamiliar,
    recordHistory
  } = options;
  const body = documentRef.body;
  const image = documentRef.querySelector(".familiar-image");
  const caption = documentRef.querySelector(".familiar-caption");
  let destroyed = false;

  function context(state = store.getState()) {
    const profile = state.profiles?.[state.active];
    const familiar = resolveFamiliar?.(profile?.data?.familiarId);
    return { state, profile, familiar, enabled: Boolean(profile?.data?.ui?.capyMode) };
  }

  function render(state = store.getState()) {
    if (destroyed) return;
    const { familiar, enabled } = context(state);
    body?.classList?.toggle("capy-mode", enabled);
    if (!familiar) return;
    if (image) {
      image.src = enabled ? CAPY_IMAGE : familiar.image;
      image.alt = enabled ? "Capykur" : familiar.label;
    }
    if (caption) caption.textContent = enabled ? "Progression du Capykur" : `Progression du ${familiar.label}`;
  }

  function setEnabled(enabled, settings = {}) {
    const current = context();
    if (!current.profile || current.enabled === Boolean(enabled)) return false;
    const next = store.updateState((draft) => {
      const profile = draft.profiles?.[draft.active];
      if (!profile) return draft;
      profile.data.ui ||= {};
      profile.data.ui.capyMode = Boolean(enabled);
      draft.updatedAt = new Date().toISOString();
      return draft;
    });
    const saved = persistence.save(next);
    if (!saved?.ok) {
      notifications?.error?.(saved?.error?.userMessage || "Impossible de sauvegarder le mode Capy.");
      return false;
    }
    if (enabled) {
      onUnlock?.("egg_capy");
      if (!settings.silent) {
        notifications?.notify?.({
          message: "Capy a colonisé le tracker. Votre familier est officiellement en pause goûter.",
          type: "capy"
        });
        recordHistory?.(next.active, { message: "Easter egg Capykur activé.", kind: "system" });
      }
    } else if (!settings.silent) {
      notifications?.error?.("L'espèce du Capybara est maintenant éteinte. Votre familier reprend son trône.");
      recordHistory?.(next.active, { message: "Easter egg Capykur désactivé.", kind: "warning" });
    }
    return true;
  }

  function handleImageError() {
    if (!isEnabled()) return;
    setEnabled(false, { silent: true });
    notifications?.error?.("Capy est introuvable. Retour du familier pour éviter un affichage cassé.");
  }

  function isEnabled() {
    return context().enabled;
  }

  function toggle() {
    return setEnabled(!isEnabled());
  }

  const unsubscribe = store.subscribe(render);
  image?.addEventListener?.("error", handleImageError);
  render();

  return Object.freeze({
    toggle,
    start: () => setEnabled(true),
    stop: (settings = {}) => setEnabled(false, settings),
    deactivate: () => setEnabled(false, { silent: true }),
    render,
    getElement: () => image,
    isEnabled,
    destroy() {
      destroyed = true;
      unsubscribe();
      image?.removeEventListener?.("error", handleImageError);
      body?.classList?.remove?.("capy-mode");
      const { familiar } = context();
      if (image && familiar) {
        image.src = familiar.image;
        image.alt = familiar.label;
      }
      if (caption && familiar) caption.textContent = `Progression du ${familiar.label}`;
    }
  });
}
