require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "pykur.sqlite");
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://127.0.0.1:8765";
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

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

const DEFAULT_ACCOUNT_PREFERENCES = {
  publicProfile: false,
  hidePykurProfileNames: true,
  hideDetailedStats: false,
  hideGallery: false,
  hideSecretAchievements: true,
  showOnlyMainProfile: false,
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
    showOnlyMainProfile: !!input.showOnlyMainProfile,
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

function cleanPseudo(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
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
      INSERT INTO users(pseudo,email,password_hash,role,last_login_at)
      VALUES(?,?,?,?,CURRENT_TIMESTAMP)
    `).run(pseudo, email, hash, role);
    const user = getUserById(info.lastInsertRowid);
    res.status(201).json({ token: signUser(user), user: publicUser(user), bootstrapAdmin: role === "admin" });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Pseudo ou email déjà utilisé." });
    }
    throw error;
  }
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
  db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
  const refreshed = getUserById(user.id);
  res.json({ token: signUser(refreshed), user: publicUser(refreshed) });
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
  const payload = JSON.stringify(req.body.payload || {});
  db.prepare(`
    INSERT INTO cloud_saves(user_id,payload,updated_at)
    VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, payload);
  res.json({ ok: true });
});

app.get("/api/cloud/save", requireAuth, (req, res) => {
  const row = db.prepare("SELECT payload, updated_at FROM cloud_saves WHERE user_id = ?").get(req.user.id);
  res.json({ payload: row ? JSON.parse(row.payload) : null, updatedAt: row?.updated_at || null });
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
