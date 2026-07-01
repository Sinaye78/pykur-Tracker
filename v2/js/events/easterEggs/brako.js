const ASSET_ROOT = "../familiers/pykur/assets/images";

const ASSETS = Object.freeze({
  brako: `${ASSET_ROOT}/brako/brako.png`,
  minotot: `${ASSET_ROOT}/brako/minotot.png`,
  nametag: `${ASSET_ROOT}/brako/nametag.png`,
  bow: `${ASSET_ROOT}/brako/arc.png`,
  arrow: `${ASSET_ROOT}/raj/fleche.png`,
  explosion: `${ASSET_ROOT}/brako/explo.png`,
  wand: `${ASSET_ROOT}/brako/baguette.png`,
  crimson: `${ASSET_ROOT}/brako/pourpre.png`,
  raj: `${ASSET_ROOT}/raj/cra.png`
});

const DIALOGUES = Object.freeze([
  "Jouez vite svp...",
  "T'es un vrai noob, ça fait combien de temps que tu joues au jeu ?",
  "Les gars focus svp wsh",
  "Maaaaais debuffffffff",
  "Go chall, celui qui rate paye sa capt"
]);

function noop() {}

export function createBrakoController(options = {}) {
  const {
    documentRef = document,
    windowRef = globalThis.window || {},
    notifications,
    onUnlock,
    rajController,
    random = Math.random,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    autoRun = true
  } = options;
  const layer = documentRef.querySelector("#brakoEasterEggLayer");
  const timers = new Set();
  const elements = new Set();
  let active = false;
  let phase = "idle";
  let brako = null;
  let minotot = null;
  let brakoPosition = { x: 100, y: 360 };
  let minototPosition = { x: 900, y: 340 };
  let rajPosition = { x: 360, y: 360 };
  let interruptRequested = false;
  let interrupting = false;
  let interruptDone = false;
  let pendingRajInterrupt = false;
  let dialogueShown = false;
  let destroyed = false;

  function notify(message, type = "info") {
    notifications?.notify?.({ message, type });
  }

  function schedule(callback, delay) {
    const timer = { id: null, resolve: null };
    timer.id = setTimer(() => {
      timers.delete(timer);
      callback?.();
      timer.resolve?.(true);
    }, delay);
    timers.add(timer);
    return timer;
  }

  function wait(delay) {
    return new Promise((resolve) => {
      const timer = schedule(null, delay);
      timer.resolve = resolve;
    });
  }

  function clearTimers() {
    for (const timer of timers) {
      clearTimer(timer.id);
      timer.resolve?.(false);
    }
    timers.clear();
  }

  function viewport() {
    return {
      width: Math.max(320, Number(windowRef.innerWidth) || 1280),
      height: Math.max(280, Number(windowRef.innerHeight) || 720)
    };
  }

  function clamp(x, y, margin = 110) {
    const view = viewport();
    return {
      x: Math.min(view.width - margin, Math.max(24, x)),
      y: Math.min(view.height - margin, Math.max(86, y))
    };
  }

  function createImage(className, source, alt = "") {
    const wrapper = documentRef.createElement("div");
    wrapper.className = className;
    const image = documentRef.createElement("img");
    image.className = "brako-body";
    image.src = source;
    image.alt = alt;
    wrapper.append(image);
    layer?.append(wrapper);
    elements.add(wrapper);
    return wrapper;
  }

  function removeElement(element) {
    element?.remove?.();
    elements.delete(element);
  }

  function createUnit(kind, source, position, settings = {}) {
    const unit = createImage(`brako-unit brako-${kind}${settings.interactive ? " interactive" : ""}`, source, kind);
    setPosition(unit, position);
    if (settings.nametag) {
      const label = documentRef.createElement("img");
      label.className = "brako-nametag";
      label.src = ASSETS.nametag;
      label.alt = "";
      unit.append(label);
    }
    return unit;
  }

  function setPosition(unit, position) {
    unit?.style.setProperty("--brako-x", `${position.x}px`);
    unit?.style.setProperty("--brako-y", `${position.y}px`);
  }

  function faceTarget(unit, from, to) {
    unit?.style.setProperty("--brako-face", to.x < from.x ? "-1" : "1");
  }

  async function moveUnit(unit, stateKey, position, duration = 1200) {
    if (!active || !unit) return false;
    const next = clamp(position.x, position.y);
    unit.classList.add("moving");
    unit.style.setProperty("--brako-speed", `${duration}ms`);
    setPosition(unit, next);
    if (stateKey === "brako") brakoPosition = next;
    else if (stateKey === "minotot") minototPosition = next;
    else rajPosition = next;
    const other = stateKey === "brako" ? minototPosition : brakoPosition;
    faceTarget(unit, next, other);
    const completed = await wait(duration + 80);
    unit.classList.remove("moving");
    return Boolean(completed && active);
  }

  function angle(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
  }

  function showDialogue() {
    if (!active || !brako || dialogueShown) return false;
    dialogueShown = true;
    const bubble = documentRef.createElement("div");
    bubble.className = "brako-dialogue";
    const text = documentRef.createElement("span");
    text.textContent = DIALOGUES[Math.floor(random() * DIALOGUES.length)];
    bubble.append(text);
    brako.append(bubble);
    schedule(() => bubble.classList.add("show"), 40);
    schedule(() => {
      bubble.classList.remove("show");
      schedule(() => bubble.remove(), 220);
    }, 2800 + random() * 900);
    return true;
  }

  async function showWeapon(source, from, to, duration = 320) {
    if (!active) return false;
    const weapon = createImage("brako-weapon", source, "");
    weapon.style.setProperty("--brako-x", `${from.x}px`);
    weapon.style.setProperty("--brako-y", `${from.y}px`);
    weapon.style.setProperty("--brako-angle", `${angle(from, to)}deg`);
    await wait(30);
    weapon.classList.add("show");
    await wait(duration);
    removeElement(weapon);
    return active;
  }

  async function shootArrow(settings = {}) {
    if (!active) return false;
    faceTarget(brako, brakoPosition, minototPosition);
    await showWeapon(ASSETS.bow, { x: brakoPosition.x + 44, y: brakoPosition.y + 38 }, minototPosition, 180);
    const from = { x: brakoPosition.x + 64, y: brakoPosition.y + 48 };
    const to = { x: minototPosition.x + 78, y: minototPosition.y + 72 };
    const arrow = createImage("brako-arrow", ASSETS.arrow, "");
    arrow.style.setProperty("--brako-x", `${from.x}px`);
    arrow.style.setProperty("--brako-y", `${from.y}px`);
    arrow.style.setProperty("--brako-angle", `${angle(from, to)}deg`);
    await wait(40);
    arrow.style.setProperty("--brako-x", `${to.x}px`);
    arrow.style.setProperty("--brako-y", `${to.y}px`);
    await wait(520);
    removeElement(arrow);
    if (settings.explosive) {
      const impact = createImage("brako-impact", ASSETS.explosion, "");
      impact.style.setProperty("--brako-x", `${to.x - 40}px`);
      impact.style.setProperty("--brako-y", `${to.y - 40}px`);
      impact.classList.add("show");
      await wait(1480);
      removeElement(impact);
    }
    minotot?.classList.add("hit");
    if (settings.push) {
      const direction = minototPosition.x < brakoPosition.x ? -1 : 1;
      minototPosition = clamp(minototPosition.x + direction * settings.push, minototPosition.y, 180);
      setPosition(minotot, minototPosition);
    }
    await wait(420);
    minotot?.classList.remove("hit");
    return active;
  }

  async function wandCombo() {
    notify("Brako passe au corps à corps.", "warning");
    if (!await moveUnit(brako, "brako", { x: minototPosition.x - 70, y: minototPosition.y + 34 }, 900)) return false;
    for (let index = 0; index < 4 && active; index += 1) {
      await showWeapon(ASSETS.wand, { x: brakoPosition.x + 52, y: brakoPosition.y + 40 }, { x: minototPosition.x + 70, y: minototPosition.y + 72 }, 180);
      minotot?.classList.add("hit");
      await wait(160);
      minotot?.classList.remove("hit");
    }
    return active;
  }

  function requestRajInterrupt() {
    if (!active || interruptDone || interrupting) {
      notifications?.warning?.("Raj-Pah garde ses distances avec Brako.");
      return false;
    }
    interruptRequested = true;
    notify("Raj-Pah tente d'interrompre Brako.", "warning");
    return true;
  }

  async function handleRajInterrupt() {
    if (!active || interrupting || interruptDone) return false;
    interrupting = true;
    phase = "raj-interrupt";
    onUnlock?.("secret_egg_war");
    const start = rajController?.isEnabled?.()
      ? rajController.getPosition?.()
      : clamp(brakoPosition.x + 260, brakoPosition.y + 28, 90);
    rajController?.deactivate?.();
    const temporaryRaj = createImage("brako-unit brako-raj-intruder", ASSETS.raj, "Raj-Pah");
    rajPosition = clamp(start?.x || brakoPosition.x + 260, start?.y || brakoPosition.y + 28, 90);
    setPosition(temporaryRaj, rajPosition);
    await wait(180);
    notify("Brako interrompt Raj-Pah à coups de baguette.", "warning");
    if (!await moveUnit(temporaryRaj, "raj", { x: brakoPosition.x + 128, y: brakoPosition.y + 14 }, 760)) return false;
    for (let index = 0; index < 3 && active; index += 1) {
      await showWeapon(ASSETS.wand, { x: brakoPosition.x + 50, y: brakoPosition.y + 44 }, { x: rajPosition.x + 38, y: rajPosition.y + 46 }, 150);
      temporaryRaj.classList.add("hit");
      await wait(120);
      temporaryRaj.classList.remove("hit");
    }
    temporaryRaj.classList.add("defeated");
    await wait(380);
    removeElement(temporaryRaj);
    notify("Raj-Pah a fui le combat.", "info");
    interrupting = false;
    interruptRequested = false;
    interruptDone = true;
    phase = "distance";
    await wait(420);
    return active;
  }

  async function waitForInterrupt() {
    if (!active || !interruptRequested || interrupting || interruptDone) return active;
    return handleRajInterrupt();
  }

  async function rollLoot() {
    const dropped = random() < 0.2;
    if (!dropped) {
      onUnlock?.("secret_brako_no_drop");
      notify("Eh… pas d'œuf.", "info");
      return false;
    }
    onUnlock?.("secret_brako_drop");
    notify("Incroyable ! Le Minotot a lâché un Dofus Pourpre !", "rare");
    const position = clamp(minototPosition.x + 58, minototPosition.y + 90, 70);
    const loot = createImage("brako-loot", ASSETS.crimson, "Dofus Pourpre");
    loot.style.setProperty("--brako-x", `${position.x}px`);
    loot.style.setProperty("--brako-y", `${position.y}px`);
    await wait(80);
    loot.classList.add("show");
    await wait(650);
    await moveUnit(brako, "brako", { x: position.x - 42, y: position.y - 72 }, 900);
    loot.classList.add("picked");
    await wait(280);
    removeElement(loot);
    return true;
  }

  async function fight() {
    phase = "spawn";
    const view = viewport();
    brakoPosition = clamp(96, 134, 120);
    minototPosition = clamp(view.width - 270, 104, 210);
    brako = createUnit("hero", ASSETS.brako, brakoPosition, { interactive: true, nametag: true });
    minotot = createUnit("minotot", ASSETS.minotot, minototPosition);
    faceTarget(brako, brakoPosition, minototPosition);
    faceTarget(minotot, minototPosition, brakoPosition);
    notify("Brako entre en combat contre le Minotot.", "rare");
    await wait(900);
    showDialogue();
    if (pendingRajInterrupt || rajController?.isEnabled?.()) interruptRequested = true;
    if (!await waitForInterrupt()) return false;
    phase = "distance";
    for (let index = 0; index < 3 && active; index += 1) {
      if (!await waitForInterrupt()) return false;
      await moveUnit(minotot, "minotot", { x: minototPosition.x - 56, y: minototPosition.y }, 1050);
      await moveUnit(brako, "brako", { x: Math.max(36, brakoPosition.x - 22), y: brakoPosition.y + (index % 2 ? 12 : -10) }, 760);
      if (!await shootArrow({ push: index === 2 ? 34 : 0 })) return false;
    }
    phase = "explosive";
    notify("Flèche explosive !", "warning");
    if (!await shootArrow({ explosive: true, push: 82 })) return false;
    await wait(500);
    phase = "finish";
    await moveUnit(minotot, "minotot", { x: brakoPosition.x + 118, y: brakoPosition.y - 30 }, 1200);
    if (!await wandCombo()) return false;
    phase = "death";
    minotot?.classList.add("dead");
    await wait(720);
    removeElement(minotot);
    minotot = null;
    phase = "loot";
    await rollLoot();
    phase = "done";
    await wait(2200);
    stop({ silent: true });
    return true;
  }

  function canStart() {
    return !windowRef.matchMedia?.("(max-width: 760px), (pointer: coarse)")?.matches;
  }

  function start() {
    if (!layer || destroyed || active) return false;
    if (!canStart()) {
      notifications?.info?.("Brako préfère combattre le Minotot sur PC.");
      return false;
    }
    pendingRajInterrupt = Boolean(rajController?.isEnabled?.());
    active = true;
    phase = "starting";
    interruptRequested = false;
    interrupting = false;
    interruptDone = false;
    dialogueShown = false;
    layer.classList.add("is-active");
    layer.setAttribute("aria-hidden", "false");
    onUnlock?.("egg_brako");
    if (autoRun) fight().catch(noop);
    return true;
  }

  function stop(settings = {}) {
    if (!active && !elements.size) return false;
    active = false;
    phase = "idle";
    clearTimers();
    for (const element of [...elements]) removeElement(element);
    brako = null;
    minotot = null;
    layer?.classList.remove("is-active");
    layer?.setAttribute("aria-hidden", "true");
    layer?.replaceChildren?.();
    if (!settings.silent) notifications?.warning?.("Brako quitte le combat.");
    return true;
  }

  function toggle() {
    return active ? !stop() : start();
  }

  return Object.freeze({
    toggle,
    start,
    stop,
    deactivate: () => stop({ silent: true }),
    requestRajInterrupt,
    handleRajInterrupt,
    rollLoot,
    fight,
    isEnabled: () => active,
    getPhase: () => phase,
    getElement: () => brako,
    destroy() {
      stop({ silent: true });
      destroyed = true;
    }
  });
}
