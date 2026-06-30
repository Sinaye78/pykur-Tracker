import { collectSecretEgg, isSecretEggCollected } from "../domain/easterEggs.js";
import { createCharlieController } from "./easterEggs/charlie.js";

export function createEasterEggController(options) {
  const { store, persistence, notifications, onUnlock } = options;
  const secretEgg = document.querySelector("#hiddenSecretEgg");
  const charlie = createCharlieController({ notifications, onUnlock });
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
    destroy() {
      destroyed = true;
      unsubscribe();
      charlie.destroy();
      secretEgg?.removeEventListener("click", collect);
      if (secretEgg) secretEgg.hidden = true;
    }
  });
}
