const MINOR_TYPES = new Set(["info", "system", "blue", "pause", "undo", "gray", "profile"]);
const VALID_SIZES = new Set(["small", "normal", "large"]);

export function normalizeNotification(input) {
  if (typeof input === "string") return { message: input, type: "info" };
  return {
    ...input,
    message: String(input?.message || ""),
    type: String(input?.type || "info")
  };
}

export function resolveNotificationSettings(settings = {}) {
  return Object.freeze({
    enabled: settings.notifications !== false,
    hideMinor: Boolean(settings.disableMinorNotifications),
    persistent: Boolean(settings.notificationsPersistent),
    duration: Math.max(1000, Math.min(15000, Number(settings.notificationDuration) || 3200)),
    size: VALID_SIZES.has(settings.notificationSize) ? settings.notificationSize : "normal"
  });
}

export function shouldDisplayNotification(notification, settings) {
  if (!notification.message) return false;
  if (!settings.enabled) return false;
  if (settings.hideMinor && MINOR_TYPES.has(notification.type)) return false;
  return true;
}

export function createNotificationService(options = {}) {
  const { renderer, getSettings = () => ({}), onNotify } = options;
  if (!renderer?.show) throw new TypeError("Le service de notifications attend un renderer.");

  function notify(input) {
    const notification = normalizeNotification(input);
    const settings = resolveNotificationSettings(getSettings() || {});
    if (!shouldDisplayNotification(notification, settings)) return null;
    const rendered = renderer.show({
      ...notification,
      duration: notification.duration ?? settings.duration,
      persistent: notification.persistent ?? settings.persistent,
      size: notification.size || settings.size
    });
    onNotify?.(notification);
    return rendered;
  }

  return Object.freeze({
    notify,
    info(message, options = {}) { return notify({ ...options, message, type: "info" }); },
    success(message, options = {}) { return notify({ ...options, message, type: "success" }); },
    warning(message, options = {}) { return notify({ ...options, message, type: "warning" }); },
    error(message, options = {}) { return notify({ ...options, message, type: "error" }); },
    profile(message, options = {}) { return notify({ ...options, message, type: "profile" }); },
    clear: () => renderer.clear?.(),
    destroy: () => renderer.destroy?.()
  });
}
