import { projectProfile, simulateProjectionPlan } from "../domain/projection.js";
import { selectActiveProfile } from "../state/selectors.js";

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

export function formatProjectionRuns(value, complete = false) {
  if (complete || value === 0) return "Objectif atteint";
  if (value === null || value === undefined) return "Non atteignable";
  return `${value} donjon${value > 1 ? "s" : ""}`;
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value % 3600 / 60);
  const secs = value % 60;
  if (hours) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  if (minutes) return `${minutes}min ${String(secs).padStart(2, "0")}s`;
  return `${secs}s`;
}

function projectionLine(label, value, className = "") {
  const row = element("div", `projection-line${className ? ` ${className}` : ""}`);
  row.append(element("span", "", label), element("strong", "", value));
  return row;
}

export function createProjectionController(options) {
  const { store, modal, resolveFamiliar, resolveRuntime, gelutinBossGains } = options;
  const openButton = document.querySelector("#projectionOpen");
  let view = "summary";
  let additions = {};

  function context() {
    const profile = selectActiveProfile(store.getState());
    if (!profile) throw new Error("Aucun profil actif.");
    const familiar = resolveFamiliar(profile.data.familiarId);
    const runtime = resolveRuntime(profile.data.familiarId);
    if (!familiar || !runtime) throw new Error("Configuration du familier introuvable.");
    return { profile, familiar, runtime };
  }

  function section(title, badge = "") {
    const card = element("section", "projection-card");
    const header = element("div", "projection-card-head");
    header.append(element("h3", "", title));
    if (badge) header.append(element("span", "projection-badge", badge));
    card.append(header);
    return card;
  }

  function renderSummary(container, profile, familiar, runtime, projection) {
    const progressCard = section("Progression actuelle", `${projection.percent.toFixed(1)}%`);
    progressCard.classList.add("is-wide");
    progressCard.append(element("strong", "projection-big", `${projection.progress} / ${projection.maximum} ${familiar.progressShort}`));
    const track = element("div", "projection-progress");
    const fill = element("span");
    fill.style.width = `${projection.percent}%`;
    track.append(fill);
    progressCard.append(track);

    const next = section("Prochain palier", "Gain réel");
    const nextLines = element("div", "projection-lines");
    for (const dungeon of projection.dungeons) {
      nextLines.append(projectionLine(dungeon.fullLabel, formatProjectionRuns(dungeon.nextRuns, projection.complete)));
      const gain = dungeon.nextGain === null ? "—" : `+${dungeon.nextGain} ${familiar.progressShort} (${projection.progress} → ${dungeon.nextProgress})`;
      nextLines.append(projectionLine("Gain prévu", gain, "is-gain"));
    }
    next.append(nextLines);

    const goal = section("Objectif 100%", `${projection.maximum} ${familiar.progressShort}`);
    const goalLines = element("div", "projection-lines");
    for (const dungeon of projection.dungeons) {
      goalLines.append(projectionLine(`${dungeon.fullLabel} restant`, formatProjectionRuns(dungeon.fullRuns, projection.complete)));
    }
    goal.append(goalLines);
    if (familiar.estimateNote) goal.append(element("p", "projection-note", familiar.estimateNote));
    container.append(progressCard, next, goal);
  }

  function renderSimulator(container, profile, familiar, runtime) {
    const card = section("Simulateur de donjons", "Temporaire");
    card.classList.add("is-wide");
    card.append(element("p", "projection-note", "Ces valeurs ne modifient pas votre profil, ne sauvegardent rien et ne déclenchent aucune récompense."));
    const controls = element("div", "projection-sim-controls");
    for (const dungeon of familiar.dungeons) {
      const control = element("div", "projection-sim-control");
      control.append(element("strong", "", dungeon.label));
      const counter = element("span", "projection-sim-count", String(additions[dungeon.key] || 0));
      const minus = button("−", "button button-neutral");
      minus.setAttribute("aria-label", `Retirer une simulation ${dungeon.fullLabel}`);
      const plus = button("+", "button button-primary");
      plus.setAttribute("aria-label", `Ajouter une simulation ${dungeon.fullLabel}`);
      const plusTen = button("+10", "button button-outline");
      plusTen.setAttribute("aria-label", `Ajouter dix simulations ${dungeon.fullLabel}`);
      const adjust = (delta) => {
        const limit = runtime.runLimits?.[dungeon.key] ?? Number.MAX_SAFE_INTEGER;
        const capacity = Math.max(0, limit - (profile.data.runs?.[dungeon.key] || 0));
        additions[dungeon.key] = Math.min(capacity, Math.max(0, (additions[dungeon.key] || 0) + delta));
        render();
      };
      minus.addEventListener("click", () => adjust(-1));
      plus.addEventListener("click", () => adjust(1));
      plusTen.addEventListener("click", () => adjust(10));
      control.append(minus, counter, plus, plusTen);
      controls.append(control);
    }
    card.append(controls);

    const simulation = simulateProjectionPlan(profile.data, familiar, runtime, additions, { gelutinBossGains });
    const stats = element("div", "projection-sim-summary");
    stats.append(
      projectionLine("Bonus simulé", `${simulation.currentProgress} → ${simulation.progress} ${familiar.progressShort}`),
      projectionLine("Gain simulé", `+${simulation.gain} ${familiar.progressShort}`),
      projectionLine("Progression", `${simulation.percent.toFixed(1)}%`),
      projectionLine("Restant 100%", simulation.remaining.map((item) => `${item.label} : ${formatProjectionRuns(item.runs, simulation.progress >= familiar.objectiveMax)}`).join(" · "))
    );
    card.append(stats);
    const reset = button("Réinitialiser la simulation", "button button-neutral");
    reset.addEventListener("click", () => {
      additions = Object.fromEntries(familiar.dungeons.map((dungeon) => [dungeon.key, 0]));
      render();
    });
    card.append(reset);
    container.append(card);
  }

  function renderDetails(container, familiar, projection) {
    const next = section(`Temps avant le prochain gain de ${familiar.progressShort}`, "Prochain palier");
    const nextLines = element("div", "projection-lines");
    for (const dungeon of projection.dungeons) nextLines.append(projectionLine(dungeon.fullLabel, formatDuration(dungeon.nextSeconds)));
    next.append(nextLines);

    const goal = section("Temps objectif 100%", `${projection.maximum} ${familiar.progressShort}`);
    const goalLines = element("div", "projection-lines");
    for (const dungeon of projection.dungeons) goalLines.append(projectionLine(dungeon.fullLabel, formatDuration(dungeon.fullSeconds)));
    goal.append(goalLines);

    const efficiency = section("Rendement estimé", "Comparaison");
    efficiency.classList.add("is-wide");
    const efficiencyLines = element("div", "projection-lines");
    for (const dungeon of projection.dungeons) {
      const rate = dungeon.rate === null ? "—" : `${dungeon.rate.toFixed(3)} ${familiar.progressShort}/donjon`;
      efficiencyLines.append(projectionLine(dungeon.fullLabel, rate));
    }
    efficiency.append(efficiencyLines);
    container.append(next, goal, efficiency);
  }

  function render() {
    const { profile, familiar, runtime } = context();
    const projection = projectProfile(profile.data, familiar, runtime, { gelutinBossGains });
    modal.body.replaceChildren();
    const tabs = element("div", "projection-tabs");
    for (const [key, label] of [["summary", "Résumé"], ["simulator", "Simulateur"], ["details", "Détails"]]) {
      const tab = button(label, `projection-tab${view === key ? " is-active" : ""}`);
      tab.setAttribute("aria-pressed", String(view === key));
      tab.addEventListener("click", () => { view = key; render(); });
      tabs.append(tab);
    }
    const content = element("div", "projection-content");
    if (view === "summary") renderSummary(content, profile, familiar, runtime, projection);
    if (view === "simulator") renderSimulator(content, profile, familiar, runtime);
    if (view === "details") renderDetails(content, familiar, projection);
    modal.body.append(tabs, content);
  }

  function openProjection() {
    const { familiar } = context();
    view = "summary";
    additions = Object.fromEntries(familiar.dungeons.map((dungeon) => [dungeon.key, 0]));
    modal.show(`Projection du ${familiar.label}`, "Estimez les prochains paliers, l'objectif final et différents scénarios.");
    const close = button("Fermer");
    close.addEventListener("click", modal.close);
    modal.footer.append(close);
    render();
  }

  openButton.addEventListener("click", openProjection);
  return Object.freeze({ openProjection, render });
}
