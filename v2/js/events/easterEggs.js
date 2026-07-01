import { collectSecretEgg, isSecretEggCollected, recordHappiosHover } from "../domain/easterEggs.js";
import { createAinaController } from "./easterEggs/aina.js";
import { createAlhassController } from "./easterEggs/alhass.js";
import { createBrakoController } from "./easterEggs/brako.js";
import { createCharlieController } from "./easterEggs/charlie.js";
import { createRajController } from "./easterEggs/raj.js";
import { createSecretSequenceController } from "./easterEggs/sequence.js";
import { createToomController } from "./easterEggs/toom.js";

export function createEasterEggController(options) {
  const { store, persistence, notifications, audio, onUnlock, resolveFamiliar, subscribeRun, subscribeGuard } = options;
  const secretEgg = document.querySelector("#hiddenSecretEgg");
  const charlie = createCharlieController({ notifications, onUnlock });
  const toom = createToomController({ notifications, onUnlock });
  const aina = createAinaController({ notifications, audio, onUnlock });
  const alhass = createAlhassController({ notifications, onUnlock });

  function handleHappiosHover() {
    const result = recordHappiosHover(store.getState());
    store.replaceState(result.state);
    persistence.save(store.getState());
    if (result.shouldUnlock) onUnlock?.("secret_happios_hover");
    return result.count;
  }

  const raj = createRajController({
    notifications,
    onUnlock,
    onHappiosHover: handleHappiosHover,
    targets: [
      { id: "aina", label: "Aina", controller: aina },
      { id: "alhass", label: "Alhass", controller: alhass },
      { id: "toom", label: "Toom", controller: toom },
      { id: "charlie", label: "Charlie", controller: charlie }
    ]
  });
  const brako = createBrakoController({ notifications, onUnlock, rajController: raj });
  raj.setRivalController(brako);
  const sequences = createSecretSequenceController({
    commands: {
      aina: aina.toggle,
      alhass: alhass.toggle,
      brako: brako.toggle,
      charlie: charlie.toggle,
      raj: raj.toggle,
      toom: toom.toggle
    }
  });
  const unsubscribeRun = subscribeRun?.((event) => {
    if (event.delta <= 0) return;
    const profile = store.getState().profiles?.byId?.[event.profileId];
    const familiar = resolveFamiliar?.(profile?.data?.familiarId);
    const maximum = Number(familiar?.objectiveMax) || 0;
    const oldStep = maximum ? Math.floor(Math.max(0, event.oldProgress) * 10 / maximum) : 0;
    const newStep = maximum ? Math.floor(Math.max(0, event.newProgress) * 10 / maximum) : 0;
    if (newStep > oldStep) alhass.react("milestone", event.newProgress >= maximum);
    else alhass.react("run");
  }) || (() => {});
  const unsubscribeGuard = subscribeGuard?.(() => alhass.react("guard", true)) || (() => {});
  let destroyed = false;

  function render(state = store.getState()) {
    if (!secretEgg || destroyed) return;
    secretEgg.hidden = isSecretEggCollected(state);
  }

  function collect() {
    const result = collectSecretEgg(store.getState());
    if (!result.collected) return false;
    store.replaceState(result.state);
    persistence.save(store.getState());
    notifications?.notify({
      message: "Œuf secret récupéré. Le sceau des succès peut maintenant être ouvert.",
      type: "rare"
    });
    return true;
  }

  secretEgg?.addEventListener("click", collect);
  const unsubscribe = store.subscribe(render);
  render();

  return Object.freeze({
    collect,
    render,
    charlie,
    toom,
    aina,
    alhass,
    raj,
    brako,
    destroy() {
      destroyed = true;
      unsubscribe();
      charlie.destroy();
      toom.destroy();
      aina.destroy();
      alhass.destroy();
      brako.destroy();
      raj.destroy();
      sequences.destroy();
      unsubscribeRun();
      unsubscribeGuard();
      secretEgg?.removeEventListener("click", collect);
      if (secretEgg) secretEgg.hidden = true;
    }
  });
}
