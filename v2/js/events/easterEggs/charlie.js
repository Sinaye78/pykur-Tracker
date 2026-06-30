const TRIGGER = "charlie";

function isEditableTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
}

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
  let sequenceIndex = 0;
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

  function handleKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target) || event.key?.length !== 1) {
      sequenceIndex = 0;
      return;
    }
    const key = event.key.toLowerCase();
    if (key === TRIGGER[sequenceIndex]) {
      sequenceIndex += 1;
      event.preventDefault();
      event.stopImmediatePropagation?.();
      if (sequenceIndex === TRIGGER.length) {
        sequenceIndex = 0;
        toggle();
      }
      return;
    }
    sequenceIndex = key === TRIGGER[0] ? 1 : 0;
    if (sequenceIndex) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  }

  documentRef.addEventListener("keydown", handleKeydown, true);
  documentRef.addEventListener("pointermove", handlePointerMove, { passive: true });
  documentRef.addEventListener("pointerdown", animateClick, true);

  return Object.freeze({
    toggle,
    isEnabled: () => enabled,
    destroy() {
      setEnabled(false, { silent: true });
      destroyed = true;
      documentRef.removeEventListener("keydown", handleKeydown, true);
      documentRef.removeEventListener("pointermove", handlePointerMove, { passive: true });
      documentRef.removeEventListener("pointerdown", animateClick, true);
    }
  });
}
