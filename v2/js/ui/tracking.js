import { setMonsterCount, totalMonsters } from "../domain/monsters.js";
import { getProfileProgress } from "../domain/progression.js";
import { setRunCount } from "../domain/runs.js";
import { cloneValue } from "../state/defaults.js";
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

function normalizedText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

export function createTrackingDialogs(options) {
  const { store, modal, resolveFamiliar, resolveRuntime, gelutinBossGains, persist, announce, recordHistory, onManualAdjustment } = options;
  const dependencies = { resolveFamiliar, resolveRuntime, gelutinBossGains };

  function context() {
    const state = store.getState();
    const profile = selectActiveProfile(state);
    if (!profile) throw new Error("Aucun profil actif.");
    const familiar = resolveFamiliar(profile.data.familiarId);
    const runtime = resolveRuntime(profile.data.familiarId);
    if (!familiar || !runtime) throw new Error("Configuration du familier introuvable.");
    return { state, profile, familiar, runtime };
  }

  function openRunEditor() {
    const { state, profile, familiar, runtime } = context();
    modal.show("Modifier les donjons", `Ajustez les runs du profil ${profile.name}. Les monstres de chaque donjon seront reconstruits.`);
    const form = element("form", "run-editor-grid");
    for (const dungeon of familiar.dungeons) {
      const row = element("label", "run-editor-row");
      const identity = element("span", "run-editor-identity");
      if (dungeon.asset) {
        const image = element("img");
        image.src = dungeon.asset;
        image.alt = "";
        identity.append(image);
      }
      identity.append(element("strong", "", dungeon.fullLabel));
      const input = element("input");
      input.type = "number";
      input.min = "0";
      input.max = String(runtime.runLimits?.[dungeon.key] ?? 999999);
      input.step = "1";
      input.value = String(profile.data.runs?.[dungeon.key] || 0);
      input.dataset.dungeon = dungeon.key;
      input.setAttribute("aria-label", `Runs ${dungeon.fullLabel}`);
      row.append(identity, input);
      form.append(row);
    }
    modal.body.append(form);
    const cancel = button("Annuler");
    const save = button("Enregistrer", "button button-primary");
    cancel.addEventListener("click", modal.close);
    const submit = () => {
      try {
        let next = state;
        for (const input of form.querySelectorAll("input[data-dungeon]")) {
          next = setRunCount(next, state.active, input.dataset.dungeon, input.value, dependencies);
        }
        const changes = familiar.dungeons.filter((dungeon) => {
          return Number(profile.data.runs?.[dungeon.key] || 0) !== Number(next.profiles[state.active].data.runs?.[dungeon.key] || 0);
        });
        const saved = persist(next);
        if (saved && changes.length) {
          recordHistory?.(state.active, {
            message: `Compteurs de donjons corrigés : ${changes.map((dungeon) => dungeon.label).join(", ")}.`,
            kind: "edit"
          });
          onManualAdjustment?.("runs");
        }
        modal.close();
        announce("Compteurs de donjons et monstres synchronisés.");
      } catch (error) {
        modal.showError(error.message);
      }
    };
    save.addEventListener("click", submit);
    form.addEventListener("submit", (event) => { event.preventDefault(); submit(); });
    modal.footer.append(cancel, save);
    queueMicrotask(() => form.querySelector("input")?.focus());
  }

  function openMonsters(initialSource = "all") {
    const initial = context();
    const sourceKeys = [...initial.familiar.dungeons.map((dungeon) => dungeon.key), "zone", "all"];
    let source = sourceKeys.includes(initialSource) ? initialSource : "all";
    modal.show("Monstres tués", `Consultez les paliers de ${initial.familiar.label} et corrigez chaque source séparément.`);

    const controls = element("div", "monster-controls");
    const tabs = element("div", "monster-tabs");
    const search = element("input", "monster-search");
    search.type = "search";
    search.placeholder = "Rechercher un monstre...";
    search.setAttribute("aria-label", "Rechercher un monstre");
    controls.append(tabs, search);
    const summary = element("div", "monster-summary");
    const list = element("div", "monster-list");
    modal.body.append(controls, summary, list);

    function sourceLabel(key, familiar) {
      if (key === "all") return "Tous";
      if (key === "zone") return "Zone";
      return familiar.dungeons.find((dungeon) => dungeon.key === key)?.label || key;
    }

    function eligibleMonster(runtime, mobId, monster, selectedSource) {
      if (monster.noProgress) return false;
      if (selectedSource === "all") return true;
      if (monster.cat?.includes(selectedSource)) return true;
      return Object.hasOwn(runtime.gains?.[selectedSource] || {}, mobId);
    }

    function drawTabs(familiar) {
      tabs.replaceChildren();
      for (const key of sourceKeys) {
        const tab = button(sourceLabel(key, familiar), `monster-tab${key === source ? " is-active" : ""}`);
        tab.dataset.source = key;
        tab.setAttribute("aria-pressed", String(key === source));
        tab.addEventListener("click", () => { source = key; draw(); });
        tabs.append(tab);
      }
    }

    function draw() {
      const { profile, familiar, runtime } = context();
      drawTabs(familiar);
      const totals = totalMonsters(profile.data, familiar, runtime);
      const progress = getProfileProgress(profile.data, familiar, runtime);
      const entries = Object.entries(runtime.mobs || {}).filter(([mobId, monster]) => {
        return eligibleMonster(runtime, mobId, monster, source)
          && normalizedText(monster.name).includes(normalizedText(search.value));
      }).sort((a, b) => a[1].name.localeCompare(b[1].name, "fr"));
      const totalCount = Object.values(totals).reduce((sum, value) => sum + value, 0);
      summary.replaceChildren(
        element("span", "", `${entries.length} monstre${entries.length > 1 ? "s" : ""} affiché${entries.length > 1 ? "s" : ""}`),
        element("span", "", `${totalCount} tués au total`),
        element("strong", "", `${progress} / ${familiar.objectiveMax} ${familiar.progressShort}`)
      );
      list.replaceChildren();
      for (const [mobId, monster] of entries) {
        const row = element("article", "monster-row");
        const imageBox = element("div", "monster-sprite");
        const image = element("img");
        image.src = monster.imgPath;
        image.alt = monster.name;
        image.loading = "lazy";
        imageBox.append(image);
        const info = element("div", "monster-info");
        info.append(element("strong", "", monster.name));
        const need = Math.max(1, Number(monster.ppNeed) || 1);
        const gain = Math.max(1, Number(monster.gainValue) || 1);
        const remaining = need - (totals[mobId] % need || 0);
        info.append(
          element("span", "", `+${gain} ${familiar.progressShort} / ${need}`),
          element("small", "", progress >= familiar.objectiveMax ? "Objectif atteint" : `${remaining} restant${remaining > 1 ? "s" : ""} avant le prochain gain`)
        );
        const count = element("div", "monster-count");
        if (source === "all") {
          count.append(element("strong", "", String(totals[mobId])));
          count.append(element("span", "", "Total"));
        } else {
          const input = element("input");
          input.type = "number";
          input.min = "0";
          input.step = "1";
          input.value = String(profile.data.mobs?.[source]?.[mobId] || 0);
          input.dataset.mob = mobId;
          input.setAttribute("aria-label", `${monster.name}, ${sourceLabel(source, familiar)}`);
          count.append(input);
        }
        row.append(imageBox, info, count);
        list.append(row);
      }
      if (!entries.length) list.append(element("p", "monster-empty", "Aucun monstre ne correspond à cette recherche."));
      drawFooter();
    }

    function drawFooter() {
      modal.footer.replaceChildren();
      const close = button("Fermer");
      close.addEventListener("click", modal.close);
      modal.footer.append(close);
      if (source === "all") return;
      const save = button("Enregistrer les compteurs", "button button-primary");
      save.addEventListener("click", () => {
        try {
          const { state, profile, familiar, runtime } = context();
          const next = cloneValue(state);
          let data = profile.data;
          for (const input of list.querySelectorAll("input[data-mob]")) {
            data = setMonsterCount(data, familiar, runtime, source, input.dataset.mob, input.value, { gelutinBossGains });
          }
          next.profiles[state.active].data = data;
          const saved = persist(next);
          if (saved) {
            recordHistory?.(state.active, {
              message: `Compteurs de monstres corrigés pour ${sourceLabel(source, familiar)}.`,
              kind: "edit",
              farmKey: source === "zone" || source === "all" ? null : source
            });
            onManualAdjustment?.("monsters");
          }
          announce(`Compteurs ${sourceLabel(source, familiar)} enregistrés.`);
          draw();
        } catch (error) {
          modal.showError(error.message);
        }
      });
      modal.footer.append(save);
    }

    search.addEventListener("input", draw);
    draw();
    queueMicrotask(() => search.focus());
  }

  return Object.freeze({ openRunEditor, openMonsters });
}
