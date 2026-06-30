export function createToomController(options = {}) {
  const { documentRef = document, notifications, onUnlock } = options;
  const overlay = documentRef.querySelector("#toomOverlay");
  let enabled = false;
  let destroyed = false;

  function setEnabled(value, options = {}) {
    if (!overlay || destroyed || enabled === Boolean(value)) return enabled;
    enabled = Boolean(value);
    documentRef.body.classList.toggle("toom-mode", enabled);
    overlay.classList.toggle("is-active", enabled);
    if (enabled) {
      onUnlock?.("egg_toom");
      if (!options.silent) notifications?.notify({
        message: "Félicitations, Toom a obtenu une NRG 500.",
        type: "toom"
      });
    } else if (!options.silent) {
      notifications?.warning("Nipsey a récupéré la NRG 500.");
    }
    return enabled;
  }

  function toggle() {
    return setEnabled(!enabled);
  }

  return Object.freeze({
    toggle,
    isEnabled: () => enabled,
    destroy() {
      setEnabled(false, { silent: true });
      destroyed = true;
    }
  });
}
