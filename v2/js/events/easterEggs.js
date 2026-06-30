import { collectSecretEgg, isSecretEggCollected } from "../domain/easterEggs.js";
import { createAinaController } from "./easterEggs/aina.js";
import { createCharlieController } from "./easterEggs/charlie.js";
import { createRajController } from "./easterEggs/raj.js";
import { createSecretSequenceController } from "./easterEggs/sequence.js";
import { createToomController } from "./easterEggs/toom.js";

export function createEasterEggController(options) {
  const { store, persistence, notifications, audio, onUnlock } = options;
  const secretEgg = document.querySelector("#hiddenSecretEgg");
  const charlie = createCharlieController({ notifications, onUnlock });
  const toom = createToomController({ notifications, onUnlock });
  const aina = createAinaController({ notifications, audio, onUnlock });
  const raj = createRajController({
    notifications,
    onUnlock,
    targets: [
      { id: "aina", label: "Aina", controller: aina },
      { id: "toom", label: "Toom", controller: toom },
      { id: "charlie", label: "Charlie", controller: charlie }
    ]
  });
  const sequences = createSecretSequenceController({
    commands: { aina: aina.toggle, charlie: charlie.toggle, raj: raj.toggle, toom: toom.toggle }
  });
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
    raj,
    destroy() {
      destroyed = true;
      unsubscribe();
      charlie.destroy();
      toom.destroy();
      aina.destroy();
      raj.destroy();
      sequences.destroy();
      secretEgg?.removeEventListener("click", collect);
      if (secretEgg) secretEgg.hidden = true;
    }
  });
}
