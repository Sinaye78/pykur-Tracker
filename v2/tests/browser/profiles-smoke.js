import { FAMILIAR_CATALOG, resolveFamiliar } from "../../js/config/familiars.js";
import { createDefaultState } from "../../js/state/defaults.js";
import { createStateStore } from "../../js/state/store.js";
import { createProfilesController } from "../../js/ui/profiles.js";

const store = createStateStore(createDefaultState(), { resolveFamiliar });
createProfilesController({
  store,
  catalog: FAMILIAR_CATALOG,
  resolveFamiliar,
  idFactory: () => "p_smoke",
  persistence: { save: () => ({ ok: true }) }
});

queueMicrotask(() => {
  document.documentElement.dataset.profilesSmoke = document.querySelector("#appModal").hidden ? "fail" : "pass";
});
