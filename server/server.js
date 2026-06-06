const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const DB_PATH = process.env.DB_PATH ? path.resolve(__dirname, process.env.DB_PATH) : path.join(__dirname, "data", "pykur.sqlite");
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://127.0.0.1:8765";
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || CLIENT_ORIGIN;
const ROLE_ORDER = { user: 1, moderator: 2, admin: 3 };

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((item) => item.name);
  if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn("users", "preferences", "TEXT NOT NULL DEFAULT '{}'");
ensureColumn("users", "email_verified_at", "TEXT");
db.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, created_at) WHERE email_verified_at IS NULL AND last_login_at IS NOT NULL").run();

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));
const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

const DEFAULT_ACCOUNT_PREFERENCES = {
  publicProfile: false,
  hidePykurProfileNames: true,
  hideDetailedStats: false,
  hideGallery: false,
  hideSecretAchievements: true,
  showOnlyMainProfile: false,
  showSecondaryProfiles: false,
  allowPrivateMessages: true
};

function parsePreferences(value) {
  try {
    return Object.assign({}, DEFAULT_ACCOUNT_PREFERENCES, JSON.parse(value || "{}"));
  } catch {
    return Object.assign({}, DEFAULT_ACCOUNT_PREFERENCES);
  }
}

function cleanPreferences(value) {
  const input = value && typeof value === "object" ? value : {};
  return {
    publicProfile: !!input.publicProfile,
    hidePykurProfileNames: input.hidePykurProfileNames !== false,
    hideDetailedStats: !!input.hideDetailedStats,
    hideGallery: !!input.hideGallery,
    hideSecretAchievements: input.hideSecretAchievements !== false,
    showSecondaryProfiles: !!input.showSecondaryProfiles,
    showOnlyMainProfile: !input.showSecondaryProfiles,
    allowPrivateMessages: input.allowPrivateMessages !== false
  };
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    pseudo: user.pseudo,
    email: user.email,
    role: user.role,
    emailVerifiedAt: user.email_verified_at,
    isBanned: !!user.is_banned,
    banUntil: user.ban_until,
    muteUntil: user.mute_until,
    preferences: parsePreferences(user.preferences),
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at
  };
}

