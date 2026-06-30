import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  MAIN_ACHIEVEMENT_CATEGORIES,
  SECRET_ACHIEVEMENT_CATEGORIES,
  SECRET_FINAL_ACHIEVEMENTS
} from "../config/achievements.js";
import {
  achievementProgress,
  recalculateAchievements,
  resetAchievements,
  unlockAchievements,
  unlockSecretCategories
} from "../domain/achievements.js";
import { selectAchievements } from "../state/selectors.js";

const STANDARD_SOUND = "../familiers/pykur/assets/sons/success.mp3";
const FINAL_SOUND = "../familiers/pykur/assets/sons/succes/100%.mp3";

function element(tag, className = "", text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function button(label, className = "button button-neutral") {
  const node = element("button", className, label);
  node.type = "button";
  return node;
}

function dateLabel(value) {
  if (!value) return "Verrouillé";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function createFireworks() {
  document.querySelector(".achievement-fireworks")?.remove();
  const layer = element("div", "achievement-fireworks");
  layer.setAttribute("aria-hidden", "true");
  const colors = ["#ffd60a", "#ff6b35", "#1e90ff", "#ef476f", "#22c55e", "#8b5cf6"];
  for (let burst = 0; burst < 9; burst += 1) {
    const x = 12 + (burst * 19) % 76;
    const y = 18 + (burst * 23) % 54;
    for (let particle = 0; particle < 18; particle += 1) {
      const node = element("span");
      const angle = Math.PI * 2 * particle / 18;
      const distance = 80 + (particle % 5) * 15;
      node.style.setProperty("--x", `${x}vw`);
      node.style.setProperty("--y", `${y}vh`);
      node.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      node.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      node.style.setProperty("--delay", `${burst * 0.45}s`);
      node.style.setProperty("--color", colors[(particle + burst) % colors.length]);
      layer.append(node);
    }
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 5600);
}

export function createAchievementsController(options) {
  const { store, persistence, modal, notifications, audio, resolveFamiliar, resolveRuntime } = options;
  const openButton = document.querySelector("#achievementsOpen");
  let activeCategory = "PREMIERS PAS";
  let evaluating = false;
  let isOpen = false;
  let silenceNextEvaluation = false;

  const dependencies = { resolveFamiliar, resolveRuntime };

  function persist(nextState) {
    store.replaceState(nextState);
    return persistence.save(store.getState()).ok;
  }

  function visibleCategories(state) {
    const achievements = selectAchievements(state) || {};
    return ACHIEVEMENT_CATEGORIES.filter((category) => {
      if (SECRET_ACHIEVEMENT_CATEGORIES.includes(category)) return achievements.secretCategoriesUnlocked;
      if (category === "FINAL") {
        return Object.entries(ACHIEVEMENTS).some(([id, item]) => item.category === category
          && (!SECRET_FINAL_ACHIEVEMENTS.includes(id) || achievements.secretCategoriesUnlocked));
      }
      return true;
    });
  }

  function celebrate(ids, silent = false) {
    if (silent) return;
    for (const id of ids) {
      const item = ACHIEVEMENTS[id];
      if (!item) continue;
      notifications?.notify({ message: `Succès débloqué : ${item.title}`, type: item.category === "FINAL" ? "rare" : "success" });
      audio?.play(item.category === "FINAL" ? FINAL_SOUND : STANDARD_SOUND, { gain: item.category === "FINAL" ? 1 : 0.75 });
      if (id === "true_100") createFireworks();
    }
  }

  function apply(result, options = {}) {
    if (result.state !== store.getState()) persist(result.state);
    celebrate(result.unlocked, options.silent);
    if (isOpen) render();
    return result.unlocked;
  }

  function unlock(id, options = {}) {
    return apply(unlockAchievements(store.getState(), [id]), options);
  }

  function evaluate(options = {}) {
    if (evaluating) return [];
    evaluating = true;
    try {
      return apply(recalculateAchievements(store.getState(), dependencies, options), options);
    } finally {
      evaluating = false;
    }
  }

  function render() {
    if (!isOpen) return;
    const state = store.getState();
    const achievements = selectAchievements(state) || {};
    const categories = visibleCategories(state);
    if (!categories.includes(activeCategory)) activeCategory = categories[0] || "PREMIERS PAS";
    modal.body.replaceChildren();

    const main = Object.entries(ACHIEVEMENTS).filter(([, item]) => MAIN_ACHIEVEMENT_CATEGORIES.includes(item.category));
    const mainDone = main.filter(([id]) => achievements.unlocked?.[id]).length;
    const summary = element("section", "achievement-summary");
    const summaryText = element("div");
    summaryText.append(element("strong", "", `Progression principale : ${mainDone}/${main.length}`), element("span", "", "Les succès sont communs à tous vos profils."));
    const actions = element("div", "achievement-summary-actions");
    const secret = button(achievements.secretCategoriesUnlocked ? "Secrets débloqués" : "Œuf scellé", "button button-neutral");
    secret.disabled = Boolean(achievements.secretCategoriesUnlocked);
    secret.addEventListener("click", () => {
      const next = unlockSecretCategories(store.getState());
      if (next === store.getState()) notifications?.warning("Retrouvez d'abord l'œuf secret sur le site.");
      else { persist(next); render(); notifications?.success("Catégories secrètes débloquées."); }
    });
    const reset = button("Reset succès", "button button-danger");
    reset.addEventListener("click", showResetConfirmation);
    actions.append(secret, reset);
    summary.append(summaryText, actions);

    const shell = element("div", "achievements-shell");
    const tabs = element("nav", "achievement-categories");
    tabs.setAttribute("aria-label", "Catégories de succès");
    for (const category of categories) {
      const progress = achievementProgress(state, category);
      const tab = button(`${category} ${progress.done}/${progress.total}`, `achievement-category${category === activeCategory ? " is-active" : ""}`);
      tab.setAttribute("aria-pressed", String(category === activeCategory));
      tab.addEventListener("click", () => { activeCategory = category; render(); });
      tabs.append(tab);
    }
    const list = element("section", "achievement-list");
    list.setAttribute("aria-label", activeCategory);
    const entries = Object.entries(ACHIEVEMENTS).filter(([id, item]) => item.category === activeCategory
      && (!SECRET_FINAL_ACHIEVEMENTS.includes(id) || achievements.secretCategoriesUnlocked));
    for (const [id, item] of entries) {
      const unlocked = achievements.unlocked?.[id];
      const card = element("article", `achievement-card${unlocked ? " is-unlocked" : ""}`);
      const art = element("div", "achievement-art");
      const image = element("img");
      image.src = item.icon;
      image.alt = "";
      image.loading = "lazy";
      art.append(image);
      const copy = element("div", "achievement-copy");
      copy.append(element("h3", "", item.title), element("p", "", item.description), element("span", "achievement-date", dateLabel(unlocked?.date)));
      card.append(art, copy);
      list.append(card);
    }
    shell.append(tabs, list);
    modal.body.append(summary, shell);
  }

  function showResetConfirmation() {
    modal.show("Réinitialiser les succès", "Cette action remet la progression des succès à zéro.");
    modal.body.append(element("p", "dialog-warning", "Les succès débloqués seront retirés. L'œuf secret déjà récupéré sera conservé."));
    const cancel = button("Annuler");
    cancel.addEventListener("click", open);
    const confirm = button("Reinitialiser", "button button-danger");
    confirm.addEventListener("click", () => {
      persist(resetAchievements(store.getState()));
      notifications?.warning("Succès remis à zéro.");
      activeCategory = "PREMIERS PAS";
      open();
    });
    modal.footer.replaceChildren(cancel, confirm);
  }

  function open() {
    isOpen = true;
    modal.show("Succès", "Suivez les objectifs débloqués et les défis restants.", { onClose: () => { isOpen = false; } });
    evaluate({ silent: true });
    const close = button("Fermer");
    close.addEventListener("click", () => { isOpen = false; modal.close(); });
    modal.footer.append(close);
    render();
  }

  openButton?.addEventListener("click", open);
  const unsubscribe = store.subscribe(() => {
    const silent = silenceNextEvaluation;
    silenceNextEvaluation = false;
    evaluate({ silent });
  });
  queueMicrotask(() => evaluate({ silent: true }));

  return Object.freeze({
    open,
    render,
    unlock,
    evaluate,
    silenceNextEvaluation() { silenceNextEvaluation = true; },
    destroy: unsubscribe
  });
}
