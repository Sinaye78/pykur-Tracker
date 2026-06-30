import { getProfileProgress, getProgressPercent, normalizeProgressionState } from "../domain/progression.js";
import { projectProfile } from "../domain/projection.js";
import { applyRunDelta, setActiveDungeon, setGelutinBoss, toggleAbraRoom } from "../domain/runs.js";
import { recordDailyRun } from "../domain/stats.js";
import { selectActiveProfile } from "../state/selectors.js";
import { createTrackingDialogs } from "./tracking.js";
import { formatDuration, formatProjectionRuns } from "./projection.js";

const GELUTIN_BOSSES = Object.freeze([
  ["blopCocoRoyal", "Blop Coco Royal"],
  ["blopGriotteRoyal", "Blop Griotte Royal"],
  ["blopIndigoRoyal", "Blop Indigo Royal"],
  ["blopReinetteRoyal", "Blop Reinette Royal"]
]);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createDashboardController(options) {
  const { store, persistence, resolveFamiliar, resolveRuntime, gelutinBossGains, modal, recordHistory, notifications } = options;
  const dependencies = { resolveFamiliar, resolveRuntime, gelutinBossGains };
  const addButton = document.querySelector("#runAdd");
  const removeButton = document.querySelector("#runRemove");
  const choices = document.querySelector("#activeDungeonChoices");
  const specialControl = document.querySelector("#dungeonSpecialControl");
  const dungeonGrid = document.querySelector("#dungeonGrid");
  const status = document.querySelector("#progressionStatus");
  const editRunsButton = document.querySelector("#runEdit");
  const monstersButton = document.querySelector("#monsterLauncher");
  const runListeners = new Set();

  const normalized = normalizeProgressionState(store.getState(), dependencies);
  if (normalized.changed) store.replaceState(normalized.state);

  function announce(message, error = false) {
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

  const trackingDialogs = createTrackingDialogs({
    store,
    modal,
    resolveFamiliar,
    resolveRuntime,
    gelutinBossGains,
    persist,
    announce,
    recordHistory,
    onManualAdjustment: options.onManualAdjustment
  });

  function activeContext() {
    const state = store.getState();
    const profile = selectActiveProfile(state);
    if (!profile) return { state, profile: null, familiar: null, runtime: null };
    return {
      state,
      profile,
      familiar: resolveFamiliar(profile.data.familiarId),
      runtime: resolveRuntime(profile.data.familiarId)
    };
  }

  function renderDungeonChoices(profile, familiar) {
    choices.replaceChildren();
    const activeKey = profile.data.ui?.farm || familiar.dungeons[0]?.key;
    for (const dungeon of familiar.dungeons) {
      const button = element("button", `dungeon-choice${dungeon.key === activeKey ? " is-active" : ""}`);
      button.type = "button";
      button.dataset.dungeon = dungeon.key;
      if (dungeon.asset) {
        const image = element("img");
        image.src = dungeon.asset;
        image.alt = "";
        button.append(image);
      }
      button.append(element("span", "", dungeon.label));
      button.addEventListener("click", () => {
        persist(setActiveDungeon(store.getState(), store.getState().active, dungeon.key, dependencies));
        announce(`${dungeon.fullLabel} sélectionné.`);
      });
      choices.append(button);
    }
  }

  function renderSpecialControl(profile, familiar) {
    specialControl.replaceChildren();
    const activeKey = profile.data.ui?.farm || familiar.dungeons[0]?.key;
    if (familiar.id === "abra-kadabra" && activeKey === "salleAbrakne") {
      const active = Boolean(profile.data.special?.salleAbrakneActive);
      const button = element("button", "button button-accent", active ? "Sortir de la salle Abrakne" : "Arrivé à la salle Abrakne");
      button.type = "button";
      button.addEventListener("click", () => {
        persist(toggleAbraRoom(store.getState(), store.getState().active, dependencies));
        announce(active ? "Boucle Abrakne terminée." : "Premières salles comptabilisées. Boucle Abrakne active.");
      });
      specialControl.append(button);
    }
    if (familiar.id === "gelutin" && ["donjonBlops", "antreBlopMulticolore"].includes(activeKey)) {
      const label = element("label", "", "Boss Blop affronté");
      const select = element("select");
      select.setAttribute("aria-label", "Boss Blop affronté");
      for (const [id, text] of GELUTIN_BOSSES) {
        const option = element("option", "", text);
        option.value = id;
        select.append(option);
      }
      select.value = profile.data.special?.blopBoss || "blopCocoRoyal";
      select.addEventListener("change", () => {
        persist(setGelutinBoss(store.getState(), store.getState().active, select.value, dependencies));
        announce(`${select.selectedOptions[0].textContent} sélectionné.`);
      });
      label.append(select);
      specialControl.append(label);
    }
  }

  function renderDungeonCards(profile, familiar, projection) {
    dungeonGrid.replaceChildren();
    const activeKey = profile.data.ui?.farm || familiar.dungeons[0]?.key;
    for (const dungeon of familiar.dungeons) {
      const estimateData = projection.dungeons.find((item) => item.key === dungeon.key);
      const article = element("article", `card dungeon-card${dungeon.key === activeKey ? " is-active" : ""}`);
      if (dungeon.asset) {
        const decoration = element("div", "dungeon-decoration");
        decoration.setAttribute("aria-hidden", "true");
        decoration.style.backgroundImage = `url("${dungeon.asset}")`;
        article.append(decoration);
      }
      const header = element("header");
      header.append(element("h2", "", dungeon.fullLabel));
      if (dungeon.key === activeKey) header.append(element("span", "status-badge", "Actif"));
      const stats = element("div", "dungeon-stats");
      const completed = element("div");
      completed.append(element("span", "", "Effectués"), element("strong", "value-positive", String(profile.data.runs?.[dungeon.key] || 0)));
      const remaining = element("div");
      remaining.append(element("span", "", "Restants"), element("strong", "value-danger", formatProjectionRuns(estimateData?.fullRuns, projection.complete)));
      stats.append(completed, remaining);
      const estimate = element("div", "time-estimate");
      estimate.append(element("span", "", "Temps estimé restant"), element("strong", "", formatDuration(estimateData?.fullSeconds)));
      article.append(header, stats, estimate);
      dungeonGrid.append(article);
    }
  }

  function renderQuickProjection(familiar, projection) {
    const summary = document.querySelector("#projectionSummary");
    summary.replaceChildren();
    if (projection.complete) {
      summary.append(element("strong", "", "Objectif atteint"));
      return;
    }
    const lines = element("div", "quick-projection-lines");
    for (const dungeon of projection.dungeons) {
      const row = element("div", "quick-projection-line");
      row.append(
        element("span", "", `${dungeon.label} · ${formatProjectionRuns(dungeon.nextRuns)}`),
        element("strong", "", dungeon.nextGain === null ? "—" : `+${dungeon.nextGain} ${familiar.progressShort} (${projection.progress} → ${dungeon.nextProgress})`)
      );
      lines.append(row);
    }
    summary.append(lines);
  }

  function render() {
    const { profile, familiar, runtime } = activeContext();
    const enabled = Boolean(profile && familiar && runtime);
    addButton.disabled = !enabled;
    removeButton.disabled = !enabled;
    editRunsButton.disabled = !enabled;
    monstersButton.disabled = !enabled;
    if (!enabled) {
      choices.replaceChildren();
      specialControl.replaceChildren();
      dungeonGrid.replaceChildren();
      return;
    }

    const progress = getProfileProgress(profile.data, familiar, runtime);
    const percent = getProgressPercent(progress, familiar);
    const projection = projectProfile(profile.data, familiar, runtime, { gelutinBossGains });
    const progressTrack = document.querySelector("#familiarProgressTrack");
    progressTrack.setAttribute("aria-label", `Progression ${percent.toFixed(2)} pour cent`);
    progressTrack.querySelector("span").style.width = `${percent}%`;
    document.querySelector("#familiarProgressValue").textContent = `${percent.toFixed(2)} %`;
    document.querySelector("#bonusLabel").textContent = familiar.progressLabel;
    document.querySelector("#bonusValue").textContent = String(progress);
    document.querySelector("#bonusObjective").textContent = `/ ${familiar.objectiveMax} ${familiar.progressShort}`;
    const bonusIcon = document.querySelector("#bonusIcon");
    bonusIcon.src = familiar.icon;
    bonusIcon.alt = familiar.progressLabel;
    document.querySelector("#sessionProgressLabel").textContent = familiar.progressLabel;
    document.querySelector("#sessionProgressGain").textContent = "+0";
    document.querySelector("#projectionProgressLabel").textContent = `Prochain gain de ${familiar.progressShort}`;
    renderQuickProjection(familiar, projection);
    renderDungeonChoices(profile, familiar);
    renderSpecialControl(profile, familiar);
    renderDungeonCards(profile, familiar, projection);
  }

  function changeRun(delta) {
    const state = store.getState();
    if (!state.active) return;
    try {
      const result = applyRunDelta(state, state.active, delta, dependencies);
      if (!result.applied && !result.specialAction) {
        announce(delta > 0 ? "Limite de donjons atteinte." : "Aucun donjon à retirer.");
        return;
      }
      const stateWithStats = result.applied
        ? recordDailyRun(result.state, state.active, selectActiveProfile(result.state).data.ui.farm, result.applied, result.oldProgress, result.newProgress)
        : result.state;
      const saved = persist(stateWithStats);
      if (result.specialAction === "abra-room-entered") {
        announce("Salle Abrakne atteinte. Les premières salles ont été comptabilisées.");
      } else {
        const sign = result.applied > 0 ? "+1" : "-1";
        const gain = result.newProgress - result.oldProgress;
        const message = `${sign} donjon · ${gain >= 0 ? "+" : ""}${gain} ${resolveFamiliar(selectActiveProfile(store.getState()).data.familiarId).progressShort}`;
        status.textContent = message;
        status.classList.remove("is-error");
        notifications?.notify({ message, type: gain > 0 ? "success" : gain < 0 ? "warning" : "info" });
      }
      if (saved && result.applied) {
        const resultProfile = selectActiveProfile(result.state);
        const familiar = resolveFamiliar(resultProfile.data.familiarId);
        const farmKey = resultProfile.data.ui.farm;
        const dungeon = familiar.dungeons.find((item) => item.key === farmKey);
        recordHistory?.(state.active, {
          message: `${result.applied > 0 ? "+1" : "-1"} donjon ${dungeon?.label || farmKey}.`,
          kind: "progression",
          farmKey,
          meta: { delta: result.applied, oldProgress: result.oldProgress, newProgress: result.newProgress }
        });
        const event = Object.freeze({
          profileId: state.active,
          farmKey,
          delta: result.applied,
          oldProgress: result.oldProgress,
          newProgress: result.newProgress
        });
        for (const listener of runListeners) listener(event);
      } else if (saved && result.specialAction === "abra-room-entered") {
        recordHistory?.(state.active, {
          message: "Arrivée dans la salle Abrakne : premières salles comptabilisées.",
          kind: "progression",
          farmKey: "salleAbrakne"
        });
      }
    } catch (error) {
      announce(error.message, true);
    }
  }

  function switchDungeon() {
    const { state, profile, familiar } = activeContext();
    if (!profile || !familiar?.dungeons?.length) return;
    const current = profile.data.ui?.farm || familiar.dungeons[0].key;
    const index = familiar.dungeons.findIndex((dungeon) => dungeon.key === current);
    const dungeon = familiar.dungeons[(index + 1) % familiar.dungeons.length];
    if (persist(setActiveDungeon(state, state.active, dungeon.key, dependencies))) announce(`${dungeon.fullLabel} sélectionné.`);
  }

  addButton.addEventListener("click", () => changeRun(1));
  removeButton.addEventListener("click", () => changeRun(-1));
  editRunsButton.addEventListener("click", trackingDialogs.openRunEditor);
  monstersButton.addEventListener("click", () => trackingDialogs.openMonsters("all"));
  const unsubscribe = store.subscribe(render);
  render();
  return Object.freeze({
    render,
    changeRun,
    switchDungeon,
    subscribeRun(listener) {
      if (typeof listener !== "function") throw new TypeError("Le suivi de run attend une fonction.");
      runListeners.add(listener);
      return () => runListeners.delete(listener);
    },
    destroy() {
      runListeners.clear();
      unsubscribe();
    },
    ...trackingDialogs
  });
}
