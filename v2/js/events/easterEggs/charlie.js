export function createCharlieController(options = {}) {
  const {
    documentRef = document,
    notifications,
    onUnlock,
    setTimer = setTimeout,
    clearTimer = clearTimeout
  } = options;
  const cursor = documentRef.querySelector("#charlieCursor");
  let enabled = false;
  let chompTimer = null;
  let destroyed = false;

  function position(clientX, clientY) {
    if (!cursor || !enabled) return;
    cursor.style.setProperty("--charlie-x", `${clientX - 18}px`);
    cursor.style.setProperty("--charlie-y", `${clientY - 8}px`);
  }

  function animateClick(event) {
    if (!cursor || !enabled) return;
    position(event.clientX, event.clientY);
    cursor.classList.remove("is-chomping");
    void cursor.offsetWidth;
    cursor.classList.add("is-chomping");
    if (chompTimer) clearTimer(chompTimer);
    chompTimer = setTimer(() => {
      chompTimer = null;
      cursor.classList.remove("is-chomping");
    }, 240);
  }

  function setEnabled(value, options = {}) {
    if (!cursor || destroyed || enabled === Boolean(value)) return enabled;
    enabled = Boolean(value);
    documentRef.body.classList.toggle("charlie-mode", enabled);
    if (enabled) {
      onUnlock?.("egg_charlie");
      if (!options.silent) notifications?.info("Charlie est là");
    } else {
      if (chompTimer) clearTimer(chompTimer);
      chompTimer = null;
      cursor.classList.remove("is-chomping");
      cursor.removeAttribute("style");
      if (!options.silent) notifications?.info("Charlie est reparti");
    }
    return enabled;
  }

  function toggle() {
    return setEnabled(!enabled);
  }

  function handlePointerMove(event) {
    position(event.clientX, event.clientY);
  }

  documentRef.addEventListener("pointermove", handlePointerMove, { passive: true });
  documentRef.addEventListener("pointerdown", animateClick, true);

  return Object.freeze({
    toggle,
    isEnabled: () => enabled,
    destroy() {
      setEnabled(false, { silent: true });
      destroyed = true;
      documentRef.removeEventListener("pointermove", handlePointerMove, { passive: true });
      documentRef.removeEventListener("pointerdown", animateClick, true);
    }
  });
}
