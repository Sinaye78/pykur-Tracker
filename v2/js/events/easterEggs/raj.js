const ASSET_ROOT = "../familiers/pykur/assets/images";

const ASSETS = Object.freeze({
  raj: `${ASSET_ROOT}/raj/cra.png`,
  moderator: `${ASSET_ROOT}/raj/modo.png`,
  rajLabel: `${ASSET_ROOT}/raj/raj.png`,
  moderatorLabel: `${ASSET_ROOT}/raj/happios.png`,
  arrow: `${ASSET_ROOT}/raj/fleche.png`,
  redCard: `${ASSET_ROOT}/raj/carton-rouge.png`,
  ivory: `${ASSET_ROOT}/Aina-ivoir.png`,
  bike: `${ASSET_ROOT}/toom-nrg.png`,
  monsters: Object.freeze([
    { id: "bouftonBlanc", className: "boufton-blanc", image: `${ASSET_ROOT}/raj/monstre/boufton-blanc.png`, loot: `${ASSET_ROOT}/raj/loot/laine-blanc.png` },
    { id: "bouftonNoir", className: "boufton-noir", image: `${ASSET_ROOT}/raj/monstre/boufton-noir.png`, loot: `${ASSET_ROOT}/raj/loot/laine-noir.png` },
    { id: "bouftou", className: "bouftou", image: `${ASSET_ROOT}/raj/monstre/bouftou.png`, loot: `${ASSET_ROOT}/raj/loot/laine.png` },
    { id: "chefBouftou", className: "chef-bouftou", image: `${ASSET_ROOT}/raj/monstre/chef-de-guerre-bouftou.png`, loot: `${ASSET_ROOT}/raj/loot/laine-chef.png` }
  ])
});

function noop() {}

