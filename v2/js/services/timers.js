export function createTicker(callback, options = {}) {
  if (typeof callback !== "function") throw new TypeError("Le ticker attend une fonction.");
  const intervalMs = Math.max(50, Number(options.intervalMs) || 250);
  let timer = null;

  function start() {
    if (timer !== null) return;
    timer = setInterval(callback, intervalMs);
  }

  function stop() {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  }

  return Object.freeze({ start, stop, destroy: stop, isRunning: () => timer !== null });
}