function signUser(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

const PUBLIC_MOBS = {
  chiendent: 80,
  nerbe: 80,
  fecorce: 60,
  abrakleur: 40,
  bitouf: 40,
  floribonde: 40,
  brouture: 60,
  tynrilAhuri: 3,
  tynrilPerfide: 3,
  tynrilDeconcerte: 3,
  tynrilConsterne: 3
};
const PUBLIC_SECRET_ACHIEVEMENT_IDS = new Set([
  "egg_charlie",
  "egg_toom",
  "egg_aina",
  "egg_raj",
  "egg_brako",
  "egg_alhass",
  "egg_capy",
  "egg_dimeh",
  "secret_brako_drop",
  "secret_brako_no_drop",
  "secret_egg_war",
  "secret_raj_ban",
  "secret_happios_hover",
  "master_secrets",
  "true_100"
]);
const PP_MAX = 90;

function publicPpFromMobs(mobs) {
  let pp = 0;
  Object.entries(PUBLIC_MOBS).forEach(([id, need]) => {
    pp += Math.floor((Number(mobs?.[id]) || 0) / need);
  });
  return Math.min(PP_MAX, Math.max(0, pp));
}

function publicTotalMobs(mobs) {
  const total = {};
  Object.keys(PUBLIC_MOBS).forEach((id) => {
    total[id] = (Number(mobs?.morose?.[id]) || 0) + (Number(mobs?.tynril?.[id]) || 0) + (Number(mobs?.zone?.[id]) || 0);
  });
  return total;
}

function publicProfileSummary(entry, index, activeId, preferences) {
  const profileData = entry?.data || {};
  const totalMobs = publicTotalMobs(profileData.mobs || {});
  const pp = publicPpFromMobs(totalMobs);
  const morose = Number(profileData.runs?.morose) || 0;
  const tynril = Number(profileData.runs?.tynril) || 0;
  const safeName = preferences.hidePykurProfileNames ? `Profil Pykur #${index + 1}` : String(entry?.name || `Profil Pykur #${index + 1}`);
  const profile = {
    id: entry?.id,
    name: safeName,
    isMain: entry?.id === activeId,
    createdAt: profileData.createdAt || null,
    pp,
    progress: Math.min(100, Math.round((pp / PP_MAX) * 10000) / 100),
    runs: { morose, tynril }
  };
  if (!preferences.hideDetailedStats) {
    profile.stats = {
      chronoTotalSeconds: Number(profileData.chrono?.seconds) || 0,
      bestRunSeconds: Number(profileData.session?.lastSummary?.bestSeconds) || null,
      completedPykurs: Array.isArray(profileData.gallery?.completedPykurs) ? profileData.gallery.completedPykurs.length : 0
    };
  }
  return profile;
}

function buildCommunityProfile(user, savePayload) {
  const preferences = parsePreferences(user.preferences);
  if (!preferences.publicProfile) return null;
  const store = savePayload?.store || {};
  const profileEntries = Object.entries(store.profiles || {}).map(([id, entry]) => ({ id, ...(entry || {}) }));
  const activeId = store.active || profileEntries[0]?.id || null;
  const visibleProfiles = profileEntries
    .filter((entry) => entry.id === activeId || preferences.showSecondaryProfiles)
    .map((entry, index) => publicProfileSummary(entry, index, activeId, preferences));
  const sharedGallery = store.galleryShared !== false ? store.sharedGallery : null;
  const gallerySource = sharedGallery || profileEntries.find((entry) => entry.id === activeId)?.data?.gallery || null;
  const achievementSource = store.achievementsShared
    ? store.sharedAchievements
    : profileEntries.find((entry) => entry.id === activeId)?.data?.achievements;
  const unlockedAchievements = Object.entries(achievementSource?.unlocked || {})
    .filter(([, item]) => item)
    .filter(([id]) => !preferences.hideSecretAchievements || !PUBLIC_SECRET_ACHIEVEMENT_IDS.has(id))
    .map(([id, item]) => ({
      id,
      date: item?.date || null
    }));
  return {
    pseudo: user.pseudo,
    role: user.role,
    createdAt: user.created_at,
    preferences: {
      publicProfile: true,
      showSecondaryProfiles: !!preferences.showSecondaryProfiles,
      hidePykurProfileNames: !!preferences.hidePykurProfileNames,
      hideDetailedStats: !!preferences.hideDetailedStats,
      hideGallery: !!preferences.hideGallery,
      hideSecretAchievements: !!preferences.hideSecretAchievements,
      allowPrivateMessages: !!preferences.allowPrivateMessages
    },
    profiles: visibleProfiles,
    gallery: preferences.hideGallery ? null : {
      completedPykurs: Array.isArray(gallerySource?.completedPykurs) ? gallerySource.completedPykurs.length : 0,
      eventsDiscovered: gallerySource?.eventsDiscovered ? Object.keys(gallerySource.eventsDiscovered).length : 0
    },
    achievements: {
      hiddenSecrets: !!preferences.hideSecretAchievements,
      unlocked: unlockedAchievements
    }
  };
}

function safeParseJson(value, fallback = null) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value ?? fallback;
  } catch {
    return fallback;
  }
}

function mergeEventDiscoveries(base = {}, extra = {}) {
  const merged = Object.assign({}, base || {});
  Object.entries(extra || {}).forEach(([id, item]) => {
    if (!item) return;
    const current = merged[id];
    if (!current) {
      merged[id] = Object.assign({}, item);
      return;
    }
    current.count = Math.max(Number(current.count) || 0, Number(item.count) || 0);
    current.firstSeen = [current.firstSeen, item.firstSeen].filter(Boolean).sort()[0] || current.firstSeen || item.firstSeen || null;
    current.lastSeen = [current.lastSeen, item.lastSeen].filter(Boolean).sort().pop() || current.lastSeen || item.lastSeen || null;
  });
  return merged;
}

