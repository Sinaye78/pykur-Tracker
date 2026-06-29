import assert from "node:assert/strict";
import test from "node:test";

import {
  createNotificationService,
  normalizeNotification,
  resolveNotificationSettings,
  shouldDisplayNotification
} from "../../js/services/notifications.js";

test("une notification textuelle est normalisée en information", () => {
  assert.deepEqual(normalizeNotification("Profil enregistré."), { message: "Profil enregistré.", type: "info" });
});

test("les réglages de notification sont bornés et validés", () => {
  const settings = resolveNotificationSettings({ notificationDuration: 99999, notificationSize: "géante" });
  assert.equal(settings.duration, 15000);
  assert.equal(settings.size, "normal");
});

test("les notifications mineures respectent les options", () => {
  const settings = resolveNotificationSettings({ notifications: true, disableMinorNotifications: true });
  assert.equal(shouldDisplayNotification({ message: "Info", type: "info" }, settings), false);
  assert.equal(shouldDisplayNotification({ message: "Erreur", type: "error" }, settings), true);
});

test("la coupure globale masque toutes les notifications visuelles", () => {
  const settings = resolveNotificationSettings({ notifications: false });
  assert.equal(shouldDisplayNotification({ message: "Action", type: "success" }, settings), false);
  assert.equal(shouldDisplayNotification({ message: "Échec", type: "error" }, settings), false);
});

test("le service transmet durée, taille et persistance au renderer", () => {
  const rendered = [];
  const service = createNotificationService({
    renderer: { show: (value) => { rendered.push(value); return value; } },
    getSettings: () => ({ notificationDuration: 5200, notificationSize: "large", notificationsPersistent: true })
  });
  service.success("Sauvegardé");
  assert.equal(rendered.length, 1);
  assert.equal(rendered[0].duration, 5200);
  assert.equal(rendered[0].size, "large");
  assert.equal(rendered[0].persistent, true);
});
