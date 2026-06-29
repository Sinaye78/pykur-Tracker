import {
  ChronoOperationError,
  clearChronoMarks,
  finishChrono,
  formatChrono,
  getChronoStats,
  markChronoRun,
  pauseChrono,
  removeChronoMark,
  resetChrono,
  startChrono
} from "../domain/chrono.js";
import {
  finishSession,
  getSessionStats,
  pauseSession,
  recordSessionRun,
  resetSession,
  startSession
} from "../domain/session.js";
import { getProfileProgress } from "../domain/progression.js";
import { createTicker } from "../services/timers.js";
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

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function createChronoController(options) {
  const { store, persistence, modal, resolveFamiliar, resolveRuntime, gelutinBossGains, subscribeRun, recordHistory, notifications } = options;
  const nodes = {
    panel: document.querySelector(".chrono-panel"),
    status: document.querySelector("#chronoStatus"),
    display: document.querySelector("#chronoDisplay"),
    markCount: document.querySelector("#chronoMarkCount"),
    best: document.querySelector("#chronoBest"),
    average: document.querySelector("#chronoAverage"),
    start: document.querySelector("#chronoStart"),
    pause: document.querySelector("#chronoPause"),
    finish: document.querySelector("#chronoFinish"),
    reset: document.querySelector("#chronoReset"),
    mark: document.querySelector("#chronoMark"),
    settings: document.querySelector("#chronoSettings"),
    history: document.querySelector("#chronoHistory"),
    announcement: document.querySelector("#progressionStatus")
  };
  let historyOpen = false;

  function context() {
    const state = store.getState();
    const profile = selectActiveProfile(state);
    const familiar = profile ? resolveFamiliar(profile.data.familiarId) : null;
    const runtime = profile ? resolveRuntime(profile.data.familiarId) : null;
    const farmKey = profile?.data.ui?.farm || familiar?.dungeons?.[0]?.key || null;
    const dungeon = familiar?.dungeons?.find((item) => item.key === farmKey) || null;
    const farmKeys = familiar?.dungeons?.map((item) => item.key) || [];
    const progress = profile && familiar && runtime
      ? getProfileProgress(profile.data, familiar, runtime)
      : 0;
    return { state, profile, familiar, runtime, farmKey, dungeon, farmKeys, progress };
  }

  function announce(message, error = false) {
    if (!nodes.announcement) return;
    nodes.announcement.textContent = message;
    nodes.announcement.classList.toggle("is-error", error);
    notifications?.notify({ message, type: error ? "error" : /pause/i.test(message) ? "pause" : "info" });
  }

  function persist(nextState) {
    store.replaceState(nextState);
    const result = persistence.save(store.getState());
    if (!result.ok) announce(result.error.userMessage, true);
    return result.ok;
  }

  function displayTime(stats, profile, nowMs) {
    const formatted = formatChrono(stats.split);
    const settings = profile?.data.settings;
    const chrono = profile?.data.chrono;
    if (!settings?.showMilliseconds || !stats.running || !chrono?.startedAt) return formatted;
    const tenths = Math.floor(Math.max(0, nowMs - Number(chrono.startedAt)) % 1000 / 100);
    return `${formatted}.${tenths}`;
  }

  function render(nowMs = Date.now()) {
    const { profile, farmKey, farmKeys, progress } = context();
    const enabled = Boolean(profile && farmKey);
    for (const key of ["start", "pause", "finish", "reset", "mark", "settings", "history"]) nodes[key].disabled = !enabled;
    if (!enabled) {
      nodes.status.textContent = "Prête";
      nodes.display.textContent = "00:00:00";
      nodes.markCount.textContent = "0";
      nodes.best.textContent = "—";
      nodes.average.textContent = "—";
      ticker.stop();
      return;
    }
    const session = getSessionStats(profile.data, farmKeys, nowMs, { currentProgress: progress });
    const chrono = getChronoStats(profile.data, farmKey, nowMs, { sinceMs: session.sessionStartedAt });
    nodes.status.textContent = session.active ? "En cours" : session.hasProgress || chrono.elapsed > 0 ? "En pause" : "Prête";
    nodes.display.textContent = displayTime(chrono, profile, nowMs);
    nodes.markCount.textContent = String(session.totalRuns);
    nodes.best.textContent = chrono.best === null ? "—" : formatChrono(chrono.best);
    nodes.average.textContent = chrono.average === null ? "—" : formatChrono(chrono.average);
    nodes.start.textContent = session.hasProgress || chrono.elapsed > 0 ? "Reprendre" : "Démarrer";
    nodes.start.disabled = session.active || chrono.running;
    nodes.pause.disabled = !session.active && !chrono.running;
    nodes.finish.disabled = !session.active && !session.hasProgress && chrono.elapsed <= 0;
    nodes.reset.disabled = !session.active && !session.hasProgress && chrono.elapsed <= 0;
    nodes.mark.disabled = !chrono.running;
    nodes.panel.classList.toggle("is-running", session.active || chrono.running);
    document.querySelector("#sessionProgressGain").textContent = `+${session.progressGain}`;
    session.active || chrono.running ? ticker.start() : ticker.stop();
  }

  const ticker = createTicker(() => render(Date.now()), { intervalMs: 100 });

  function renderHistory() {
    const { profile, familiar } = context();
    if (!profile || !familiar) return;
    const container = element("div", "chrono-history-list");
    const marks = profile.data.chrono?.marks || [];
    if (!marks.length) {
      container.append(element("p", "chrono-history-empty", "Aucun temps marqué pour ce profil."));
    } else {
      for (const mark of marks) {
        const dungeon = familiar.dungeons.find((item) => item.key === mark.farm);
        const row = element("article", "chrono-history-row");
        const identity = element("div", "chrono-history-identity");
        identity.append(
          element("strong", "", mark.name || `${dungeon?.label || mark.farm} ${formatChrono(mark.time)}`),
          element("span", "", `${dungeon?.fullLabel || mark.farm} · ${formatDate(mark.date)}`)
        );
        const duration = element("strong", "chrono-history-duration", formatChrono(mark.time));
        const remove = button("Supprimer", "button button-danger");
        remove.addEventListener("click", () => {
          persist(removeChronoMark(store.getState(), store.getState().active, mark.id));
          renderHistoryModal();
        });
        row.append(identity, duration, remove);
        container.append(row);
      }
    }
    modal.body.replaceChildren(container);
  }

  function renderHistoryModal() {
    const { profile } = context();
    if (!profile) return;
    modal.show("Temps chronométrés", "Consultez les temps enregistrés sur ce profil.");
    historyOpen = true;
    renderHistory();
    modal.footer.replaceChildren();
    const clear = button("Réinitialiser les temps", "button button-danger");
    clear.disabled = !(profile.data.chrono?.marks || []).length;
    clear.addEventListener("click", () => {
      persist(clearChronoMarks(store.getState(), store.getState().active));
      announce("Historique du chrono réinitialisé.");
      renderHistoryModal();
    });
    const close = button("Fermer");
    close.addEventListener("click", () => { historyOpen = false; modal.close(); });
    modal.footer.append(clear, close);
  }

  function openSettings() {
    const { profile } = context();
    if (!profile) return;
    modal.show("Réglages du chrono", "Ajustez l'affichage du chronomètre pour ce profil.");
    const settingsList = element("div", "chrono-settings-list");
    const controls = [
      ["showMilliseconds", "Afficher les dixièmes de seconde pendant le chronométrage"],
      ["autoMarkOnPlus", "Marquer automatiquement le temps quand + Run est utilisé"],
      ["chronoAutoStartOnRun", "Démarrer automatiquement Session & Chrono au premier + Run"]
    ].map(([key, text]) => {
      const label = element("label", "chrono-setting");
      const input = element("input");
      input.type = "checkbox";
      input.checked = Boolean(profile.data.settings?.[key]);
      label.append(input, element("span", "", text));
      settingsList.append(label);
      return { key, input };
    });
    modal.body.append(settingsList);
    const save = button("Enregistrer", "button button-primary");
    save.addEventListener("click", () => {
      const next = store.updateState((draft) => {
        for (const control of controls) draft.profiles[draft.active].data.settings[control.key] = control.input.checked;
      });
      const result = persistence.save(next);
      if (!result.ok) announce(result.error.userMessage, true);
      modal.close();
    });
    const close = button("Annuler");
    close.addEventListener("click", modal.close);
    modal.footer.append(close, save);
  }

  function startTracking() {
    const { state, profile, familiar, farmKeys, progress } = context();
    if (!profile || !familiar) return;
    const nowMs = Date.now();
    let next = startSession(state, state.active, farmKeys, progress, { nowMs });
    next = startChrono(next, state.active, { nowMs });
    if (persist(next)) recordHistory?.(state.active, { message: "Session & chrono démarrés.", kind: "chrono" });
    announce("Session & chrono lancés.");
  }

  function pauseTracking() {
    const { state, profile, farmKeys } = context();
    if (!profile) return;
    const nowMs = Date.now();
    let next = pauseSession(state, state.active, farmKeys, { nowMs });
    next = pauseChrono(next, state.active, { nowMs });
    if (persist(next)) recordHistory?.(state.active, { message: "Session & chrono mis en pause.", kind: "chrono" });
    announce("Session & chrono en pause.");
  }

  function resetTracking() {
    const { state, profile, farmKeys, progress } = context();
    if (!profile) return;
    const nowMs = Date.now();
    let next = resetSession(state, state.active, farmKeys, progress, { nowMs });
    next = resetChrono(next, state.active, { nowMs });
    if (persist(next)) recordHistory?.(state.active, { message: "Session & chrono remis à zéro.", kind: "chrono" });
    announce("Session & chrono remis à zéro.");
  }

  function formatRate(value, suffix) {
    if (!Number.isFinite(value) || value <= 0) return "—";
    return `${value.toFixed(value >= 10 ? 1 : 2)} ${suffix}`;
  }

  function showSessionSummary(summary, familiar) {
    modal.show("Résumé de session", `Bilan de votre session ${familiar.label}.`);
    const hero = element("section", "session-summary-hero");
    const duration = element("div");
    duration.append(element("span", "", "Durée"), element("strong", "", formatChrono(summary.elapsed)));
    const efficiency = element("div");
    efficiency.append(
      element("span", "", "Rendement"),
      element("strong", "", formatRate(summary.progressHour, `${familiar.progressShort}/h`))
    );
    hero.append(duration, efficiency);
    const grid = element("section", "session-summary-grid");
    const entries = [
      ["Donjons suivis", String(summary.totalRuns)],
      ...familiar.dungeons.map((dungeon) => [dungeon.label, String(summary.farmRuns[dungeon.key] || 0)]),
      [`${familiar.progressLabel} gagnée`, `+${summary.progressGain}`],
      ["Donjons / heure", formatRate(summary.runsHour, "dj/h")],
      ["Statut", summary.totalRuns ? summary.status : "Aucun donjon"]
    ];
    for (const [label, value] of entries) {
      const cell = element("div");
      cell.append(element("span", "", label), element("strong", "", value));
      grid.append(cell);
    }
    modal.body.append(hero, grid);
    const close = button("Fermer");
    close.addEventListener("click", modal.close);
    modal.footer.append(close);
  }

  function finishTracking() {
    const { state, profile, familiar, farmKeys, progress } = context();
    if (!profile || !familiar) return;
    const nowMs = Date.now();
    const sessionResult = finishSession(state, state.active, farmKeys, progress, familiar.progressShort, { nowMs });
    const chronoResult = finishChrono(sessionResult.state, state.active, { nowMs });
    if (persist(chronoResult.state)) recordHistory?.(state.active, {
      message: `Session terminée : ${sessionResult.summary.totalRuns} donjon${sessionResult.summary.totalRuns > 1 ? "s" : ""}, +${sessionResult.summary.progressGain} ${familiar.progressShort}.`,
      kind: "chrono",
      type: "success",
      meta: { summary: sessionResult.summary }
    });
    announce(`Session terminée : ${sessionResult.summary.totalRuns} donjon${sessionResult.summary.totalRuns > 1 ? "s" : ""}.`);
    showSessionSummary(sessionResult.summary, familiar);
  }

  function markCurrentRun(options = {}) {
    const { state, farmKey, dungeon } = context();
    if (!state.active) return null;
    const result = markChronoRun(state, state.active, farmKey, {
      farmLabel: dungeon?.label || farmKey,
      mode: options.auto ? "tryhard" : "manual"
    });
    if (persist(result.state)) recordHistory?.(state.active, {
      message: `Temps marqué : ${dungeon?.label || farmKey} ${formatChrono(result.mark.time)}.`,
      kind: "chrono",
      farmKey,
      meta: { markId: result.mark.id, seconds: result.mark.time }
    });
    if (!options.silent) announce(`Run marqué : ${formatChrono(result.mark.time)}.`);
    return result.mark;
  }

  function handleRunApplied(event) {
    const state = store.getState();
    const profile = state.profiles?.[event.profileId];
    if (!profile) return;
    const familiar = resolveFamiliar(profile.data.familiarId);
    const farmKeys = familiar?.dungeons?.map((dungeon) => dungeon.key) || [];
    const settings = profile.data.settings || {};
    const nowMs = Date.now();
    let next = state;
    if (event.delta > 0 && settings.chronoAutoStartOnRun && !profile.data.session?.active && !profile.data.chrono?.running) {
      next = startSession(next, event.profileId, farmKeys, event.oldProgress, { nowMs });
      next = startChrono(next, event.profileId, { nowMs });
    }
    next = recordSessionRun(next, event.profileId, farmKeys, event.farmKey, event.delta, event.newProgress, { nowMs });
    if (next !== state) persist(next);
    const updated = store.getState().profiles?.[event.profileId];
    if (event.delta > 0 && settings.autoMarkOnPlus && updated?.data.chrono?.running) {
      try { markCurrentRun({ auto: true, silent: true }); } catch (error) {
        if (!(error instanceof ChronoOperationError) || error.code !== "EMPTY_MARK") announce(error.message, true);
      }
    }
  }

  nodes.start.addEventListener("click", startTracking);
  nodes.pause.addEventListener("click", pauseTracking);
  nodes.reset.addEventListener("click", resetTracking);
  nodes.finish.addEventListener("click", () => {
    try { finishTracking(); } catch (error) { announce(error.message, true); }
  });
  nodes.mark.addEventListener("click", () => {
    try { markCurrentRun(); } catch (error) { announce(error.message, true); }
  });
  nodes.history.addEventListener("click", renderHistoryModal);
  nodes.settings.addEventListener("click", openSettings);
  const unsubscribeRuns = subscribeRun?.(handleRunApplied) || (() => {});
  const unsubscribe = store.subscribe(() => render(Date.now()));
  render();

  return Object.freeze({
    render,
    openHistory: renderHistoryModal,
    start: startTracking,
    pause: pauseTracking,
    reset: resetTracking,
    toggle() {
      const state = store.getState();
      const profile = state.profiles?.[state.active];
      if (profile?.data?.chrono?.running) pauseTracking();
      else startTracking();
    },
    destroy() {
      historyOpen = false;
      ticker.destroy();
      unsubscribeRuns();
      unsubscribe();
    }
  });
}
