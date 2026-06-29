export const DEFAULT_PYKUR_STATE_DEFINITION = Object.freeze({
  id: "pykur",
  dungeons: Object.freeze([
    Object.freeze({ key: "morose", defaultAverage: 125 }),
    Object.freeze({ key: "tynril", defaultAverage: 600 })
  ]),
  specialDefaults: Object.freeze({})
});

export function cloneValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function farmAverageKey(farmKey) {
  if (farmKey === "morose") return "avgMorose";
  if (farmKey === "tynril") return "avgTynril";
  const suffix = String(farmKey || "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/(^|\s)([a-zA-Z0-9])/g, (_, space, letter) => letter.toUpperCase());
  return `avg${suffix}`;
}

export function createDefaultKeybinds() {
  return {
    addRun: "+",
    removeRun: "-",
    switchDungeon: "Tab",
    chronoToggle: "S",
    chronoReset: "R",
    openHistory: "H",
    openOptions: "O",
    openProjection: "P",
    openMonsters: "B",
    openGallery: "",
    toggleSound: "Ctrl+M",
    toggleNight: "Ctrl+D",
    toggleDofusDetection: "",
    openHelp: "F1"
  };
}

export function createDefaultSettings() {
  return {
    night: false,
    animations: true,
    tooltips: true,
    notifications: true,
    sound: true,
    soundVolume: 100,
    autoMarkOnPlus: false,
    chronoAutoStartOnRun: false,
    hudMode: false,
    visualIntensity: "standard",
    uiOpacity: "medium",
    dashboardMode: "tryhard",
    performanceMode: "auto",
    chronoStyle: "technical",
    showMilliseconds: false,
    autoDungeonEstimate: false,
    notificationSize: "normal",
    notificationDuration: 3200,
    notificationsPersistent: false,
    disableMinorNotifications: false,
    highContrast: false,
    reducedSaturation: false,
    largeFont: false,
    shortcutsEnabled: true,
    livingEvents: true,
    passiveAmbience: true,
    helpAutoDisabled: false,
    adminAutoCloseAfterAction: false,
    adminQuickReopenSeconds: 45,
    keybinds: createDefaultKeybinds()
  };
}

export function createDefaultAchievements() {
  return {
    unlocked: {},
    removedUnlocked: {},
    secretCategoriesUnlocked: false,
    eggCollected: false,
    counters: { happiosHover: 0 }
  };
}

export function createDefaultGallery() {
  return {
    completedPykurs: [],
    eventsDiscovered: {},
    removedPykurs: {},
    removedEvents: {},
    currentCycleArchived: false,
    currentCycleCompletionSeen: false
  };
}

export function createDefaultProfileData(familiarDefinition = DEFAULT_PYKUR_STATE_DEFINITION, options = {}) {
  const definition = familiarDefinition || DEFAULT_PYKUR_STATE_DEFINITION;
  const dungeons = Array.isArray(definition.dungeons) && definition.dungeons.length
    ? definition.dungeons
    : DEFAULT_PYKUR_STATE_DEFINITION.dungeons;
  const farmKeys = dungeons.map((dungeon) => dungeon.key).filter(Boolean);
  const firstFarm = farmKeys[0] || "morose";
  const now = options.now || new Date().toISOString();
  const runs = Object.fromEntries(farmKeys.map((key) => [key, 0]));
  const mobs = { zone: {}, ...Object.fromEntries(farmKeys.map((key) => [key, {}])) };
  const averages = Object.fromEntries(dungeons.map((dungeon) => [farmAverageKey(dungeon.key), dungeon.defaultAverage || 120]));
  const refs = Object.fromEntries(farmKeys.map((key) => [key, { imageKey: null, zone: null, threshold: 82 }]));

  return {
    familiarId: definition.id || "pykur",
    runs,
    mobs,
    settings: createDefaultSettings(),
    stats: { ...averages, milestones: {}, days: {} },
    chrono: { seconds: 0, running: false, startedAt: null, lastMarkSeconds: 0, marks: [] },
    session: {
      active: false,
      startedAt: null,
      sessionStartedAt: null,
      totalSeconds: 0,
      runs: cloneValue(runs),
      ppStart: 0,
      ppGain: 0,
      lastSummary: null
    },
    ui: {
      farm: firstFarm,
      tab: firstFarm,
      monsterSort: "total",
      monsterView: "comfortable",
      monsterSearch: "",
      monsterFavs: [],
      activityDensity: "compact",
      collapsedActivityDays: [],
      capyMode: false,
      helpSeen: false
    },
    hud: { windows: {}, z: 10050 },
    achievements: createDefaultAchievements(),
    gallery: createDefaultGallery(),
    dofusDetection: {
      enabled: false,
      cooldownSeconds: Math.max(1, Number(definition.dofusCooldownMin) || 10),
      scanIntervalMs: 1000,
      status: "Inactif",
      refs
    },
    special: cloneValue(definition.specialDefaults || {}),
    createdAt: now,
    activity: [],
    undo: []
  };
}

export function createDefaultState(options = {}) {
  const now = options.now || new Date().toISOString();
  return {
    schemaVersion: 1,
    active: null,
    needsFamiliarChoice: true,
    galleryShared: true,
    sharedGallery: createDefaultGallery(),
    optionsShared: false,
    sharedSettings: createDefaultSettings(),
    achievementsShared: true,
    achievementAccountMode: 1,
    sharedAchievements: createDefaultAchievements(),
    deletedProfiles: {},
    profiles: {},
    createdAt: now,
    updatedAt: now,
    lastSavedAt: null
  };
}
