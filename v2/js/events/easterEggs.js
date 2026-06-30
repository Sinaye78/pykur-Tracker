import { collectSecretEgg, isSecretEggCollected } from "../domain/easterEggs.js";
import { createCharlieController } from "./easterEggs/charlie.js";
import { createSecretSequenceController } from "./easterEggs/sequence.js";
import { createToomController } from "./easterEggs/toom.js";

export function createEasterEggController(options) {
  const { store, persistence, notifications, onUnlock } = options;
  const secretEgg = document.querySelector("#hiddenSecretEgg");
  const charlie = createCharlieController({ notifications, onUnlock });
  const toom = createToomController({ notifications, onUnlock });
  const sequences = createSecretSequenceController({
    commands: { charlie: charlie.toggle, toom: toom.toggle }
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
    destroy() {
      destroyed = true;
      unsubscribe();
      charlie.destroy();
      toom.destroy();
      sequences.destroy();
      secretEgg?.removeEventListener("click", collect);
      if (secretEgg) secretEgg.hidden = true;
    }
  });
}
