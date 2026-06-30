import { createProfileCleanupRegistry, pageFamiliars, createProfile, deleteProfile, renameProfile, switchProfile } from "../domain/profiles.js";
import { searchFamiliars } from "../config/familiars.js";
import { selectActiveProfile } from "../state/selectors.js";

function button(label, className = "button button-neutral") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function formatStars(count) {
  return "★".repeat(Math.max(1, Math.min(3, Number(count) || 1)));
}

export function createProfilesController(options) {
  const { store, persistence, catalog, resolveFamiliar, modal, recordHistory, notifications } = options;
  const select = document.querySelector("#profilePreview");
  const createButton = document.querySelector("#profileCreate");
  const renameButton = document.querySelector("#profileRename");
  const deleteButton = document.querySelector("#profileDelete");
  const modalBody = modal.body;
  const modalFooter = modal.footer;
  const profileCleanups = createProfileCleanupRegistry({
    onError: (error) => console.error("Nettoyage de profil impossible", error)
  });

  function runProfileCleanups() {
    profileCleanups.run();
  }

  function registerProfileCleanup(cleanup) {
    return profileCleanups.register(cleanup);
  }

  function closeModal() {
    modal.close();
  }

  function openModal(title, subtitle) {
    modal.show(title, subtitle);
  }

  function showError(message) {
    const notice = document.createElement("p");
    notice.className = "dialog-error";
    notice.setAttribute("role", "alert");
    notice.textContent = message;
    modalBody.prepend(notice);
  }

  function persist(nextState) {
    store.replaceState(nextState);
    const result = persistence.save(store.getState());
    if (!result.ok) showError(result.error.userMessage);
    render();
    return result.ok;
  }

  function renderIdentity() {
    const active = selectActiveProfile(store.getState());
    if (!active) return;
    const familiar = resolveFamiliar(active.data?.familiarId);
    if (!familiar) return;
    const image = document.querySelector(".familiar-image");
    const caption = document.querySelector(".familiar-caption");
    if (image) {
      image.src = familiar.image;
      image.alt = familiar.label;
    }
    if (caption) caption.textContent = `Progression du ${familiar.label}`;
    if (familiar.background) document.body.style.setProperty("--familiar-background", `url("${familiar.background}")`);
  }

  function render() {
    const state = store.getState();
    const ids = Object.keys(state.profiles || {});
    select.replaceChildren();
    if (!ids.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Aucun profil";
      select.append(option);
    } else {
      for (const id of ids) {
        const profile = state.profiles[id];
        const familiar = resolveFamiliar(profile.data?.familiarId);
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${profile.name} · ${familiar?.label || profile.data?.familiarId || "Familier"}`;
        select.append(option);
      }
      select.value = state.active || ids[0];
    }
    select.disabled = !ids.length;
    renameButton.disabled = !state.active;
    deleteButton.disabled = ids.length <= 1;
    renderIdentity();
  }

  function showNameStep(familiar, initial) {
    openModal("Créer un profil", `Nommez votre profil ${familiar.label}.`);
    const form = document.createElement("form");
    form.className = "profile-name-form";
    const label = document.createElement("label");
    label.htmlFor = "newProfileName";
    label.textContent = "Nom du profil";
    const input = document.createElement("input");
    input.id = "newProfileName";
    input.maxLength = 60;
    input.required = true;
    input.value = familiar.defaultProfileName;
    form.append(label, input);
    modalBody.append(form);
    const back = button("Retour");
    const confirm = button("Créer", "button button-success");
    back.addEventListener("click", () => showCatalog(initial, familiar.id));
    const submit = () => {
      try {
        const result = createProfile(store.getState(), { familiarId: familiar.id, name: input.value }, {
          resolveFamiliar,
          idFactory: options.idFactory
        });
        const saved = persist(result.state);
        if (saved) recordHistory?.(result.profileId, {
          message: `Profil ${result.state.profiles[result.profileId].name} créé pour ${familiar.label}.`,
          kind: "profile",
          type: "success"
        });
        if (saved) notifications?.profile(`Profil ${result.state.profiles[result.profileId].name} créé.`);
        if (saved) options.onProfileCreated?.(result.profileId);
        closeModal();
      } catch (error) {
        showError(error.message);
      }
    };
    confirm.addEventListener("click", submit);
    form.addEventListener("submit", (event) => { event.preventDefault(); submit(); });
    modalFooter.append(back, confirm);
    queueMicrotask(() => input.focus());
  }

  function showCatalog(initial = false, preferredId = null) {
    openModal("Choisir un familier", "Sélectionnez le familier à suivre pour ce profil.");
    const search = document.createElement("input");
    search.type = "search";
    search.className = "familiar-search";
    search.placeholder = "Rechercher un familier...";
    search.setAttribute("aria-label", "Rechercher un familier");
    const summary = document.createElement("div");
    summary.className = "familiar-catalog-summary";
    const grid = document.createElement("div");
    grid.className = "familiar-catalog-grid";
    const pager = document.createElement("div");
    pager.className = "familiar-catalog-pager";
    const previous = button("Précédent");
    const pageLabel = document.createElement("span");
    const next = button("Suivant");
    pager.append(previous, pageLabel, next);
    modalBody.append(search, summary, grid, pager);
    let selectedId = preferredId || catalog[0]?.id || null;
    let page = Math.max(0, catalog.findIndex((item) => item.id === selectedId) / 4 | 0);

    function draw() {
      const matches = searchFamiliars(search.value);
      const current = pageFamiliars(matches, page, 4);
      page = current.page;
      summary.textContent = `${current.total} familier${current.total > 1 ? "s" : ""} disponible${current.total > 1 ? "s" : ""}`;
      pageLabel.textContent = `Page ${current.total ? current.page + 1 : 0}/${current.total ? current.pageCount : 0}`;
      previous.disabled = current.page === 0;
      next.disabled = current.page >= current.pageCount - 1 || current.total === 0;
      grid.replaceChildren();
      for (const familiar of current.entries) {
        const card = document.createElement("label");
        card.className = `familiar-choice-card${familiar.id === selectedId ? " is-selected" : ""}`;
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "familiarChoice";
        radio.value = familiar.id;
        radio.checked = familiar.id === selectedId;
        const image = document.createElement("img");
        image.src = familiar.logo || familiar.image;
        image.alt = "";
        const content = document.createElement("span");
        const title = document.createElement("strong");
        title.textContent = familiar.label;
        const description = document.createElement("small");
        description.textContent = familiar.description;
        const bonus = document.createElement("span");
        bonus.className = "familiar-choice-meta";
        bonus.textContent = `${familiar.objectiveLabel} · ${formatStars(familiar.difficultyStars)}`;
        content.append(title, description, bonus);
        card.append(radio, image, content);
        radio.addEventListener("change", () => { selectedId = familiar.id; draw(); });
        grid.append(card);
      }
      if (!current.total) {
        const empty = document.createElement("p");
        empty.className = "familiar-catalog-empty";
        empty.textContent = "Aucun familier trouvé.";
        grid.append(empty);
      }
    }

    search.addEventListener("input", () => { page = 0; draw(); });
    previous.addEventListener("click", () => { page -= 1; draw(); });
    next.addEventListener("click", () => { page += 1; draw(); });
    const cancel = button("Annuler");
    const continueButton = button("Continuer", "button button-primary");
    cancel.addEventListener("click", closeModal);
    continueButton.addEventListener("click", () => {
      const familiar = resolveFamiliar(selectedId);
      if (familiar) showNameStep(familiar, initial);
    });
    modalFooter.append(cancel, continueButton);
    draw();
    queueMicrotask(() => search.focus());
  }

  function showRename() {
    const state = store.getState();
    const profile = selectActiveProfile(state);
    if (!profile) return;
    openModal("Renommer le profil", "Choisissez un nouveau nom pour ce profil.");
    const input = document.createElement("input");
    input.value = profile.name;
    input.maxLength = 60;
    input.setAttribute("aria-label", "Nouveau nom du profil");
    modalBody.append(input);
    const cancel = button("Annuler");
    const confirm = button("Renommer", "button button-accent");
    cancel.addEventListener("click", closeModal);
    confirm.addEventListener("click", () => {
      try {
        const oldName = profile.name;
        const next = renameProfile(store.getState(), state.active, input.value);
        const saved = persist(next);
        if (saved) recordHistory?.(state.active, {
          message: `Profil renommé : ${oldName} → ${next.profiles[state.active].name}.`,
          kind: "profile"
        });
        if (saved) notifications?.profile(`Profil renommé en ${next.profiles[state.active].name}.`);
        closeModal();
      } catch (error) { showError(error.message); }
    });
    modalFooter.append(cancel, confirm);
    queueMicrotask(() => input.focus());
  }

  function showDelete() {
    const state = store.getState();
    const profile = selectActiveProfile(state);
    if (!profile || Object.keys(state.profiles).length <= 1) return;
    openModal("Supprimer le profil", "Cette action supprime toute la progression de ce profil.");
    const warning = document.createElement("div");
    warning.className = "profile-delete-warning";
    warning.innerHTML = `<strong></strong><p>Progression, statistiques, historique et galerie locale seront supprimés.</p><p>Cette action est irréversible.</p>`;
    warning.querySelector("strong").textContent = profile.name;
    modalBody.append(warning);
    const cancel = button("Annuler");
    const confirm = button("Supprimer", "button button-danger");
    cancel.addEventListener("click", closeModal);
    confirm.addEventListener("click", () => {
      try {
        runProfileCleanups();
        const deletedName = profile.name;
        if (persist(deleteProfile(store.getState(), state.active))) notifications?.warning(`Profil ${deletedName} supprimé.`);
        closeModal();
      } catch (error) { showError(error.message); }
    });
    modalFooter.append(cancel, confirm);
  }

  select.addEventListener("change", () => {
    try {
      runProfileCleanups();
      const next = switchProfile(store.getState(), select.value);
      if (persist(next)) notifications?.profile(`Profil ${next.profiles[select.value].name} activé.`);
    } catch (error) { console.error(error); render(); }
  });
  createButton.addEventListener("click", () => showCatalog(false));
  renameButton.addEventListener("click", showRename);
  deleteButton.addEventListener("click", showDelete);
  render();
  if (!store.getState().active && options.autoOpenInitial !== false) queueMicrotask(() => showCatalog(true));

  return Object.freeze({ render, showCatalog, closeModal, registerProfileCleanup, runProfileCleanups });
}
