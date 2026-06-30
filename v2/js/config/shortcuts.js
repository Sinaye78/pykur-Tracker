export const SHORTCUT_ACTIONS = Object.freeze([
  { id: "addRun", label: "Ajouter un run", description: "Ajoute un donjon au profil actif." },
  { id: "removeRun", label: "Retirer un run", description: "Retire le dernier donjon actif." },
  { id: "switchDungeon", label: "Changer de donjon", description: "Sélectionne le donjon suivant." },
  { id: "chronoToggle", label: "Démarrer ou mettre en pause", description: "Pilote Session & Chrono." },
  { id: "chronoReset", label: "Réinitialiser le chrono", description: "Remet Session & Chrono à zéro." },
  { id: "openHistory", label: "Ouvrir l'historique", description: "Affiche la timeline du profil." },
  { id: "openOptions", label: "Ouvrir les options", description: "Ouvre le centre de réglages." },
  { id: "openProjection", label: "Ouvrir la projection", description: "Affiche les estimations." },
  { id: "openMonsters", label: "Ouvrir les monstres", description: "Affiche le bestiaire de suivi." },
  { id: "openGallery", label: "Ouvrir la galerie", description: "Ouvre les archives et événements découverts." },
  { id: "toggleSound", label: "Activer ou couper le son", description: "Bascule le son global." },
  { id: "toggleNight", label: "Mode nuit", description: "Bascule l'apparence sombre." },
  { id: "toggleDofusDetection", label: "Détection Dofus", description: "Conservé pour le futur module Détection." },
  { id: "openHelp", label: "Ouvrir l'aide", description: "Conservé pour le futur module Aide." }
]);

export function normalizeShortcut(value) {
  return String(value || "").trim().replace(/Control/gi, "Ctrl").replace(/\s*\+\s*/g, "+");
}

export function shortcutFromEvent(event) {
  const key = event.key === " " ? "Space" : event.key.length === 1 ? event.key.toUpperCase() : event.key;
  if (["Control", "Shift", "Alt", "Meta"].includes(key)) return "";
  const explicitShift = event.shiftKey && key !== "+";
  return [event.ctrlKey && "Ctrl", event.altKey && "Alt", explicitShift && "Shift", event.metaKey && "Meta", key]
    .filter(Boolean).join("+");
}

export function findShortcutConflict(keybinds, value, exceptId = "") {
  const normalized = normalizeShortcut(value).toLowerCase();
  return SHORTCUT_ACTIONS.find((action) => action.id !== exceptId && normalizeShortcut(keybinds?.[action.id]).toLowerCase() === normalized) || null;
}
