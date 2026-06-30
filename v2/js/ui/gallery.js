import {
  archiveAndRestartFamiliar,
  removeGalleryArchive,
  removeGalleryEvent,
  resetGallery,
  selectGalleryForProfile
} from "../domain/gallery.js";
import { getProfileProgress } from "../domain/progression.js";
import { selectActiveProfile } from "../state/selectors.js";

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

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDuration(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (days) return `${days} j ${hours} h ${minutes} min`;
  if (hours) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function eventLabel(id) {
  return String(id || "Événement")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function createGalleryController(options) {
  const { store, persistence, modal, notifications, resolveFamiliar, resolveRuntime } = options;
  const openButton = document.querySelector("#galleryOpen");
  const dependencies = { resolveFamiliar, resolveRuntime };
  let isOpen = false;
  let activeTab = "archives";
  let familiarFilter = "all";

  function persist(nextState) {
    store.replaceState(nextState);
    const result = persistence.save(store.getState());
    if (!result.ok) notifications?.error(result.error?.userMessage || "La galerie n'a pas pu être sauvegardée.");
    return result.ok;
  }

  function activeContext() {
    const state = store.getState();
    const profile = selectActiveProfile(state);
    const familiar = profile ? resolveFamiliar(profile.data.familiarId) : null;
    const runtime = profile ? resolveRuntime(profile.data.familiarId) : null;
    return { state, profile, familiar, runtime, profileId: state.active };
  }

  function tabs() {
    const nav = element("nav", "gallery-tabs");
    nav.setAttribute("aria-label", "Sections de la galerie");
    for (const [id, label] of [["archives", "Archives"], ["events", "Événements"], ["settings", "Paramètres"]]) {
      const tab = button(label, `gallery-tab${activeTab === id ? " is-active" : ""}`);
      tab.setAttribute("aria-pressed", String(activeTab === id));
      tab.addEventListener("click", () => { activeTab = id; options.onSectionViewed?.(id); render(); });
      nav.append(tab);
    }
    return nav;
  }

  function renderSummary(gallery) {
    const archives = gallery.completedPykurs;
    const eventCount = Object.keys(gallery.eventsDiscovered).length;
    const totalChrono = archives.reduce((sum, archive) => sum + (Number(archive.totalChrono) || 0), 0);
    const first = archives.map((item) => item.finishedAt).filter(Boolean).sort()[0];
    const summary = element("section", "gallery-summary");
    for (const [label, value] of [
      ["Familiers terminés", archives.length],
      ["Événements découverts", eventCount],
      ["Temps total de farm", totalChrono ? formatDuration(totalChrono) : "—"],
      ["Premier familier terminé", formatDate(first)]
    ]) {
      const card = element("article", "gallery-summary-card");
      card.append(element("span", "", label), element("strong", "", String(value)));
      summary.append(card);
    }
    return summary;
  }

  function pendingArchive(context) {
    if (!context.profile || !context.familiar || !context.runtime) return null;
    const progress = getProfileProgress(context.profile.data, context.familiar, context.runtime);
    return progress >= context.familiar.objectiveMax ? { progress } : null;
  }

  function renderArchives(context, gallery) {
    const container = element("section", "gallery-view");
    container.append(renderSummary(gallery));
    if (pendingArchive(context)) {
      const notice = element("section", "gallery-completion-notice");
      const copy = element("div");
      copy.append(element("strong", "", `${context.familiar.label} a atteint son objectif.`), element("span", "", "Archivez ce cycle avant de commencer une nouvelle progression."));
      const archive = button("Archiver et recommencer", "button button-accent");
      archive.addEventListener("click", () => showCompletion(context));
      notice.append(copy, archive);
      container.append(notice);
    }

    const families = [...new Set(gallery.completedPykurs.map((item) => item.familiarId || "pykur"))];
    if (familiarFilter !== "all" && !families.includes(familiarFilter)) familiarFilter = "all";
    const controls = element("div", "gallery-filter-row");
    controls.append(element("strong", "", "Familiers terminés"));
    const select = element("select");
    select.setAttribute("aria-label", "Filtrer les archives par familier");
    const all = element("option", "", `Tous (${gallery.completedPykurs.length})`);
    all.value = "all";
    select.append(all);
    for (const id of families.sort((a, b) => (resolveFamiliar(a)?.label || a).localeCompare(resolveFamiliar(b)?.label || b))) {
      const count = gallery.completedPykurs.filter((item) => (item.familiarId || "pykur") === id).length;
      const option = element("option", "", `${resolveFamiliar(id)?.label || id} (${count})`);
      option.value = id;
      select.append(option);
    }
    select.value = familiarFilter;
    select.addEventListener("change", () => { familiarFilter = select.value; render(); });
    controls.append(select);
    container.append(controls);

    const archives = familiarFilter === "all"
      ? gallery.completedPykurs
      : gallery.completedPykurs.filter((item) => (item.familiarId || "pykur") === familiarFilter);
    if (!archives.length) {
      const empty = element("div", "gallery-empty");
      empty.append(element("strong", "", "Aucun familier archivé"), element("span", "", "Les familiers terminés apparaîtront ici."));
      container.append(empty);
      return container;
    }

    const grid = element("div", "gallery-archive-grid");
    for (const archive of archives) {
      const familiar = resolveFamiliar(archive.familiarId || "pykur");
      const card = element("article", "gallery-archive-card");
      const head = element("header");
      const image = element("img");
      image.src = familiar?.auraImage || archive.image || familiar?.image || "";
      image.alt = archive.familiarLabel || familiar?.label || "Familier terminé";
      image.loading = "lazy";
      const title = element("div");
      title.append(element("h3", "", `${archive.familiarLabel || familiar?.label || "Familier"} #${archive.number}`), element("span", "gallery-title-badge", archive.title || "Le Farmer"));
      head.append(image, title);
      const meta = element("div", "gallery-archive-meta");
      for (const [label, value] of [
        ["Profil", archive.profileName || "Profil"],
        ["Terminé le", formatDate(archive.finishedAt)],
        ["Durée", formatDuration(archive.durationSeconds)],
        [archive.progressLabel || familiar?.progressShort || "Progression", `${archive.pp || 0} / ${archive.objectiveMax || familiar?.objectiveMax || 0}`]
      ]) {
        const row = element("div");
        row.append(element("span", "", label), element("strong", "", String(value)));
        meta.append(row);
      }
      const runs = element("div", "gallery-run-list");
      for (const run of archive.runDetails || []) runs.append(element("span", "", `${run.label} : ${run.value}`));
      const remove = button("Supprimer", "button button-danger");
      remove.addEventListener("click", () => confirmArchiveRemoval(context.profileId, archive));
      card.append(head, meta, runs, remove);
      grid.append(card);
    }
    container.append(grid);
    return container;
  }

  function renderEvents(context, gallery) {
    const container = element("section", "gallery-view");
    const events = Object.entries(gallery.eventsDiscovered);
    const heading = element("div", "gallery-filter-row");
    heading.append(element("strong", "", "Collection d'événements"), element("span", "gallery-count-badge", `${events.length} découverts`));
    container.append(heading);
    if (!events.length) {
      const empty = element("div", "gallery-empty");
      empty.append(element("strong", "", "Aucun événement découvert"), element("span", "", "Les événements vivants seront conservés ici après leur migration."));
      container.append(empty);
      return container;
    }
    const grid = element("div", "gallery-event-grid");
    for (const [id, event] of events.sort((a, b) => String(b[1]?.lastSeen || "").localeCompare(String(a[1]?.lastSeen || "")))) {
      const card = element("article", "gallery-event-card");
      card.append(element("h3", "", event.label || eventLabel(id)), element("strong", "", `Vu ${Math.max(1, Number(event.count) || 1)} fois`));
      const dates = element("p", "", `Première apparition : ${formatDate(event.firstSeen)} · Dernière : ${formatDate(event.lastSeen)}`);
      const remove = button("Retirer", "button button-danger");
      remove.addEventListener("click", () => {
        if (persist(removeGalleryEvent(store.getState(), context.profileId, id))) {
          notifications?.warning("Événement retiré de la galerie.");
          render();
        }
      });
      card.append(dates, remove);
      grid.append(card);
    }
    container.append(grid);
    return container;
  }

  function renderSettings(context) {
    const container = element("section", "gallery-view gallery-settings");
    const account = element("section", "gallery-setting-card");
    const accountCopy = element("div");
    accountCopy.append(
      element("strong", "", "Mémoire de la galerie"),
      element("small", "", "Elle est liée à votre compte. En mode invité, elle reste enregistrée uniquement dans ce navigateur.")
    );
    account.append(accountCopy);
    const danger = element("section", "gallery-setting-card is-danger");
    const dangerCopy = element("div");
    dangerCopy.append(element("strong", "", "Réinitialiser la galerie"), element("small", "", "Supprime les archives et événements de la galerie active."));
    const reset = button("Réinitialiser", "button button-danger");
    reset.addEventListener("click", () => confirmReset(context.profileId));
    danger.append(dangerCopy, reset);
    container.append(account, danger);
    return container;
  }

  function render() {
    if (!isOpen) return;
    const context = activeContext();
    modal.body.replaceChildren(tabs());
    if (!context.profile) {
      modal.body.append(element("div", "gallery-empty", "Créez un profil pour accéder à la galerie."));
      return;
    }
    const gallery = selectGalleryForProfile(context.state, context.profileId);
    if (activeTab === "events") modal.body.append(renderEvents(context, gallery));
    else if (activeTab === "settings") modal.body.append(renderSettings(context));
    else modal.body.append(renderArchives(context, gallery));
  }

  function open(tab = "archives") {
    activeTab = ["archives", "events", "settings"].includes(tab) ? tab : "archives";
    isOpen = true;
    modal.show("Galerie", "Retrouvez vos familiers terminés et votre collection d'événements.", { onClose: () => { isOpen = false; } });
    const close = button("Fermer");
    close.addEventListener("click", () => { isOpen = false; modal.close(); });
    modal.footer.append(close);
    options.onOpen?.();
    render();
  }

  function showCompletion(context = activeContext()) {
    if (!context.profile || !pendingArchive(context)) return;
    isOpen = false;
    modal.show(`${context.familiar.label} terminé`, "Votre objectif est atteint. Vous pouvez conserver cette aventure dans la galerie.");
    const hero = element("section", "gallery-completion-hero");
    const image = element("img");
    image.src = context.familiar.auraImage || context.familiar.image;
    image.alt = `${context.familiar.label} terminé`;
    const copy = element("div");
    copy.append(element("strong", "", `${context.familiar.objectiveMax} ${context.familiar.progressShort}`), element("span", "", "Le profil sera remis à zéro pour commencer un nouveau cycle. Vos options et références Dofus seront conservées."));
    hero.append(image, copy);
    modal.body.append(hero);
    const later = button("Plus tard");
    later.addEventListener("click", modal.close);
    const confirm = button("Archiver et recommencer", "button button-accent");
    confirm.addEventListener("click", () => {
      try {
        const result = archiveAndRestartFamiliar(store.getState(), context.profileId, dependencies);
        if (persist(result.state)) {
          modal.close();
          notifications?.success(`${result.archive.familiarLabel} #${result.archive.number} archivé. Nouvelle aventure lancée.`);
          options.onArchive?.(result.archive);
        }
      } catch (error) {
        modal.showError(error.message);
      }
    });
    modal.footer.replaceChildren(later, confirm);
  }

  function confirmArchiveRemoval(profileId, archive) {
    isOpen = false;
    modal.show("Supprimer l'archive", `${archive.familiarLabel || "Ce familier"} #${archive.number} sera retiré de la galerie.`);
    modal.body.append(element("p", "dialog-warning", "Cette suppression sera également conservée lors des synchronisations cloud."));
    const cancel = button("Annuler");
    cancel.addEventListener("click", () => open("archives"));
    const confirm = button("Supprimer", "button button-danger");
    confirm.addEventListener("click", () => {
      if (persist(removeGalleryArchive(store.getState(), profileId, archive.id))) {
        notifications?.warning("Archive supprimée.");
        open("archives");
      }
    });
    modal.footer.replaceChildren(cancel, confirm);
  }

  function confirmReset(profileId) {
    isOpen = false;
    modal.show("Réinitialiser la galerie", "Toutes les archives et découvertes de la galerie active seront supprimées.");
    modal.body.append(element("p", "dialog-warning", "Cette action est irréversible et sera synchronisée dans le cloud."));
    const cancel = button("Annuler");
    cancel.addEventListener("click", () => open("settings"));
    const confirm = button("Réinitialiser", "button button-danger");
    confirm.addEventListener("click", () => {
      if (persist(resetGallery(store.getState(), profileId))) {
        notifications?.warning("Galerie réinitialisée.");
        open("archives");
      }
    });
    modal.footer.replaceChildren(cancel, confirm);
  }

  function handleRun(event) {
    if (event.delta <= 0) return;
    const context = activeContext();
    if (context.profileId !== event.profileId || !context.familiar) return;
    if (event.oldProgress < context.familiar.objectiveMax && event.newProgress >= context.familiar.objectiveMax) showCompletion(context);
  }

  openButton?.addEventListener("click", () => open());
  const unsubscribe = store.subscribe(() => { if (isOpen) render(); });
  const unsubscribeRun = options.subscribeRun?.(handleRun) || (() => {});
  return Object.freeze({
    open,
    render,
    showCompletion,
    destroy() { unsubscribe(); unsubscribeRun(); }
  });
}
