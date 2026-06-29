import { APP_METADATA } from "./bootstrap.js";
import { FAMILIAR_CATALOG, GELUTIN_BOSS_GAINS, resolveFamiliar, resolveFamiliarRuntime } from "./config/familiars.js";
import { createDefaultState } from "./state/defaults.js";
import { createStateStore } from "./state/store.js";
import { createBackupStorage } from "./storage/backups.js";
import { createLocalStateStorage } from "./storage/local.js";
import { createProfilesController } from "./ui/profiles.js";
import { createDashboardController } from "./ui/dashboard.js";
import { createModalController } from "./ui/modal.js";
import { createProjectionController } from "./ui/projection.js";
import { createChronoController } from "./ui/chrono.js";
import { createHistoryController } from "./ui/history.js";
import { createStatsController } from "./ui/stats.js";
import { createOptionsController } from "./ui/options.js";
import { createShortcutsController } from "./ui/shortcuts.js";
import { createToastRenderer } from "./components/toast.js";
import { createNotificationService } from "./services/notifications.js";
import { createAuthService } from "./services/auth.js";
import { createAuthController } from "./ui/auth.js";
import { selectSettings } from "./state/selectors.js";
import { updateSetting } from "./domain/options.js";

const storageErrors = [];
const localState = createLocalStateStorage({
  migrateOptions: { resolveFamiliar },
  onError: (error) => storageErrors.push(error)
});
const loaded = localState.load();

export const appState = createStateStore(loaded.state || createDefaultState(), { resolveFamiliar });

export const notificationService = createNotificationService({
  renderer: createToastRenderer(),
  getSettings: () => selectSettings(appState.getState())
});

const backups = createBackupStorage({ migrateOptions: { resolveFamiliar } });
let migrationBackedUp = loaded.source !== "v1";
const persistence = {
  save(state) {
    if (!migrationBackedUp) {
      const backup = backups.create(state, "migration-v1");
      if (!backup.ok) return backup;
      migrationBackedUp = true;
    }
    return localState.save(state);
  }
};

export const modalController = createModalController();

export const authService = createAuthService();
export const authController = createAuthController({
  auth: authService,
  modal: modalController,
  notifications: notificationService
});
const hasAuthCallback = new URLSearchParams(globalThis.location.search).has("verifyToken")
  || new URLSearchParams(globalThis.location.search).has("resetToken");
const authCallback = authController.processUrlTokens();
authService.initialize();

export const historyController = createHistoryController({
  store: appState,
  persistence,
  modal: modalController,
  notifications: notificationService
});

export const statsController = createStatsController({
  store: appState,
  modal: modalController,
  resolveFamiliar,
  resolveRuntime: resolveFamiliarRuntime
});

export const profilesController = createProfilesController({
  store: appState,
  persistence,
  catalog: FAMILIAR_CATALOG,
  resolveFamiliar,
  modal: modalController,
  recordHistory: historyController.record,
  notifications: notificationService,
  autoOpenInitial: !hasAuthCallback
});

if (hasAuthCallback) {
  authCallback.then(() => {
    if (!appState.getState().active) profilesController.showCatalog(true);
  });
}

export const dashboardController = createDashboardController({
  store: appState,
  persistence,
  resolveFamiliar,
  resolveRuntime: resolveFamiliarRuntime,
  gelutinBossGains: GELUTIN_BOSS_GAINS,
  modal: modalController,
  recordHistory: historyController.record,
  notifications: notificationService
});

export const projectionController = createProjectionController({
  store: appState,
  modal: modalController,
  resolveFamiliar,
  resolveRuntime: resolveFamiliarRuntime,
  gelutinBossGains: GELUTIN_BOSS_GAINS
});

export const chronoController = createChronoController({
  store: appState,
  persistence,
  modal: modalController,
  resolveFamiliar,
  resolveRuntime: resolveFamiliarRuntime,
  gelutinBossGains: GELUTIN_BOSS_GAINS,
  subscribeRun: dashboardController.subscribeRun,
  recordHistory: historyController.record,
  notifications: notificationService
});

export const optionsController = createOptionsController({
  store: appState,
  persistence,
  modal: modalController,
  notifications: notificationService
});

export const shortcutsController = createShortcutsController({
  store: appState,
  persistence,
  notifications: notificationService,
  actions: {
    addRun: () => dashboardController.changeRun(1),
    removeRun: () => dashboardController.changeRun(-1),
    switchDungeon: dashboardController.switchDungeon,
    chronoToggle: chronoController.toggle,
    chronoReset: chronoController.reset,
    openHistory: historyController.open,
    openOptions: optionsController.open,
    openProjection: projectionController.openProjection,
    openMonsters: () => dashboardController.openMonsters("all"),
    toggleSound: optionsController.toggleSound,
    toggleNight: () => {
      const settings = selectSettings(appState.getState()) || {};
      const next = updateSetting(appState.getState(), "night", !settings.night);
      appState.replaceState(next);
      persistence.save(next);
    }
  }
});
optionsController.setShortcutEditor(shortcutsController);

for (const error of storageErrors) notificationService.error(error.userMessage || error.message);

export { APP_METADATA, storageErrors };
