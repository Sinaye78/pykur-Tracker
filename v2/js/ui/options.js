import {
  resetKeybinds,
  setOptionsShared,
  updateNotificationDuration,
  updateSetting,
  updateSoundVolume
} from "../domain/options.js";
import { SHORTCUT_ACTIONS } from "../config/shortcuts.js";
import { selectSettings } from "../state/selectors.js";

const SECTIONS = Object.freeze([
  { id: "appearance", label: "Apparence", description: "Ambiance, lisibilité et intensité visuelle du tracker." },
  { id: "interface", label: "Interface", description: "Densité et comportement général de l'application." },
  { id: "chrono", label: "Chrono", description: "Comportement du suivi de session et des runs." },
  { id: "notifications", label: "Notifications", description: "Durée, taille et priorité des messages d'action." },
  { id: "shortcuts", label: "Raccourcis", description: "Touches rapides, désactivées pendant la saisie." },
  { id: "links", label: "Liens profils", description: "Données communes ou propres à chaque profil." },
  { id: "accessibility", label: "Accessibilité", description: "Contraste, saturation et taille de lecture." }
]);

const CONTROLS = Object.freeze({
  appearance: [
    ["select", "visualIntensity", "Intensité visuelle", "Règle la présence des effets décoratifs.", [["minimal", "Minimal"], ["standard", "Standard"], ["premium", "Premium FX"]]],
    ["select", "uiOpacity", "Opacité UI", "Ajuste la matière des panneaux.", [["opaque", "Opaque"], ["medium", "Moyenne"], ["glass", "Transparente"]]],
    ["select", "performanceMode", "Mode performance", "Auto détecte les appareils modestes.", [["auto", "Automatique"], ["on", "Forcé"], ["off", "Désactivé"]]],
    ["toggle", "night", "Mode nuit", "Assombrit l'interface."],
    ["toggle", "animations", "Animations", "Active les transitions et effets légers."],
    ["toggle", "tooltips", "Infobulles", "Affiche les aides au survol et au focus."]
  ],
  interface: [
    ["select", "dashboardMode", "Dashboard", "Choisit la densité des informations.", [["simple", "Simplifié"], ["focus", "Focus"], ["tryhard", "Tryhard"], ["analytics", "Analytics"]]],
    ["toggle", "hudMode", "Mode HUD", "Préserve le choix du cockpit personnalisable."],
    ["toggle", "livingEvents", "Événements vivants", "Autorise les événements cosmétiques lorsqu'ils seront migrés."],
    ["toggle", "passiveAmbience", "Ambiances passives", "Autorise les ambiances discrètes lorsqu'elles seront migrées."]
  ],
  chrono: [
    ["select", "chronoStyle", "Style chrono", "Adapte la présentation du panneau live.", [["technical", "Technique"], ["fantasy", "Fantasy"], ["compact", "Compact"], ["overlay", "Overlay"]]],
    ["toggle", "showMilliseconds", "Dixièmes de seconde", "Affiche les dixièmes lorsque le chrono tourne."],
    ["toggle", "autoDungeonEstimate", "Estimation automatique", "Utilise les temps moyens sans modifier la progression."],
    ["toggle", "autoMarkOnPlus", "Marquage automatique", "+ Run marque le temps si le chrono tourne."],
    ["toggle", "chronoAutoStartOnRun", "Démarrage au premier run", "Lance Session & Chrono au premier + Run."],
    ["toggle", "sound", "Son global", "Active ou coupe les sons du tracker."],
    ["range", "soundVolume", "Volume", "Volume général du tracker, de 0 à 100."]
  ],
  notifications: [
    ["select", "notificationSize", "Taille", "Taille visuelle des messages.", [["small", "Compacte"], ["normal", "Normale"], ["large", "Large"]]],
    ["duration", "notificationDuration", "Durée", "Temps d'affichage avant fermeture.", [[1800, "Courte"], [3200, "Normale"], [5200, "Longue"]]],
    ["toggle", "notifications", "Notifications", "Affiche les retours d'action."],
    ["toggle", "disableMinorNotifications", "Masquer les mineures", "Conserve les messages importants."],
    ["toggle", "notificationsPersistent", "Persistantes", "Attend une fermeture manuelle."]
  ],
  accessibility: [
    ["toggle", "highContrast", "Contraste élevé", "Renforce la séparation des panneaux et des textes."],
    ["toggle", "reducedSaturation", "Saturation réduite", "Calme les couleurs de l'interface."],
    ["toggle", "largeFont", "Police plus grande", "Augmente la taille générale du texte."]
  ]
});

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function performanceModeActive(settings) {
  if (settings.performanceMode === "on") return true;
  if (settings.performanceMode === "off") return false;
  return (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || (navigator.deviceMemory && navigator.deviceMemory <= 4);
}

export function createOptionsController(options) {
  const { store, persistence, modal, notifications } = options;
  const openButton = document.querySelector("#optionsOpen");
  const soundButton = document.querySelector("#soundToggle");
  const soundIcon = document.querySelector("#soundToggleIcon");
  let activeSection = "appearance";
  let query = "";
  let shortcutEditor = null;

  function persist(next) {
    store.replaceState(next);
    const result = persistence.save(store.getState());
    if (!result.ok) notifications?.error(result.error.userMessage);
    return result.ok;
  }

  function applySettings() {
    const settings = selectSettings(store.getState()) || {};
    document.body.classList.toggle("night", Boolean(settings.night));
    document.body.classList.toggle("no-anim", settings.animations === false);
    document.body.classList.toggle("no-tooltips", settings.tooltips === false);
    document.body.classList.toggle("high-contrast", Boolean(settings.highContrast));
    document.body.classList.toggle("reduced-saturation", Boolean(settings.reducedSaturation));
    document.body.classList.toggle("large-font", Boolean(settings.largeFont));
    document.body.classList.toggle("performance-mode", performanceModeActive(settings));
    document.body.dataset.fx = settings.visualIntensity || "standard";
    document.body.dataset.opacity = settings.uiOpacity || "medium";
    document.body.dataset.dashboardMode = settings.dashboardMode || "tryhard";
    document.body.dataset.chronoStyle = settings.chronoStyle || "technical";
    if (soundButton) {
      soundButton.setAttribute("aria-label", settings.sound === false ? "Son désactivé" : `Son activé à ${settings.soundVolume ?? 100} %`);
      soundButton.classList.toggle("is-muted", settings.sound === false);
    }
    if (soundIcon) soundIcon.src = settings.sound === false
      ? "../familiers/pykur/assets/bouton/sonoff.png"
      : "../familiers/pykur/assets/bouton/son.png";
  }

  function saveSetting(key, value, type) {
    let next = store.getState();
    if (type === "duration") next = updateNotificationDuration(next, value);
    else if (type === "range") next = updateSoundVolume(next, value);
    else next = updateSetting(next, key, value);
    if (persist(next)) {
      applySettings();
      notifications?.success("Option enregistrée.");
    }
  }

  function createControl(definition, settings) {
    const [type, key, label, description, values] = definition;
    const row = element("label", "option-row");
    row.dataset.search = `${label} ${description}`.toLowerCase();
    const copy = element("span", "option-copy");
    copy.append(element("strong", "", label), element("small", "", description));
    row.append(copy);
    if (type === "toggle") {
      const input = element("input", "option-switch");
      input.type = "checkbox";
      input.checked = Boolean(settings[key]);
      input.setAttribute("aria-label", label);
      input.addEventListener("change", () => saveSetting(key, input.checked, type));
      row.append(input);
    } else if (type === "range") {
      const wrap = element("span", "option-range");
      const input = element("input");
      input.type = "range";
      input.min = "0";
      input.max = "100";
      input.value = String(settings[key] ?? 100);
      const output = element("output", "", `${input.value} %`);
      input.addEventListener("input", () => { output.textContent = `${input.value} %`; });
      input.addEventListener("change", () => saveSetting(key, input.value, type));
      wrap.append(input, output);
      row.append(wrap);
    } else {
      const select = element("select", "option-select");
      select.setAttribute("aria-label", label);
      for (const [value, text] of values) {
        const option = element("option", "", text);
        option.value = String(value);
        select.append(option);
      }
      select.value = String(settings[key]);
      select.addEventListener("change", () => saveSetting(key, select.value, type));
      row.append(select);
    }
    return row;
  }

  function drawShortcuts(panel, settings) {
    const enabled = createControl(["toggle", "shortcutsEnabled", "Activer les raccourcis", "Coupe ou réactive toutes les touches configurables."], settings);
    panel.append(enabled);
    const list = element("div", "shortcut-list");
    for (const action of SHORTCUT_ACTIONS) {
      const row = element("div", "shortcut-row");
      row.dataset.search = `${action.label} ${action.description}`.toLowerCase();
      const copy = element("span", "option-copy");
      copy.append(element("strong", "", action.label), element("small", "", action.description));
      const key = element("kbd", "shortcut-key", settings.keybinds?.[action.id] || "Désactivé");
      const edit = element("button", "button button-primary", "Modifier");
      edit.type = "button";
      edit.addEventListener("click", () => shortcutEditor?.startCapture(action.id, () => drawOptions()));
      row.append(copy, key, edit);
      list.append(row);
    }
    const reset = element("button", "button button-neutral", "Réinitialiser les raccourcis");
    reset.type = "button";
    reset.addEventListener("click", () => {
      if (persist(resetKeybinds(store.getState()))) {
        notifications?.success("Raccourcis réinitialisés.");
        drawOptions();
      }
    });
    panel.append(list, reset);
  }

  function drawLinks(panel) {
    const state = store.getState();
    for (const [label, description, checked, handler] of [[
      "Options et raccourcis partagés",
      "Applique les mêmes réglages à tous les profils.",
      state.optionsShared,
      (value) => setOptionsShared(state, value)
    ]]) {
      const row = element("label", "option-row");
      row.dataset.search = `${label} ${description}`.toLowerCase();
      const copy = element("span", "option-copy");
      copy.append(element("strong", "", label), element("small", "", description));
      const input = element("input", "option-switch");
      input.type = "checkbox";
      input.checked = Boolean(checked);
      input.addEventListener("change", () => {
        if (persist(handler(input.checked))) {
          notifications?.info(`${label} : ${input.checked ? "activé" : "désactivé"}.`);
          applySettings();
          drawOptions();
        }
      });
      row.append(copy, input);
      panel.append(row);
    }
    const account = element("div", "options-note", "La galerie et les succès appartiennent au compte, ou à ce navigateur en mode invité. Les donjons et la progression restent propres à chaque profil.");
    panel.append(account);
  }

  function drawOptions() {
    const settings = selectSettings(store.getState()) || {};
    modal.body.replaceChildren();
    const search = element("input", "options-search");
    search.type = "search";
    search.placeholder = "Rechercher une option...";
    search.value = query;
    search.setAttribute("aria-label", "Rechercher une option");
    const shell = element("div", "options-shell");
    const nav = element("nav", "options-nav");
    nav.setAttribute("aria-label", "Catégories des options");
    const content = element("div", "options-content");
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    let visibleSections = 0;
    for (const section of SECTIONS) {
      const tab = element("button", `options-tab${activeSection === section.id ? " is-active" : ""}`, section.label);
      tab.type = "button";
      tab.addEventListener("click", () => { activeSection = section.id; query = ""; drawOptions(); });
      const panel = element("section", "options-panel");
      panel.append(element("h3", "", section.label), element("p", "options-description", section.description));
      if (section.id === "shortcuts") drawShortcuts(panel, settings);
      else if (section.id === "links") drawLinks(panel);
      else for (const control of CONTROLS[section.id] || []) panel.append(createControl(control, settings));
      const searchText = `${section.label} ${section.description} ${[...panel.querySelectorAll("[data-search]")].map((node) => node.dataset.search).join(" ")}`.toLocaleLowerCase("fr");
      const matches = !normalizedQuery || searchText.includes(normalizedQuery);
      if (normalizedQuery) {
        panel.querySelectorAll("[data-search]").forEach((node) => { node.hidden = !node.dataset.search.includes(normalizedQuery); });
      }
      tab.hidden = !matches;
      panel.hidden = normalizedQuery ? !matches : activeSection !== section.id;
      if (matches) visibleSections += 1;
      nav.append(tab);
      content.append(panel);
    }
    if (!visibleSections) content.append(element("p", "options-empty", "Aucun résultat trouvé."));
    shell.append(nav, content);
    modal.body.append(search, shell);
    search.addEventListener("input", () => { query = search.value; drawOptions(); queueMicrotask(() => modal.body.querySelector(".options-search")?.focus()); });
  }

  function open(section = "appearance") {
    activeSection = section;
    query = "";
    modal.show("Options", "Réglez le confort, les sons, les notifications et les profils.");
    drawOptions();
    const close = element("button", "button button-neutral", "Fermer");
    close.type = "button";
    close.addEventListener("click", modal.close);
    modal.footer.append(close);
  }

  function toggleSound() {
    const settings = selectSettings(store.getState()) || {};
    if (persist(updateSetting(store.getState(), "sound", settings.sound === false))) {
      applySettings();
      notifications?.info(settings.sound === false ? "Son activé." : "Son désactivé.");
    }
  }

  openButton?.addEventListener("click", () => open());
  soundButton?.addEventListener("click", toggleSound);
  const unsubscribe = store.subscribe(applySettings);
  applySettings();

  return Object.freeze({ open, toggleSound, applySettings, setShortcutEditor(value) { shortcutEditor = value; }, destroy: unsubscribe });
}