export function createRajController(options = {}) {
  const {
    documentRef = document,
    windowRef = globalThis.window || {},
    notifications,
    onUnlock,
    onHappiosHover,
    targets = [],
    random = Math.random,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    autoRun = true
  } = options;
  const layer = documentRef.querySelector("#rajEasterEggLayer");
  const timers = new Set();
  const elements = new Set();
  let active = false;
  let banned = false;
  let moderatorActive = false;
  let raj = null;
  let moderator = null;
  let rajPosition = { x: 80, y: 420 };
  let combats = 0;
  let combatsBeforeBan = 3;
  let destroyed = false;
  let rivalController = null;

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

  function clamp(x, y, margin = 72) {
    const view = viewport();
    return {
      x: Math.min(view.width - margin, Math.max(18, x)),
      y: Math.min(view.height - margin, Math.max(78, y))
    };
  }

  function randomPosition() {
    const view = viewport();
    return clamp(
      48 + random() * Math.max(120, view.width - 180),
      96 + random() * Math.max(120, view.height - 280)
    );
  }

  function createImage(className, source, alt = "") {
    const wrapper = documentRef.createElement("div");
    wrapper.className = className;
    const image = documentRef.createElement("img");
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

  function createUnit(kind, source, labelSource, position) {
    const unit = createImage(`raj-unit interactive raj-${kind}`, source, kind === "raj" ? "Raj-Pah" : "Happios");
    unit.style.setProperty("--raj-x", `${position.x}px`);
    unit.style.setProperty("--raj-y", `${position.y}px`);
    unit.querySelector("img")?.classList.add("raj-character");
    const label = documentRef.createElement("img");
    label.className = "raj-nameplate";
    label.src = labelSource;
    label.alt = "";
    unit.append(label);
    if (kind === "happios") unit.addEventListener("mouseenter", () => onHappiosHover?.());
    return unit;
  }

  async function moveUnit(unit, position, duration = 1600) {
    if (!active || !unit) return false;
    const next = clamp(position.x, position.y);
    unit.classList.add("moving");
    unit.style.setProperty("--raj-speed", `${duration}ms`);
    unit.style.setProperty("--raj-x", `${next.x}px`);
    unit.style.setProperty("--raj-y", `${next.y}px`);
    if (unit === raj) rajPosition = next;
    const completed = await wait(duration + 80);
    unit.classList.remove("moving");
    return Boolean(completed && active);
  }

  function elementCenter(element) {
    const rect = element?.getBoundingClientRect?.();
    if (!rect || rect.width < 4 || rect.height < 4) return null;
    return clamp(rect.left + rect.width / 2, rect.top + rect.height / 2, 64);
  }

  function availableTargets() {
    return targets.flatMap((target) => {
      if (!target?.controller?.isEnabled?.()) return [];
      const element = target.controller.getElement?.();
      const position = elementCenter(element);
      return position ? [{ ...target, element, position }] : [];
    });
  }

  function attachTrophy(source, className) {
    if (!raj || raj.querySelector?.(`.${className}`)) return;
    const image = documentRef.createElement("img");
    image.className = `raj-trophy ${className}`;
    image.src = source;
    image.alt = "";
    raj.append(image);
  }

  function mountBike() {
    if (!raj || raj.classList.contains("mounted")) return;
    const image = documentRef.createElement("img");
    image.className = "raj-mount-bike";
    image.src = ASSETS.bike;
    image.alt = "";
    raj.prepend(image);
    raj.classList.add("mounted");
  }

  function claimTarget(target) {
    target?.controller?.deactivate?.();
    if (target?.id === "aina") {
      attachTrophy(ASSETS.ivory, "raj-dofus-trophy");
      notify("Raj-Pah récupère le Dofus Ivoire d'Aina.", "aina");
    } else if (target?.id === "toom") {
      mountBike();
      notify("Raj-Pah récupère la NRG 500 de Toom et continue son farm.", "toom");
    } else if (target?.id === "charlie") {
      notify("Raj-Pah tire sur Charlie. Le curseur redevient normal.", "warning");
    } else if (target?.id === "alhass") {
      notify("Raj-Pah neutralise Alhass avant l'inspection.", "warning");
    } else if (target?.id === "capy") {
      notify("Raj-Pah chasse Capy du tracker.", "warning");
    }
    target?.onClaim?.();
  }

  function claimAvailableTarget(id) {
    const target = availableTargets().find((candidate) => candidate.id === id);
    if (!active || !target) return false;
    claimTarget(target);
    return true;
  }

  async function shoot(position, targetElement = null) {
    const from = { x: rajPosition.x + 58, y: rajPosition.y + 42 };
    const to = { x: position.x + 30, y: position.y + 28 };
    const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
    const arrow = createImage("raj-arrow", ASSETS.arrow, "");
    arrow.style.setProperty("--raj-x", `${from.x}px`);
    arrow.style.setProperty("--raj-y", `${from.y}px`);
    arrow.style.setProperty("--raj-angle", `${angle}deg`);
    await wait(40);
    arrow.style.setProperty("--raj-x", `${to.x}px`);
    arrow.style.setProperty("--raj-y", `${to.y}px`);
    await wait(560);
    removeElement(arrow);
    if (!active) return false;
    targetElement?.classList?.add("raj-hit");
    await wait(420);
    targetElement?.classList?.remove("raj-hit");
    return active;
  }

  async function attackAvailableTarget(preferredId) {
    const candidates = availableTargets();
    const target = candidates.find((candidate) => candidate.id === preferredId)
      || candidates[Math.floor(random() * candidates.length)];
    if (!target || !active || banned) return false;
    notify(`Raj-Pah repère ${target.label}.`, "warning");
    if (!await moveUnit(raj, { x: target.position.x - 82, y: target.position.y - 46 }, 1000)) return false;
    if (!await shoot(target.position, target.element)) return false;
    target.element.classList.add("raj-egg-victim");
    await wait(460);
    target.element.classList.remove("raj-egg-victim");
    claimTarget(target);
    await wait(520);
    return active;
  }

  function spawnGroup() {
    const count = 1 + Math.floor(random() * 3);
    const base = randomPosition();
    return Array.from({ length: count }, (_, index) => {
      const monster = ASSETS.monsters[Math.floor(random() * ASSETS.monsters.length)];
      const position = clamp(base.x + index * 58, base.y + (index % 2) * 34, 70);
      const element = createImage(`raj-monster ${monster.className}`, monster.image, monster.id);
      element.style.setProperty("--raj-x", `${position.x}px`);
      element.style.setProperty("--raj-y", `${position.y}px`);
      return { element, monster, position };
    });
  }

  async function fightGroup(group) {
    notify("Raj-Pah engage un groupe de Bouftous.", "warning");
    for (const target of group) {
      if (!active || banned) return false;
      if (!await moveUnit(raj, { x: target.position.x - 72, y: target.position.y - 28 }, 1100)) return false;
      if (target.monster.id === "chefBouftou" || random() < 0.45) {
        target.element.classList.add("attacking");
        raj.classList.add("under-attack");
        await wait(420);
        target.element.classList.remove("attacking");
        raj.classList.remove("under-attack");
      }
      if (!await shoot(target.position, target.element)) return false;
      target.element.classList.add("dead");
      await wait(260);
      removeElement(target.element);
      const loot = createImage("raj-loot", target.monster.loot, "");
      loot.style.setProperty("--raj-x", `${target.position.x + 12}px`);
      loot.style.setProperty("--raj-y", `${target.position.y + 28}px`);
      loot.classList.add("show");
      await wait(360);
      loot.classList.add("picked");
      await wait(220);
      removeElement(loot);
    }
    combats += 1;
    return active;
  }

  async function moderateNow() {
    if (!active || moderatorActive) return false;
    moderatorActive = true;
    notify("Happios effectue une ronde anti-bot.", "warning");
    const view = viewport();
    moderator = createUnit("happios", ASSETS.moderator, ASSETS.moderatorLabel, clamp(view.width - 92, 110, 80));
    if (!await moveUnit(moderator, clamp(rajPosition.x + 88, rajPosition.y - 12), 1200)) return false;
    banned = true;
    onUnlock?.("secret_raj_ban");
    const card = createImage("raj-card", ASSETS.redCard, "Carton rouge");
    card.style.setProperty("--raj-x", `${rajPosition.x + 64}px`);
    card.style.setProperty("--raj-y", `${rajPosition.y - 62}px`);
    card.classList.add("show");
    await wait(650);
    raj?.classList.add("banned");
    notify("Le compte Raj-Pah a été banni définitivement pour botting.", "error");
    await wait(2600);
    notify("Happios a terminé sa ronde.", "info");
    await wait(1200);
    stop({ silent: true });
    return true;
  }

  async function mainLoop() {
    while (active && !banned) {
      if (!await moveUnit(raj, randomPosition(), 1300 + random() * 850)) break;
      await wait(360 + random() * 520);
      if (!active || banned) break;
      const candidates = availableTargets();
      if (candidates.length && random() < 0.72) {
        if (!await attackAvailableTarget()) break;
        continue;
      }
      const group = spawnGroup();
      const completed = await fightGroup(group);
      group.forEach(({ element }) => removeElement(element));
      if (!completed) break;
      if (combats >= combatsBeforeBan) await moderateNow();
    }
  }

  function canStart() {
    return !windowRef.matchMedia?.("(max-width: 760px), (pointer: coarse)")?.matches;
  }

  function start() {
    if (!layer || destroyed || active) return false;
    if (!canStart()) {
      notifications?.info?.("Raj-Pah préfère farmer sur desktop.");
      return false;
    }
    if (rivalController?.isEnabled?.()) {
      rivalController.requestRajInterrupt?.();
      return false;
    }
    active = true;
    banned = false;
    moderatorActive = false;
    combats = 0;
    combatsBeforeBan = 2 + Math.floor(random() * 3);
    layer.classList.add("is-active");
    layer.setAttribute("aria-hidden", "false");
    rajPosition = clamp(80, viewport().height - 190);
    raj = createUnit("raj", ASSETS.raj, ASSETS.rajLabel, rajPosition);
    onUnlock?.("egg_raj");
    notify("Raj-Pah s'est connecté.", "success");
    if (autoRun) {
      mainLoop().catch(noop);
      schedule(() => moderateNow().catch(noop), 45000 + random() * 24000);
    }
    return true;
  }

  function stop(options = {}) {
    if (!active && !elements.size) return false;
    active = false;
    clearTimers();
    for (const element of [...elements]) removeElement(element);
    raj = null;
    moderator = null;
    layer?.classList.remove("is-active");
    layer?.setAttribute("aria-hidden", "true");
    layer?.replaceChildren?.();
    if (!options.silent) notifications?.warning?.("Raj-Pah s'est déconnecté.");
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
    attackAvailableTarget,
    claimAvailableTarget,
    moderateNow,
    getElement: () => raj,
    getPosition: () => ({ ...rajPosition }),
    setRivalController(controller) { rivalController = controller || null; },
    isEnabled: () => active,
    isBanned: () => banned,
    destroy() {
      stop({ silent: true });
      destroyed = true;
    }
  });
}
