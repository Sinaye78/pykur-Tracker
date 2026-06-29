import { buildProfileStatistics } from "../domain/stats.js";
import { formatChrono } from "../domain/chrono.js";
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

function valueOrDash(value, formatter = String) {
  return value === null || value === undefined ? "—" : formatter(value);
}

function formatDay(key) {
  if (!key) return "Aucune journée active";
  return new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function progressGainLabel(familiar) {
  const plural = ["pods", "dommages"].includes(String(familiar.progressShort || "").toLocaleLowerCase("fr"));
  return `${familiar.progressLabel} gagné${plural ? "s" : "e"}`;
}

function metric(label, value, note = "", accent = "") {
  const card = element("div", `stats-metric${accent ? ` is-${accent}` : ""}`);
  card.append(element("span", "stats-metric-label", label), element("strong", "stats-metric-value", value));
  if (note) card.append(element("small", "stats-metric-note", note));
  return card;
}

function section(title, badge = "") {
  const card = element("section", "stats-card");
  const header = element("header", "stats-card-header");
  header.append(element("h3", "", title));
  if (badge) header.append(element("span", "stats-card-badge", badge));
  card.append(header);
  return card;
}

export function createStatsController(options) {
  const { store, modal, resolveFamiliar, resolveRuntime } = options;
  const openButton = document.querySelector("#statsOpen");
  let activeView = "overview";

  function context() {
    const profile = selectActiveProfile(store.getState());
    if (!profile) return null;
    const familiar = resolveFamiliar(profile.data.familiarId);
    const runtime = resolveRuntime(profile.data.familiarId);
    if (!familiar || !runtime) return null;
    return { profile, familiar, runtime, stats: buildProfileStatistics(profile.data, familiar, runtime) };
  }

  function overviewView({ familiar, stats }) {
    const container = element("div", "stats-view");
    const progress = section("Progression actuelle", `${stats.progressPercent.toFixed(1)} %`);
    const progressGrid = element("div", "stats-metric-grid");
    progressGrid.append(
      metric(familiar.progressLabel, `${stats.progress} / ${familiar.objectiveMax}`, familiar.progressShort, "primary"),
      metric("Donjons effectués", String(stats.totalRuns), `${familiar.dungeons.length} parcours suivis`),
      metric("Monstres comptabilisés", String(stats.totalMonsterCount), "toutes sources"),
      metric("Jours actifs", String(stats.activity.activeDays), "avec au moins un donjon")
    );
    progress.append(progressGrid);

    const today = section("Aujourd'hui", `${stats.today.totalRuns} donjon${stats.today.totalRuns > 1 ? "s" : ""}`);
    const todayGrid = element("div", "stats-metric-grid");
    for (const dungeon of stats.dungeons) {
      todayGrid.append(metric(dungeon.label, String(stats.today.runs[dungeon.key] || 0), "donjons enregistrés"));
    }
    todayGrid.append(metric(progressGainLabel(familiar), `+${stats.today.progressGain}`, "progression du jour", "positive"));
    today.append(todayGrid);

    const regularity = section("Régularité et records");
    const regularityGrid = element("div", "stats-metric-grid");
    regularityGrid.append(
      metric("Série actuelle", `${stats.activity.currentStreak} j`, "jours consécutifs"),
      metric("Meilleure série", `${stats.activity.bestStreak} j`, "record du profil"),
      metric("Moyenne / jour actif", stats.activity.averageRunsPerActiveDay.toFixed(1), "donjons"),
      metric("Meilleure journée", stats.activity.bestDay ? `${stats.activity.bestDay.totalRuns} donjon${stats.activity.bestDay.totalRuns > 1 ? "s" : ""}` : "—", formatDay(stats.activity.bestDay?.key), "positive")
    );
    regularity.append(regularityGrid);
    container.append(progress, today, regularity);
    return container;
  }

  function dungeonsView({ familiar, stats }) {
    const container = element("div", "stats-view");
    const volume = section("Répartition des donjons", `${stats.totalRuns} au total`);
    const list = element("div", "stats-dungeon-list");
    for (const dungeon of stats.dungeons) {
      const row = element("article", "stats-dungeon-row");
      const identity = element("div", "stats-dungeon-identity");
      identity.append(element("strong", "", dungeon.fullLabel), element("span", "", `${dungeon.runs} effectué${dungeon.runs > 1 ? "s" : ""}`));
      const bar = element("div", "stats-bar");
      const fill = element("span");
      fill.style.width = `${dungeon.runShare}%`;
      bar.append(fill);
      row.append(identity, bar, element("strong", "stats-share", `${dungeon.runShare} %`));
      list.append(row);
    }
    volume.append(list);

    const contribution = section(`Contribution en ${familiar.progressShort}`, `${stats.contributions.total} brut`);
    const contributionGrid = element("div", "stats-metric-grid");
    for (const dungeon of stats.dungeons) {
      contributionGrid.append(metric(dungeon.label, `${dungeon.contributionShare} %`, `${dungeon.contribution} ${familiar.progressShort}`));
    }
    contributionGrid.append(metric("Zone / manuel", `${stats.contributions.zoneShare} %`, `${stats.contributions.zone || 0} ${familiar.progressShort}`));
    contribution.append(contributionGrid);
    container.append(volume, contribution);
    return container;
  }

  function timingView({ stats }) {
    const container = element("div", "stats-view");
    const timing = section("Temps chronométrés", `${stats.timing.markCount} run${stats.timing.markCount > 1 ? "s" : ""}`);
    const list = element("div", "stats-timing-list");
    for (const dungeon of stats.dungeons) {
      const row = element("article", "stats-timing-row");
      row.append(
        metric(dungeon.label, String(dungeon.markCount), "temps enregistrés"),
        metric("Meilleur", valueOrDash(dungeon.bestTime, formatChrono), "record"),
        metric("Moyenne réelle", valueOrDash(dungeon.averageTime, formatChrono), "runs marqués"),
        metric("Moyenne configurée", formatChrono(dungeon.configuredAverage), "projection")
      );
      list.append(row);
    }
    timing.append(list);
    container.append(timing);
    return container;
  }

  function draw() {
    const data = context();
    if (!data) return;
    const tabs = element("nav", "stats-tabs");
    tabs.setAttribute("aria-label", "Vues statistiques");
    const views = [["overview", "Vue d'ensemble"], ["dungeons", "Donjons"], ["timing", "Temps"]];
    for (const [key, label] of views) {
      const tab = button(label, `stats-tab${activeView === key ? " is-active" : ""}`);
      tab.setAttribute("aria-pressed", String(activeView === key));
      tab.addEventListener("click", () => { activeView = key; draw(); });
      tabs.append(tab);
    }
    const view = activeView === "dungeons" ? dungeonsView(data) : activeView === "timing" ? timingView(data) : overviewView(data);
    modal.body.replaceChildren(tabs, view);
  }

  function open() {
    const data = context();
    if (!data) return;
    activeView = "overview";
    modal.show("Statistiques", `Analysez la progression du profil ${data.profile.name}.`);
    draw();
    const close = button("Fermer");
    close.addEventListener("click", modal.close);
    modal.footer.append(close);
  }

  openButton?.addEventListener("click", open);
  return Object.freeze({ open });
}
