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
import { createCloudSyncService } from "./services/cloudSync.js";
import { createAudioService } from "./services/audio.js";
import { createAuthController } from "./ui/auth.js";
import { createAchievementsController } from "./ui/achievements.js";
import { createGalleryController } from "./ui/gallery.js";
import { selectSettings } from "./state/selectors.js";
import { updateSetting } from "./domain/options.js";
import { createEasterEggController } from "./events/easterEggs.js";

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
let cloudSyncService = null;
let achievementsController = null;
let galleryController = null;
const persistence = {
  save(state) {
    if (!migrationBackedUp) {
      const backup = backups.create(state, "migration-v1");
      if (!backup.ok) return backup;
      migrationBackedUp = true;
    }
    const result = localState.save(state);
    if (result.ok) cloudSyncService?.schedule(state);
    return result;
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
  autoOpenInitial: !hasAuthCallback,
  onProfileCreated: () => achievementsController?.evaluate({ allowRemoved: true })
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
  notifications: notificationService,
  onManualAdjustment: () => {
    achievementsController?.unlock("manual_adjustments");
    achievementsController?.evaluate({ allowRemoved: true });
  }
});

export const projectionController = createProjectionController({
  store: appState,
  modal: modalController,
  resolveFamiliar,
  resolveRuntime: resolveFamiliarRuntime,
  gelutinBossGains: GELUTIN_BOSS_GAINS,
  onViewChange: (view) => { if (view === "simulator") achievementsController?.unlock("use_projection_simulator"); }
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
    openHistory: () => { achievementsController?.unlock("open_history"); historyController.open(); },
    openOptions: () => { achievementsController?.unlock("open_options"); optionsController.open(); },
    openProjection: () => {
      achievementsController?.unlock("open_projection");
      achievementsController?.unlock("view_time_estimate");
      projectionController.openProjection();
    },
    openMonsters: () => {
      achievementsController?.unlock("open_monsters");
      achievementsController?.unlock("open_monster_threshold");
      dashboardController.openMonsters("all");
    },
    openGallery: () => galleryController?.open(),
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

export const audioService = createAudioService({ store: appState });
achievementsController = createAchievementsController({
  store: appState,
  persistence,
  modal: modalController,
  notifications: notificationService,
  audio: audioService,
  resolveFamiliar,
  resolveRuntime: resolveFamiliarRuntime
});
dashboardController.subscribeRun(() => achievementsController.evaluate({ allowRemoved: true }));

export const easterEggController = createEasterEggController({
  store: appState,
  persistence,
  notifications: notificationService
});

galleryController = createGalleryController({
  store: appState,
  persistence,
  modal: modalController,
  notifications: notificationService,
  resolveFamiliar,
  resolveRuntime: resolveFamiliarRuntime,
  subscribeRun: dashboardController.subscribeRun,
  onOpen: () => achievementsController?.unlock("open_gallery"),
  onSectionViewed: (section) => {
    if (section === "archives") achievementsController?.unlock("view_archive");
    if (section === "events") achievementsController?.unlock("view_event_collection");
  },
  onArchive: () => {
    achievementsController?.unlock("restart_after_completion");
    achievementsController?.evaluate({ allowRemoved: true });
  }
});

document.querySelector("#projectionOpen")?.addEventListener("click", () => {
  achievementsController.unlock("open_projection");
  achievementsController.unlock("view_time_estimate");
});
document.querySelector("#monsterLauncher")?.addEventListener("click", () => {
  achievementsController.unlock("open_monsters");
  achievementsController.unlock("open_monster_threshold");
});
document.querySelector("#historyOpen")?.addEventListener("click", () => achievementsController.unlock("open_history"));
document.querySelector("#optionsOpen")?.addEventListener("click", () => achievementsController.unlock("open_options"));

let cloudErrorActive = false;
cloudSyncService = createCloudSyncService({
  auth: authService,
  store: appState,
  localStorage: globalThis.localStorage,
  migrateOptions: { resolveFamiliar },
  saveLocal: (state) => localState.save(state),
  createBackup: (state, reason) => backups.create(state, reason),
  createEmptyState: () => createDefaultState(),
  onRemoteApplying: () => achievementsController?.silenceNextEvaluation(),
  onRemoteApplied: () => profilesController.render(),
  onStatus: ({ value, error, remoteApplied }) => {
    if (value === "error" && !cloudErrorActive) {
      cloudErrorActive = true;
      notificationService.error(error?.message || "La sauvegarde cloud est momentanément indisponible.");
    } else if (value === "synced") {
      if (cloudErrorActive) notificationService.success("Synchronisation cloud rétablie.");
      else if (remoteApplied) notificationService.success("Progression cloud chargée.");
      cloudErrorActive = false;
    }
  }
});

let cloudUserId = null;
authService.subscribe((state) => {
  const nextUserId = state.user?.id || null;
  if (nextUserId && String(nextUserId) !== String(cloudUserId)) {
    cloudUserId = nextUserId;
    cloudSyncService.start(state.user)
      .then(() => achievementsController?.unlock("create_account"))
      .catch(() => {});
  } else if (!nextUserId && cloudUserId) {
    cloudUserId = null;
    cloudSyncService.stop();
  }
});
authService.initialize();

for (const error of storageErrors) notificationService.error(error.userMessage || error.message);

export { APP_METADATA, storageErrors, cloudSyncService, achievementsController, galleryController };