function mergeGalleries(baseGallery = {}, extraGallery = {}) {
  const merged = Object.assign({
    completedPykurs: [],
    eventsDiscovered: {},
    currentCycleArchived: false,
    currentCycleCompletionSeen: false
  }, baseGallery || {});
  const completed = Array.isArray(merged.completedPykurs) ? merged.completedPykurs.slice() : [];
  const seen = new Set(completed.map((item) => item?.id).filter(Boolean));
  (Array.isArray(extraGallery?.completedPykurs) ? extraGallery.completedPykurs : []).forEach((item) => {
    if (!item) return;
    if (item.id && seen.has(item.id)) return;
    completed.push(item);
    if (item.id) seen.add(item.id);
  });
  merged.completedPykurs = completed.map((item, index) => Object.assign({}, item, { number: index + 1 }));
  merged.eventsDiscovered = mergeEventDiscoveries(merged.eventsDiscovered, extraGallery?.eventsDiscovered);
  merged.currentCycleArchived = !!(merged.currentCycleArchived || extraGallery?.currentCycleArchived);
  merged.currentCycleCompletionSeen = !!(merged.currentCycleCompletionSeen || extraGallery?.currentCycleCompletionSeen);
  return merged;
}

function mergeAchievements(baseAchievements = {}, extraAchievements = {}) {
  const merged = {
    unlocked: Object.assign({}, baseAchievements?.unlocked || {}),
    secretCategoriesUnlocked: !!baseAchievements?.secretCategoriesUnlocked,
    eggCollected: !!baseAchievements?.eggCollected,
    counters: Object.assign({}, baseAchievements?.counters || {})
  };
  Object.entries(extraAchievements?.unlocked || {}).forEach(([id, value]) => {
    if (value) merged.unlocked[id] = value;
  });
  merged.secretCategoriesUnlocked = merged.secretCategoriesUnlocked || !!extraAchievements?.secretCategoriesUnlocked;
  merged.eggCollected = merged.eggCollected || !!extraAchievements?.eggCollected;
  Object.entries(extraAchievements?.counters || {}).forEach(([id, value]) => {
    merged.counters[id] = Math.max(Number(merged.counters[id]) || 0, Number(value) || 0);
  });
  return merged;
}

function mergeStores(baseStore = {}, extraStore = {}) {
  const merged = Object.assign({}, baseStore || {}, extraStore || {});
  const baseProfiles = baseStore?.profiles || {};
  const extraProfiles = extraStore?.profiles || {};
  merged.profiles = Object.assign({}, baseProfiles, extraProfiles);
  merged.galleryShared = extraStore?.galleryShared !== undefined ? extraStore.galleryShared : baseStore?.galleryShared;
  merged.achievementsShared = extraStore?.achievementsShared !== undefined ? extraStore.achievementsShared : baseStore?.achievementsShared;
  merged.sharedGallery = mergeGalleries(baseStore?.sharedGallery, extraStore?.sharedGallery);
  merged.sharedAchievements = mergeAchievements(baseStore?.sharedAchievements, extraStore?.sharedAchievements);

  Object.keys(merged.profiles || {}).forEach((profileId) => {
    const baseProfile = baseProfiles[profileId] || {};
    const extraProfile = extraProfiles[profileId] || {};
    const profile = Object.assign({}, baseProfile, extraProfile);
    const baseData = baseProfile.data || {};
    const extraData = extraProfile.data || {};
    profile.data = Object.assign({}, baseData, extraData);
    profile.data.gallery = mergeGalleries(baseData.gallery, extraData.gallery);
    profile.data.achievements = mergeAchievements(baseData.achievements, extraData.achievements);
    merged.profiles[profileId] = profile;
  });
  return merged;
}

function mergeCloudPayloads(basePayload = {}, extraPayload = {}) {
  const merged = Object.assign({}, basePayload || {}, extraPayload || {});
  merged.store = mergeStores(basePayload?.store, extraPayload?.store);
  merged.savedAt = new Date().toISOString();
  return merged;
}

