export function createModalController(root = document.querySelector("#appModal")) {
  if (!root) throw new Error("Fenêtre modale V2 introuvable.");

  const title = root.querySelector("#appModalTitle");
  const subtitle = root.querySelector("#appModalSubtitle");
  const body = root.querySelector("#appModalBody");
  const footer = root.querySelector("#appModalFooter");
  let open = false;
  let lastFocused = null;

  function close() {
    if (!open) return;
    root.hidden = true;
    open = false;
    body.replaceChildren();
    footer.replaceChildren();
    lastFocused?.focus?.();
  }

  function show(dialogTitle, dialogSubtitle = "") {
    lastFocused = document.activeElement;
    title.textContent = dialogTitle;
    subtitle.textContent = dialogSubtitle;
    body.replaceChildren();
    footer.replaceChildren();
    root.hidden = false;
    open = true;
    return Object.freeze({ body, footer });
  }

  function showError(message) {
    body.querySelector(".dialog-error")?.remove();
    const notice = document.createElement("p");
    notice.className = "dialog-error";
    notice.setAttribute("role", "alert");
    notice.textContent = message;
    body.prepend(notice);
  }

  root.querySelector(".modal-close").addEventListener("click", close);
  root.addEventListener("click", (event) => { if (event.target === root) close(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && open) close(); });

  return Object.freeze({ show, close, showError, get body() { return body; }, get footer() { return footer; } });
}
