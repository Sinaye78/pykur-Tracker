function isEditableTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
}

export function createSecretSequenceController(options = {}) {
  const { documentRef = document, commands = {} } = options;
  const entries = Object.entries(commands)
    .map(([word, action]) => [String(word).toLowerCase(), action])
    .filter(([word, action]) => word && typeof action === "function");
  let buffer = "";

  function handleKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target) || event.key?.length !== 1) {
      buffer = "";
      return;
    }
    const key = event.key.toLowerCase();
    let candidate = `${buffer}${key}`;
    let possible = entries.some(([word]) => word.startsWith(candidate));
    if (!possible) {
      candidate = key;
      possible = entries.some(([word]) => word.startsWith(candidate));
    }
    if (!possible) {
      buffer = "";
      return;
    }
    buffer = candidate;
    event.preventDefault();
    event.stopImmediatePropagation?.();
    const match = entries.find(([word]) => word === buffer);
    if (match) {
      buffer = "";
      match[1]();
    }
  }

  documentRef.addEventListener("keydown", handleKeydown, true);
  return Object.freeze({
    destroy() {
      buffer = "";
      documentRef.removeEventListener("keydown", handleKeydown, true);
    }
  });
}