function cleanPseudo(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function cleanIdentifier(value) {
  return String(value || "").trim();
}

function isValidPseudo(value) {
  return /^[a-zA-Z0-9À-ÿ _.-]{3,24}$/.test(value);
}

function isExpired(date) {
  return date && new Date(date).getTime() <= Date.now();
}

function getUserById(id) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (user?.ban_until && isExpired(user.ban_until)) {
    db.prepare("UPDATE users SET is_banned = 0, ban_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
    user.is_banned = 0;
    user.ban_until = null;
  }
  if (user?.mute_until && isExpired(user.mute_until)) {
    db.prepare("UPDATE users SET mute_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
    user.mute_until = null;
  }
  return user;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentification requise." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUserById(payload.id);
    if (!user) return res.status(401).json({ error: "Compte introuvable." });
    if (user.is_banned) {
      return res.status(403).json({ error: user.ban_until ? `Compte banni jusqu'au ${user.ban_until}.` : "Compte banni." });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Session invalide." });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || ROLE_ORDER[req.user.role] < ROLE_ORDER[role]) {
      return res.status(403).json({ error: "Permission insuffisante." });
    }
    next();
  };
}

function moderationLog({ targetId, actorId, type, reason, expiresAt = null }) {
  db.prepare(`
    INSERT INTO moderation_actions(target_user_id, actor_user_id, type, reason, expires_at)
    VALUES(?,?,?,?,?)
  `).run(targetId, actorId, type, reason || null, expiresAt || null);
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function resetLink(token) {
  const url = new URL("/familiers/pykur/index.html", APP_PUBLIC_URL);
  url.searchParams.set("resetToken", token);
  return url.toString();
}

function verificationLink(token) {
  const url = new URL("/familiers/pykur/index.html", APP_PUBLIC_URL);
  url.searchParams.set("verifyToken", token);
  return url.toString();
}

function mailTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendPasswordResetEmail(user, link) {
  const transporter = mailTransport();
  if (!transporter) {
    console.warn(`[password-reset] SMTP non configuré. Lien pour ${user.email}: ${link}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "Pykur Tracker <no-reply@pykur-tracker.fr>",
    to: user.email,
    subject: "Réinitialisation de votre mot de passe Pykur Tracker",
    text: `Bonjour ${user.pseudo},\n\nVous avez demandé à réinitialiser votre mot de passe Pykur Tracker.\n\nLien valable 1 heure :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html: `<p>Bonjour <strong>${user.pseudo}</strong>,</p><p>Vous avez demandé à réinitialiser votre mot de passe Pykur Tracker.</p><p><a href="${link}">Réinitialiser mon mot de passe</a></p><p>Ce lien est valable 1 heure.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
  });
}

async function sendEmailVerificationEmail(user, link) {
  const transporter = mailTransport();
  if (!transporter) {
    console.warn(`[email-verification] SMTP non configure. Lien pour ${user.email}: ${link}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "Pykur Tracker <no-reply@pykur-tracker.fr>",
    to: user.email,
    subject: "Confirmez votre compte Pykur Tracker",
    text: `Bonjour ${user.pseudo},\n\nBienvenue sur Pykur Tracker.\n\nPour activer votre compte, confirmez votre email avec ce lien valable 24 heures :\n${link}\n\nSi vous n'avez pas cree ce compte, ignorez cet email.`,
    html: `<p>Bonjour <strong>${user.pseudo}</strong>,</p><p>Bienvenue sur Pykur Tracker.</p><p>Pour activer votre compte, confirmez votre email :</p><p><a href="${link}">Activer mon compte</a></p><p>Ce lien est valable 24 heures.</p><p>Si vous n'avez pas cree ce compte, ignorez cet email.</p>`
  });
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "pykur-tracker", version: "1.5.0-preview" });
});

app.post("/api/auth/register", async (req, res) => {
  const pseudo = cleanPseudo(req.body.pseudo);
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!isValidPseudo(pseudo)) return res.status(400).json({ error: "Pseudo invalide : 3 à 24 caractères." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Email invalide." });
  if (password.length < 8) return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });

  const count = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const role = count === 0 ? "admin" : "user";
  const hash = await bcrypt.hash(password, 12);
  try {
    const info = db.prepare(`
      INSERT INTO users(pseudo,email,password_hash,role)
      VALUES(?,?,?,?)
    `).run(pseudo, email, hash, role);
    const user = getUserById(info.lastInsertRowid);
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ? AND used_at IS NULL").run(user.id);
    db.prepare(`
      INSERT INTO email_verification_tokens(user_id,token_hash,expires_at)
      VALUES(?,?,?)
    `).run(user.id, tokenHash(token), expiresAt);
    try {
      await sendEmailVerificationEmail(user, verificationLink(token));
    } catch (mailError) {
      db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
      console.error(mailError);
      return res.status(502).json({ error: "Compte non cree : email de confirmation impossible a envoyer." });
    }
    res.status(201).json({ ok: true, pendingVerification: true, bootstrapAdmin: role === "admin" });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Pseudo ou email déjà utilisé." });
    }
    throw error;
  }
});

