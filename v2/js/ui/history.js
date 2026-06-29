import {
  HISTORY_KINDS,
  appendHistoryEntry,
  clearHistory,
  groupHistoryByDay,
  selectHistoryEntries,
  summarizeHistory
} from "../domain/history.js";
import { selectActiveProfile } from "../state/selectors.js";

const KIND_LABELS = Object.freeze({
  all: "Toutes",
  progression: "Progression",
  chrono: "Chrono & session",
  profile: "Profils",
  edit: "Corrections",
  milestone: "Paliers",
  system: "Système",
  error: "Erreurs"
});

const KIND_ICONS = Object.freeze({ progression: "+", chrono: "◷", profile: "P", edit: "~", milestone: "★", system: "•", error: "!" });

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, className = "button button-neutral") {
  const node = element("button", className, label);
  node.type = "button";
  return node;
}

function formatDay(value) {
  if (value === "unknown") return "Date inconnue";
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
  if (value === todayKey) return "Aujourd'hui";
  if (value === yesterday) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--:--" : date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function createHistoryController(options) {
  const { store, persistence, modal, notifications } = options;
  const openButton = document.querySelector("#historyOpen");
  const status = document.querySelector("#progressionStatus");
  let filters = { kind: "all", query: "" };

  function announce(message, error = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", error);
    notifications?.notify({ message, type: error ? "error" : "info" });
  }

  function persist(nextState) {
    store.replaceState(nextState);
    const result = persistence.save(store.getState());
    if (!result.ok) announce(result.error.userMessage, true);
    return result.ok;
  }

  function record(profileId, input, recordOptions = {}) {
    try {
      const result = appendHistoryEntry(store.getState(), profileId, input, recordOptions);
      return persist(result.state) ? result.entry : null;
    } catch (error) {
      announce(error.message, true);
      return null;
    }
  }

  function draw() {
    const profile = selectActiveProfile(store.getState());
    if (!profile) return;
    const stats = summarizeHistory(profile.data);
    const entries = selectHistoryEntries(profile.data, filters);
    const controls = element("section", "history-controls");
    const search = element("input", "history-search");
    search.type = "search";
    search.placeholder = "Rechercher une action...";
    search.value = filters.query;
    search.setAttribute("aria-label", "Rechercher dans l'historique");
    const select = element("select", "history-filter");
    select.setAttribute("aria-label", "Filtrer l'historique par catégorie");
    for (const kind of ["all", ...HISTORY_KINDS]) {
      const option = element("option", "", KIND_LABELS[kind]);
      option.value = kind;
      select.append(option);
    }
    select.value = filters.kind;
    controls.append(search, select);

    const summary = element("section", "history-summary");
    for (const [label, value] of [["Aujourd'hui", stats.today], ["Total", stats.total], ["Progression", stats.progression], ["Chrono", stats.chrono]]) {
      const card = element("div");
      card.append(element("span", "", label), element("strong", "", String(value)));
      summary.append(card);
    }

    const timeline = element("div", "history-timeline");
    for (const group of groupHistoryByDay(entries)) {
      const section = element("section", "history-day");
      const heading = element("header", "history-day-heading");
      heading.append(element("strong", "", formatDay(group.date)), element("span", "", String(group.entries.reduce((sum, entry) => sum + entry.count, 0))));
      const list = element("div", "history-list");
      for (const entry of group.entries) {
        const row = element("article", `history-row is-${entry.kind}`);
        row.append(
          element("time", "history-time", formatTime(entry.date)),
          element("span", "history-icon", KIND_ICONS[entry.kind] || "•"),
          element("span", "history-message", entry.message)
        );
        if (entry.count > 1) row.append(element("span", "history-repeat", `×${entry.count}`));
        list.append(row);
      }
      section.append(heading, list);
      timeline.append(section);
    }
    if (!entries.length) {
      const empty = element("div", "history-empty");
      empty.append(element("strong", "", "Aucune action trouvée"), element("span", "", "Les donjons, sessions et corrections importantes apparaîtront ici."));
      timeline.append(empty);
    }

    modal.body.replaceChildren(controls, summary, timeline);
    search.addEventListener("input", () => { filters.query = search.value; draw(); queueMicrotask(() => modal.body.querySelector(".history-search")?.focus()); });
    select.addEventListener("change", () => { filters.kind = select.value; draw(); });
  }

  function confirmClear() {
    modal.show("Effacer l'historique", "Cette action supprime la timeline du profil actif.");
    const warning = element("div", "profile-delete-warning");
    warning.append(element("strong", "", "Historique du profil"), element("p", "", "Les actions enregistrées seront définitivement supprimées. La progression ne sera pas modifiée."));
    modal.body.append(warning);
    const cancel = button("Annuler");
    cancel.addEventListener("click", open);
    const clear = button("Effacer", "button button-danger");
    clear.addEventListener("click", () => {
      const state = store.getState();
      if (state.active && persist(clearHistory(state, state.active))) {
        announce("Historique effacé.");
        open();
      }
    });
    modal.footer.append(cancel, clear);
  }

  function open() {
    const profile = selectActiveProfile(store.getState());
    if (!profile) return;
    modal.show("Historique", `Retrouvez les actions importantes du profil ${profile.name}.`);
    draw();
    const clear = button("Effacer l'historique", "button button-danger");
    clear.disabled = !(profile.data.activity || []).length;
    clear.addEventListener("click", confirmClear);
    const close = button("Fermer");
    close.addEventListener("click", modal.close);
    modal.footer.append(clear, close);
  }

  openButton?.addEventListener("click", open);
  return Object.freeze({ open, record });
}
