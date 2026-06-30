const VALID_TYPES = new Set(["info", "success", "warning", "error", "profile", "pause", "milestone", "rare", "toom", "aina"]);

function createButton(documentRef, label, className) {
  const button = documentRef.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

export function createToastRenderer(options = {}) {
  const documentRef = options.document || globalThis.document;
  if (!documentRef?.body) throw new Error("Document indisponible pour les notifications.");
  const maxVisible = Math.max(1, Number(options.maxVisible) || 6);
  const timers = new Map();
  let root = options.root || documentRef.querySelector("#toastRegion");

  if (!root) {
    root = documentRef.createElement("section");
    root.id = "toastRegion";
    root.className = "toast-region";
    root.setAttribute("aria-label", "Notifications");
    root.setAttribute("aria-live", "polite");
    root.setAttribute("aria-relevant", "additions");
    documentRef.body.append(root);
  }

  function remove(node) {
    const timer = timers.get(node);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(node);
    }
    node?.remove();
  }

  function clear() {
    for (const node of [...root.children]) remove(node);
  }

  function show(input = {}) {
    const type = VALID_TYPES.has(input.type) ? input.type : "info";
    const toast = documentRef.createElement("article");
    toast.className = `app-toast app-toast-${type} app-toast-${input.size || "normal"}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.tabIndex = 0;

    const content = documentRef.createElement("div");
    content.className = "app-toast-content";
    if (input.title) {
      const title = documentRef.createElement("strong");
      title.textContent = input.title;
      content.append(title);
    }
    const message = documentRef.createElement("span");
    message.textContent = String(input.message || "");
    content.append(message);
    toast.append(content);

    if (typeof input.action === "function") {
      const action = createButton(documentRef, input.actionLabel || "Annuler", "app-toast-action");
      action.addEventListener("click", (event) => {
        event.stopPropagation();
        input.action();
        remove(toast);
      });
      toast.append(action);
    }

    const close = createButton(documentRef, "×", "app-toast-close");
    close.setAttribute("aria-label", "Fermer la notification");
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      remove(toast);
    });
    toast.append(close);
    toast.addEventListener("click", () => remove(toast));
    toast.addEventListener("keydown", (event) => {
      if (["Enter", " ", "Escape"].includes(event.key)) {
        event.preventDefault();
        remove(toast);
      }
    });

    while (root.children.length >= maxVisible) remove(root.firstElementChild);
    root.append(toast);

    if (!input.persistent) {
      const duration = Math.max(1000, Math.min(15000, Number(input.duration) || 3200));
      timers.set(toast, setTimeout(() => remove(toast), duration));
    }
    return Object.freeze({ element: toast, close: () => remove(toast) });
  }

  return Object.freeze({ show, clear, destroy: clear, get root() { return root; } });
}