app.post("/api/auth/verify-email/confirm", passwordResetLimiter, (req, res) => {
  const token = String(req.body.token || "");
  if (token.length < 32) return res.status(400).json({ error: "Lien de confirmation invalide." });
  const row = db.prepare(`
    SELECT evt.*, users.id AS user_id
    FROM email_verification_tokens evt
    JOIN users ON users.id = evt.user_id
    WHERE evt.token_hash = ? AND evt.used_at IS NULL
  `).get(tokenHash(token));
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    return res.status(400).json({ error: "Lien de confirmation expire ou deja utilise." });
  }
  const transaction = db.transaction(() => {
    db.prepare("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.user_id);
    db.prepare("UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  });
  transaction();
  const user = getUserById(row.user_id);
  res.json({ token: signUser(user), user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const identifier = String(req.body.identifier || "").trim();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE lower(email) = lower(?) OR lower(pseudo) = lower(?)").get(identifier, identifier);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }
  if (user.is_banned && !isExpired(user.ban_until)) {
    return res.status(403).json({ error: user.ban_until ? `Compte banni jusqu'au ${user.ban_until}.` : "Compte banni." });
  }
  if (!user.email_verified_at) {
    return res.status(403).json({ error: "Veuillez confirmer votre email avant de vous connecter." });
  }
  db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
  const refreshed = getUserById(user.id);
  res.json({ token: signUser(refreshed), user: publicUser(refreshed) });
});

app.post("/api/auth/password-reset/request", passwordResetLimiter, async (req, res) => {
  const identifier = cleanIdentifier(req.body.identifier);
  const user = db.prepare("SELECT * FROM users WHERE lower(email) = lower(?) OR lower(pseudo) = lower(?)").get(identifier, identifier);
  if (user && !user.is_banned) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL").run(user.id);
    db.prepare(`
      INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
      VALUES(?,?,?)
    `).run(user.id, tokenHash(token), expiresAt);
    await sendPasswordResetEmail(user, resetLink(token));
  }
  res.json({ ok: true, message: "Si un compte correspond, un email de récupération vient d'être envoyé." });
});

app.post("/api/auth/password-reset/confirm", passwordResetLimiter, async (req, res) => {
  const token = String(req.body.token || "");
  const newPassword = String(req.body.newPassword || "");
  if (token.length < 32) return res.status(400).json({ error: "Lien de récupération invalide." });
  if (newPassword.length < 8) return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
  const row = db.prepare(`
    SELECT prt.*, users.password_hash
    FROM password_reset_tokens prt
    JOIN users ON users.id = prt.user_id
    WHERE prt.token_hash = ? AND prt.used_at IS NULL
  `).get(tokenHash(token));
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    return res.status(400).json({ error: "Lien de récupération expiré ou déjà utilisé." });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  const transaction = db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ?, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hash, row.user_id);
    db.prepare("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  });
  transaction();
  const user = getUserById(row.user_id);
  res.json({ token: signUser(user), user: publicUser(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), muted: !!req.user.mute_until, muteUntil: req.user.mute_until });
});

app.put("/api/account/email", requireAuth, (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Email invalide." });
  try {
    db.prepare("UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(email, req.user.id);
    res.json({ user: publicUser(getUserById(req.user.id)) });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return res.status(409).json({ error: "Email déjà utilisé." });
    throw error;
  }
});

app.put("/api/account/password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (!(await bcrypt.compare(currentPassword, req.user.password_hash))) return res.status(401).json({ error: "Mot de passe actuel incorrect." });
  if (newPassword.length < 8) return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
  const hash = await bcrypt.hash(newPassword, 12);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hash, req.user.id);
  res.json({ ok: true });
});

app.put("/api/account/preferences", requireAuth, (req, res) => {
  const preferences = cleanPreferences(req.body.preferences);
  db.prepare("UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(JSON.stringify(preferences), req.user.id);
  res.json({ user: publicUser(getUserById(req.user.id)) });
});

app.put("/api/cloud/save", requireAuth, (req, res) => {
  const incomingPayload = req.body.payload || {};
  const current = db.prepare("SELECT payload FROM cloud_saves WHERE user_id = ?").get(req.user.id);
  const currentPayload = safeParseJson(current?.payload, {});
  const mergedPayload = mergeCloudPayloads(currentPayload || {}, incomingPayload || {});
  db.prepare(`
    INSERT INTO cloud_saves(user_id,payload,updated_at)
    VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, JSON.stringify(mergedPayload));
  res.json({ ok: true, payload: mergedPayload });
});

app.get("/api/cloud/save", requireAuth, (req, res) => {
  const row = db.prepare("SELECT payload, updated_at FROM cloud_saves WHERE user_id = ?").get(req.user.id);
  res.json({ payload: row ? JSON.parse(row.payload) : null, updatedAt: row?.updated_at || null });
});

app.get("/api/community/users/:pseudo", (req, res) => {
  const pseudo = cleanPseudo(req.params.pseudo);
  const user = db.prepare("SELECT * FROM users WHERE lower(pseudo) = lower(?)").get(pseudo);
  if (!user || user.is_banned || !user.email_verified_at) return res.status(404).json({ error: "Profil introuvable." });
  const row = db.prepare("SELECT payload FROM cloud_saves WHERE user_id = ?").get(user.id);
  let payload = null;
  try {
    payload = row ? JSON.parse(row.payload) : null;
  } catch {
    payload = null;
  }
  const profile = buildCommunityProfile(user, payload);
  if (!profile) return res.status(404).json({ error: "Profil public désactivé." });
  res.json({ profile });
});

app.get("/api/moderation/users", requireAuth, requireRole("moderator"), (req, res) => {
  const users = db.prepare(`
    SELECT id,pseudo,email,role,is_banned,ban_until,mute_until,created_at,last_login_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 200
  `).all().map(publicUser);
  res.json({ users });
});

app.post("/api/moderation/users/:id/ban", requireAuth, requireRole("moderator"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (ROLE_ORDER[target.role] >= ROLE_ORDER[req.user.role]) return res.status(403).json({ error: "Vous ne pouvez pas sanctionner ce rôle." });
  const until = req.body.until ? new Date(req.body.until).toISOString() : null;
  db.prepare("UPDATE users SET is_banned = 1, ban_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(until, target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: until ? "timeban" : "ban", reason: req.body.reason, expiresAt: until });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.post("/api/moderation/users/:id/unban", requireAuth, requireRole("moderator"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (ROLE_ORDER[target.role] >= ROLE_ORDER[req.user.role]) return res.status(403).json({ error: "Vous ne pouvez pas modifier ce rôle." });
  db.prepare("UPDATE users SET is_banned = 0, ban_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: "unban", reason: req.body.reason });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.post("/api/moderation/users/:id/mute", requireAuth, requireRole("moderator"), (req, res) => {
  const target = getUserById(req.params.id);
  const until = req.body.until ? new Date(req.body.until).toISOString() : null;
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!until || Number.isNaN(new Date(until).getTime())) return res.status(400).json({ error: "Date de fin de mute invalide." });
  if (ROLE_ORDER[target.role] >= ROLE_ORDER[req.user.role]) return res.status(403).json({ error: "Vous ne pouvez pas mute ce rôle." });
  db.prepare("UPDATE users SET mute_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(until, target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: "mute", reason: req.body.reason, expiresAt: until });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.post("/api/moderation/users/:id/unmute", requireAuth, requireRole("moderator"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (ROLE_ORDER[target.role] >= ROLE_ORDER[req.user.role]) return res.status(403).json({ error: "Vous ne pouvez pas modifier ce rôle." });
  db.prepare("UPDATE users SET mute_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: "unmute", reason: req.body.reason });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.post("/api/admin/users/:id/role", requireAuth, requireRole("admin"), (req, res) => {
  const target = getUserById(req.params.id);
  const role = String(req.body.role || "");
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!["user", "moderator", "admin"].includes(role)) return res.status(400).json({ error: "Rôle invalide." });
  db.prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(role, target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: ROLE_ORDER[role] > ROLE_ORDER[target.role] ? "promote" : "demote", reason: req.body.reason });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Erreur serveur." });
});

app.listen(PORT, () => {
  console.log(`Pykur Tracker API listening on http://127.0.0.1:${PORT}`);
});
