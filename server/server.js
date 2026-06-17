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
const PUBLIC_DEPLOYMENT = !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(APP_PUBLIC_URL);

if (PUBLIC_DEPLOYMENT && (JWT_SECRET === "dev-only-change-me" || JWT_SECRET.length < 32)) {
  throw new Error("JWT_SECRET doit contenir au moins 32 caracteres aleatoires en production.");
}
if (PUBLIC_DEPLOYMENT && !/^https:\/\//i.test(APP_PUBLIC_URL)) {
  console.warn("[security] APP_PUBLIC_URL devrait utiliser HTTPS en production.");
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((item) => item.name);
  if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn("users", "preferences", "TEXT NOT NULL DEFAULT '{}'");
ensureColumn("users", "email_verified_at", "TEXT");
ensureColumn("users", "avatar_url", "TEXT");
ensureColumn("users", "first_login_announcement_at", "TEXT");
ensureColumn("users", "deletion_requested_at", "TEXT");
ensureColumn("users", "session_version", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "presence_seen_at", "TEXT");
ensureColumn("users", "password_reset_required", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "social_restrictions", "TEXT NOT NULL DEFAULT '{}'");
ensureColumn("users", "profile_locked", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "avatar_locked", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "staff_note", "TEXT");
db.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, created_at) WHERE email_verified_at IS NULL AND last_login_at IS NOT NULL").run();

function ensureCaseInsensitiveUserIndexes() {
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pseudo_nocase ON users(pseudo COLLATE NOCASE);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE);
    `);
  } catch (error) {
    console.warn("[database] Des comptes differant uniquement par la casse doivent etre corriges.", error.message);
  }
}

ensureCaseInsensitiveUserIndexes();

db.exec(`
  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a_id INTEGER NOT NULL,
    user_b_id INTEGER NOT NULL,
    requester_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(user_a_id < user_b_id),
    UNIQUE(user_a_id,user_b_id),
    FOREIGN KEY(user_a_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(user_b_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a_id);
  CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b_id);
  CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
  CREATE TABLE IF NOT EXISTS moderation_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_user_id INTEGER NOT NULL,
    actor_user_id INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_warnings_target ON moderation_warnings(target_user_id, created_at);
  CREATE TABLE IF NOT EXISTS community_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT NOT NULL,
    body TEXT,
    meta TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_community_logs_created ON community_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_community_logs_user ON community_logs(user_id, created_at);
  CREATE TABLE IF NOT EXISTS security_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    mode TEXT NOT NULL DEFAULT 'normal' CHECK(mode IN ('soft','normal','strict')),
    achievement_cooldown_seconds INTEGER NOT NULL DEFAULT 120,
    pykur_cooldown_seconds INTEGER NOT NULL DEFAULT 86400,
    max_achievement_shares_per_hour INTEGER NOT NULL DEFAULT 8,
    max_pykur_shares_per_day INTEGER NOT NULL DEFAULT 2,
    min_pykur_age_hours INTEGER NOT NULL DEFAULT 12,
    allow_unverified_public INTEGER NOT NULL DEFAULT 1,
    show_unverified_badges INTEGER NOT NULL DEFAULT 1,
    auto_share_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS private_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a_id INTEGER NOT NULL,
    user_b_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_a_read_at TEXT,
    user_b_read_at TEXT,
    user_a_read_message_id INTEGER NOT NULL DEFAULT 0,
    user_b_read_message_id INTEGER NOT NULL DEFAULT 0,
    CHECK(user_a_id < user_b_id),
    UNIQUE(user_a_id,user_b_id),
    FOREIGN KEY(user_a_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(user_b_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS private_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    edited_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES private_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_private_conversations_user_a ON private_conversations(user_a_id);
  CREATE INDEX IF NOT EXISTS idx_private_conversations_user_b ON private_conversations(user_b_id);
  CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(conversation_id, created_at);
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT NOT NULL DEFAULT 'message' CHECK(type IN ('message','achievement','pykur')),
    body TEXT NOT NULL,
    meta TEXT,
    edited_at TEXT,
    deleted_at TEXT,
    deleted_by_user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
  CREATE TABLE IF NOT EXISTS ignored_users (
    user_id INTEGER NOT NULL,
    ignored_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, ignored_user_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(ignored_user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS message_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_user_id INTEGER NOT NULL,
    target_user_id INTEGER,
    chat_message_id INTEGER,
    private_message_id INTEGER,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
    priority TEXT NOT NULL DEFAULT 'normal',
    workflow_status TEXT NOT NULL DEFAULT 'new',
    assigned_to_user_id INTEGER,
    internal_note TEXT,
    message_snapshot TEXT,
    context_snapshot TEXT,
    resolution_action TEXT,
    resolution_note TEXT,
    resolved_by_user_id INTEGER,
    resolved_at TEXT,
    updated_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(chat_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
    FOREIGN KEY(private_message_id) REFERENCES private_messages(id) ON DELETE SET NULL,
    FOREIGN KEY(assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS chat_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    locked INTEGER NOT NULL DEFAULT 0,
    slow_mode_seconds INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS living_event_schedule (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    sequence INTEGER NOT NULL DEFAULT 0,
    event_id TEXT NOT NULL,
    starts_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS living_event_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    paused INTEGER NOT NULL DEFAULT 0,
    min_cooldown_seconds INTEGER NOT NULL DEFAULT 600,
    max_cooldown_seconds INTEGER NOT NULL DEFAULT 1500,
    updated_by_user_id INTEGER,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS admin_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_user_id INTEGER NOT NULL,
    actor_user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','completed','failed','cancelled')),
    delivered_at TEXT,
    completed_at TEXT,
    result TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_admin_commands_target ON admin_commands(target_user_id,status,created_at);
  CREATE INDEX IF NOT EXISTS idx_reports_status ON message_reports(status, created_at);
  CREATE TABLE IF NOT EXISTS staff_permission_overrides (
    user_id INTEGER NOT NULL,
    permission TEXT NOT NULL,
    allowed INTEGER NOT NULL DEFAULT 1,
    updated_by_user_id INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, permission),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
  );
  CREATE TABLE IF NOT EXISTS moderation_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id INTEGER,
    target_user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT NOT NULL DEFAULT '{}',
    request_id TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_audit_created ON moderation_audit_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_actor ON moderation_audit_log(actor_user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_target ON moderation_audit_log(target_user_id, created_at);
  CREATE TRIGGER IF NOT EXISTS moderation_audit_no_update BEFORE UPDATE ON moderation_audit_log BEGIN SELECT RAISE(ABORT, 'moderation audit log is immutable'); END;
  CREATE TRIGGER IF NOT EXISTS moderation_audit_no_delete BEFORE DELETE ON moderation_audit_log BEGIN SELECT RAISE(ABORT, 'moderation audit log is immutable'); END;
  CREATE TABLE IF NOT EXISTS user_pseudo_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    old_pseudo TEXT NOT NULL,
    new_pseudo TEXT NOT NULL,
    actor_user_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
  );
  CREATE INDEX IF NOT EXISTS idx_user_pseudo_history_user ON user_pseudo_history(user_id, created_at);
`);
ensureColumn("private_messages", "edited_at", "TEXT");
ensureColumn("private_messages", "deleted_at", "TEXT");
ensureColumn("private_conversations", "user_a_read_at", "TEXT");
ensureColumn("private_conversations", "user_b_read_at", "TEXT");
ensureColumn("private_conversations", "user_a_read_message_id", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("private_conversations", "user_b_read_message_id", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("chat_messages", "edited_at", "TEXT");
ensureColumn("chat_messages", "deleted_by_user_id", "INTEGER");
ensureColumn("message_reports", "resolution_action", "TEXT");
ensureColumn("message_reports", "resolution_note", "TEXT");
ensureColumn("message_reports", "priority", "TEXT NOT NULL DEFAULT 'normal'");
ensureColumn("message_reports", "workflow_status", "TEXT NOT NULL DEFAULT 'new'");
ensureColumn("message_reports", "assigned_to_user_id", "INTEGER");
ensureColumn("message_reports", "internal_note", "TEXT");
ensureColumn("message_reports", "message_snapshot", "TEXT");
ensureColumn("message_reports", "context_snapshot", "TEXT");
ensureColumn("message_reports", "updated_at", "TEXT");
db.prepare("INSERT OR IGNORE INTO chat_settings(id,locked,slow_mode_seconds) VALUES(1,0,0)").run();
db.prepare("INSERT OR IGNORE INTO security_settings(id) VALUES(1)").run();
db.prepare("INSERT OR IGNORE INTO living_event_settings(id) VALUES(1)").run();

const LIVING_EVENT_CATALOG = Object.freeze([
  { id: "rain", duration: 20000 },
  { id: "wind", duration: 13000 },
  { id: "heat", duration: 15000 },
  { id: "storm", duration: 10000 },
  { id: "fog", duration: 23000 },
  { id: "nightfall", duration: 20000 },
  { id: "sunray", duration: 14000 },
  { id: "keph", duration: 46000 },
  { id: "shadow", duration: 22000 },
  { id: "butterfly", duration: 22000 },
  { id: "corbac", duration: 6200 },
  { id: "chacha", duration: 19000 },
  { id: "larva", duration: 26000 },
  { id: "tofu", duration: 11200 },
  { id: "poop", duration: 120000 },
  { id: "coin", duration: 120000 },
  { id: "fragment", duration: 120000 },
  { id: "chest", duration: 120000 },
  { id: "bottle", duration: 120000 },
  { id: "resonance", duration: 38000 },
  { id: "unstableAura", duration: 15000 },
  { id: "shootingStar", duration: 5400 },
  { id: "sleepy", duration: 17000 },
  { id: "comet", duration: 4000, legendary: true },
  { id: "awakening", duration: 8000, legendary: true },
  { id: "fakeBug", duration: 2000, legendary: true }
]);
const LIVING_EVENT_ALERT_LEAD_MS = 30000;

function randomInteger(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pickLivingEvent() {
  const legendary = Math.random() < 0.035;
  const pool = LIVING_EVENT_CATALOG.filter((event) => !!event.legendary === legendary);
  return pool[randomInteger(0, pool.length - 1)] || LIVING_EVENT_CATALOG[0];
}

function createLivingEventSchedule(previousSequence = 0) {
  const event = pickLivingEvent();
  const settings = db.prepare("SELECT * FROM living_event_settings WHERE id = 1").get() || {};
  const minSeconds = Math.max(30, Number(settings.min_cooldown_seconds) || 600);
  const maxSeconds = Math.max(minSeconds, Number(settings.max_cooldown_seconds) || 1500);
  const startsAt = Date.now() + randomInteger(minSeconds * 1000, maxSeconds * 1000);
  const endsAt = startsAt + event.duration;
  db.prepare(`
    INSERT INTO living_event_schedule(id,sequence,event_id,starts_at,ends_at)
    VALUES(1,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      sequence=excluded.sequence,
      event_id=excluded.event_id,
      starts_at=excluded.starts_at,
      ends_at=excluded.ends_at,
      updated_at=CURRENT_TIMESTAMP
  `).run(Number(previousSequence || 0) + 1, event.id, startsAt, endsAt);
  return db.prepare("SELECT * FROM living_event_schedule WHERE id = 1").get();
}

function currentLivingEventSchedule() {
  let row = db.prepare("SELECT * FROM living_event_schedule WHERE id = 1").get();
  const settings = db.prepare("SELECT paused FROM living_event_settings WHERE id = 1").get();
  if (settings?.paused && row) return row;
  const known = row && LIVING_EVENT_CATALOG.some((event) => event.id === row.event_id);
  if (!known || Number(row.ends_at) <= Date.now()) row = createLivingEventSchedule(row?.sequence || 0);
  return row;
}

function publicLivingEventSchedule() {
  const row = currentLivingEventSchedule();
  const settings = db.prepare("SELECT paused,min_cooldown_seconds,max_cooldown_seconds,updated_at FROM living_event_settings WHERE id = 1").get();
  const now = Date.now();
  const startsAt = Number(row.starts_at);
  const endsAt = Number(row.ends_at);
  return {
    serverTime: now,
    settings: {
      paused: !!settings?.paused,
      minCooldownSeconds: Number(settings?.min_cooldown_seconds) || 600,
      maxCooldownSeconds: Number(settings?.max_cooldown_seconds) || 1500,
      updatedAt: settings?.updated_at || null
    },
    event: {
      sequence: Number(row.sequence),
      id: row.event_id,
      alertAt: startsAt - LIVING_EVENT_ALERT_LEAD_MS,
      startsAt,
      endsAt,
      startsInMs: Math.max(0, startsAt - now),
      endsInMs: Math.max(0, endsAt - now),
      phase: settings?.paused ? "paused" : (now < startsAt ? "upcoming" : "active")
    }
  };
}

currentLivingEventSchedule();
const livingEventScheduleTimer = setInterval(currentLivingEventSchedule, 5000);
livingEventScheduleTimer.unref?.();

const app = express();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error("Origine non autorisee."), { status: 403, code: "CORS_DENIED" }));
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  const incomingRequestId = String(req.headers["x-request-id"] || "");
  req.requestId = /^[a-zA-Z0-9._:-]{1,100}$/.test(incomingRequestId) ? incomingRequestId : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  res.setHeader("Cache-Control", "no-store");
  const startedAt = Date.now();
  res.on("finish", () => {
    if (res.statusCode >= 429) {
      console.warn(`[api] ${req.requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
    }
  });
  next();
});
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: "Trop de requêtes. Réessayez dans quelques secondes.",
    code: "RATE_LIMITED",
    requestId: req.requestId
  })
}));
const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Trop de tentatives de connexion. Reessayez dans 15 minutes.", code: "AUTH_RATE_LIMITED" }
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de creations de compte depuis cette connexion. Reessayez plus tard.", code: "REGISTER_RATE_LIMITED" }
});
const socialWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: { error: "Trop de messages envoyes. Ralentissez quelques instants.", code: "SOCIAL_RATE_LIMITED" }
});
const socialReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: { error: "Trop de signalements envoyes. Reessayez plus tard.", code: "REPORT_RATE_LIMITED" }
});

const DEFAULT_ACCOUNT_PREFERENCES = {
  publicProfile: false,
  hidePykurProfileNames: true,
  hideDetailedStats: false,
  hideGallery: false,
  hideSecretAchievements: true,
  hideNormalAchievements: false,
  shareAchievements: true,
  shareGalleryMoments: true,
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
    hideNormalAchievements: !!input.hideNormalAchievements,
    shareAchievements: input.shareAchievements !== false,
    shareGalleryMoments: input.shareGalleryMoments !== false,
    showSecondaryProfiles: !!input.showSecondaryProfiles,
    showOnlyMainProfile: !input.showSecondaryProfiles,
    allowPrivateMessages: input.allowPrivateMessages !== false
  };
}

const DEFAULT_SOCIAL_RESTRICTIONS = Object.freeze({
  chat: false,
  privateMessages: false,
  friendRequests: false,
  sharing: false
});

function parseSocialRestrictions(value) {
  const parsed = Object.assign({}, DEFAULT_SOCIAL_RESTRICTIONS, safeParseJson(value, {}));
  return {
    chat: !!parsed?.chat,
    privateMessages: !!parsed?.privateMessages,
    friendRequests: !!parsed?.friendRequests,
    sharing: !!parsed?.sharing
  };
}

function socialRestrictionError(user, key, label) {
  if (!parseSocialRestrictions(user?.social_restrictions)[key]) return null;
  return { error: `${label} temporairement restreint par l'équipe de modération.`, code: "SOCIAL_RESTRICTED" };
}

function publicUser(user) {
  if (!user) return null;
  const banned = !!user.is_banned;
  const online = !banned && isRecentlyOnline(user.presence_seen_at);
  return {
    id: user.id,
    pseudo: user.pseudo,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatar_url || "",
    emailVerifiedAt: user.email_verified_at,
    isBanned: banned,
    banUntil: user.ban_until,
    muteUntil: user.mute_until,
    isOnline: online,
    preferences: parsePreferences(user.preferences),
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at
  };
}

function isRecentlyOnline(value) {
  const text = value ? String(value) : "";
  const date = text ? new Date(text.includes("T") ? text : `${text.replace(" ", "T")}Z`) : null;
  return !!date && !Number.isNaN(date.getTime()) && Date.now() - date.getTime() < 2 * 60 * 1000;
}

function publicCommunityUser(user) {
  const preferences = parsePreferences(user.preferences);
  const banned = !!user.is_banned;
  return {
    pseudo: user.pseudo,
    role: user.role,
    avatarUrl: user.avatar_url || "",
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    isOnline: !banned && isRecentlyOnline(user.presence_seen_at),
    isBanned: banned,
    banUntil: user.ban_until,
    publicProfile: !!preferences.publicProfile && !user.profile_locked,
    allowPrivateMessages: !!preferences.allowPrivateMessages
  };
}

function signUser(user) {
  return jwt.sign({ id: user.id, role: user.role, sv: Number(user.session_version || 0) }, JWT_SECRET, { expiresIn: "7d" });
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

function buildCommunityProfile(user, savePayload, options = {}) {
  const preferences = parsePreferences(user.preferences);
  const banned = !!user.is_banned;
  const moderationView = !!options.moderationView;
  const profileIsPrivate = !preferences.publicProfile || !!user.profile_locked;
  if (profileIsPrivate && !moderationView) {
    return {
      pseudo: user.pseudo,
      role: user.role,
      avatarUrl: user.avatar_url || "",
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      isOnline: !banned && isRecentlyOnline(user.presence_seen_at),
      isBanned: banned,
      banUntil: user.ban_until,
      isPrivate: true,
      preferences: {
        publicProfile: false,
        allowPrivateMessages: !!preferences.allowPrivateMessages
      },
      profiles: [],
      gallery: null,
      achievements: { hiddenSecrets: true, unlocked: [] }
    };
  }
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
    .filter(([id]) => !preferences.hideNormalAchievements || PUBLIC_SECRET_ACHIEVEMENT_IDS.has(id))
    .map(([id, item]) => ({
      id,
      date: item?.date || null
    }));
  return {
    pseudo: user.pseudo,
    role: user.role,
    avatarUrl: user.avatar_url || "",
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    isOnline: !banned && isRecentlyOnline(user.presence_seen_at),
    isBanned: banned,
    banUntil: user.ban_until,
    isPrivate: profileIsPrivate,
    preferences: {
      publicProfile: !!preferences.publicProfile && !user.profile_locked,
      showSecondaryProfiles: !!preferences.showSecondaryProfiles,
      hidePykurProfileNames: !!preferences.hidePykurProfileNames,
      hideDetailedStats: !!preferences.hideDetailedStats,
      hideGallery: !!preferences.hideGallery,
      hideSecretAchievements: !!preferences.hideSecretAchievements,
      hideNormalAchievements: !!preferences.hideNormalAchievements,
      allowPrivateMessages: !!preferences.allowPrivateMessages
    },
    moderationView,
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
  merged.removedPykurs = Object.assign({}, baseGallery?.removedPykurs || {}, extraGallery?.removedPykurs || {});
  merged.removedEvents = Object.assign({}, baseGallery?.removedEvents || {}, extraGallery?.removedEvents || {});
  const removedPykurs = new Set(Object.keys(merged.removedPykurs));
  const completed = (Array.isArray(merged.completedPykurs) ? merged.completedPykurs.slice() : [])
    .filter((item) => !removedPykurs.has(String(item?.id || "")));
  const seen = new Set(completed.map((item) => item?.id).filter(Boolean));
  (Array.isArray(extraGallery?.completedPykurs) ? extraGallery.completedPykurs : []).forEach((item) => {
    if (!item || removedPykurs.has(String(item?.id || ""))) return;
    if (item.id && seen.has(item.id)) return;
    completed.push(item);
    if (item.id) seen.add(item.id);
  });
  merged.completedPykurs = completed.map((item, index) => Object.assign({}, item, { number: index + 1 }));
  merged.eventsDiscovered = mergeEventDiscoveries(merged.eventsDiscovered, extraGallery?.eventsDiscovered);
  Object.keys(merged.removedEvents).forEach((id) => delete merged.eventsDiscovered[id]);
  merged.currentCycleArchived = !!(merged.currentCycleArchived || extraGallery?.currentCycleArchived);
  merged.currentCycleCompletionSeen = !!(merged.currentCycleCompletionSeen || extraGallery?.currentCycleCompletionSeen);
  return merged;
}

function mergeAchievements(baseAchievements = {}, extraAchievements = {}) {
  const merged = {
    unlocked: Object.assign({}, baseAchievements?.unlocked || {}),
    secretCategoriesUnlocked: !!baseAchievements?.secretCategoriesUnlocked,
    eggCollected: !!baseAchievements?.eggCollected,
    counters: Object.assign({}, baseAchievements?.counters || {}),
    removedUnlocked: Object.assign({}, baseAchievements?.removedUnlocked || {}, extraAchievements?.removedUnlocked || {})
  };
  Object.entries(extraAchievements?.unlocked || {}).forEach(([id, value]) => {
    if (value) merged.unlocked[id] = value;
  });
  Object.keys(merged.removedUnlocked).forEach((id) => delete merged.unlocked[id]);
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
  merged.deletedProfiles = Object.assign({}, baseStore?.deletedProfiles || {}, extraStore?.deletedProfiles || {});
  const deletedProfiles = new Set(Object.keys(merged.deletedProfiles || {}));
  merged.profiles = Object.assign({}, baseProfiles, extraProfiles);
  deletedProfiles.forEach((profileId) => {
    delete merged.profiles[profileId];
  });
  merged.galleryShared = extraStore?.galleryShared !== undefined ? extraStore.galleryShared : baseStore?.galleryShared;
  merged.achievementsShared = extraStore?.achievementsShared !== undefined ? extraStore.achievementsShared : baseStore?.achievementsShared;
  merged.sharedGallery = mergeGalleries(baseStore?.sharedGallery, extraStore?.sharedGallery);
  merged.sharedAchievements = mergeAchievements(baseStore?.sharedAchievements, extraStore?.sharedAchievements);

  Object.keys(merged.profiles || {}).forEach((profileId) => {
    if (deletedProfiles.has(profileId)) return;
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

function cleanAvatarUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length > 650000) throw new Error("Image trop lourde. Utilisez une image de moins de 450 Ko.");
  if (/^https?:\/\/[^\s]+$/i.test(text) || /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(text)) return text;
  throw new Error("URL de photo invalide.");
}

function chatSettings() {
  return db.prepare("SELECT locked, slow_mode_seconds AS slowModeSeconds, updated_at AS updatedAt FROM chat_settings WHERE id = 1").get() || { locked: 0, slowModeSeconds: 0 };
}

function securitySettings() {
  const row = db.prepare(`
    SELECT mode,
           achievement_cooldown_seconds AS achievementCooldownSeconds,
           pykur_cooldown_seconds AS pykurCooldownSeconds,
           max_achievement_shares_per_hour AS maxAchievementSharesPerHour,
           max_pykur_shares_per_day AS maxPykurSharesPerDay,
           min_pykur_age_hours AS minPykurAgeHours,
           allow_unverified_public AS allowUnverifiedPublic,
           show_unverified_badges AS showUnverifiedBadges,
           auto_share_enabled AS autoShareEnabled,
           updated_at AS updatedAt
    FROM security_settings WHERE id = 1
  `).get();
  return row || {
    mode: "normal",
    achievementCooldownSeconds: 120,
    pykurCooldownSeconds: 86400,
    maxAchievementSharesPerHour: 8,
    maxPykurSharesPerDay: 2,
    minPykurAgeHours: 12,
    allowUnverifiedPublic: 1,
    showUnverifiedBadges: 1,
    autoShareEnabled: 1
  };
}

function logCommunity({ userId = null, type, body = "", meta = {} }) {
  try {
    db.prepare("INSERT INTO community_logs(user_id,type,body,meta) VALUES(?,?,?,?)").run(userId, type, String(body || "").slice(0, 1000), JSON.stringify(meta || {}));
  } catch {
    // Les logs communautaires ne doivent jamais bloquer l'action principale.
  }
}

function shareLimitError(userId, type, meta = {}) {
  const settings = securitySettings();
  if (!settings.autoShareEnabled && type !== "message") return "Les partages publics automatiques sont désactivés.";
  if (type !== "achievement" && type !== "pykur") return "";
  const cooldown = type === "achievement" ? Number(settings.achievementCooldownSeconds) : Number(settings.pykurCooldownSeconds);
  const maxCount = type === "achievement" ? Number(settings.maxAchievementSharesPerHour) : Number(settings.maxPykurSharesPerDay);
  const windowSql = type === "achievement" ? "-1 hour" : "-1 day";
  const last = db.prepare("SELECT created_at FROM chat_messages WHERE user_id = ? AND type = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1").get(userId, type);
  if (last && cooldown > 0) {
    const elapsed = (Date.now() - new Date(String(last.created_at).replace(" ", "T") + "Z").getTime()) / 1000;
    if (elapsed < cooldown) return `Partage trop rapide. Attendez encore ${Math.ceil(cooldown - elapsed)}s.`;
  }
  const count = db.prepare(`SELECT COUNT(*) AS total FROM chat_messages WHERE user_id = ? AND type = ? AND deleted_at IS NULL AND datetime(created_at) >= datetime('now', ?)`).get(userId, type, windowSql)?.total || 0;
  if (maxCount > 0 && count >= maxCount) return "Limite de partages publics atteinte pour le moment.";
  if (type === "pykur" && Number(settings.minPykurAgeHours) > 0) {
    const createdAt = meta?.createdAt || meta?.created || meta?.startDate || meta?.cycleStart || "";
    const createdTime = createdAt ? new Date(createdAt).getTime() : 0;
    if (createdTime && Date.now() - createdTime < Number(settings.minPykurAgeHours) * 60 * 60 * 1000) {
      return "Pykur termine trop rapidement pour etre partage publiquement.";
    }
  }
  const marker = meta?.id || meta?.number || meta?.title || "";
  if (marker) {
    const duplicate = db.prepare(`
      SELECT id FROM chat_messages
      WHERE user_id = ? AND type = ? AND deleted_at IS NULL AND meta LIKE ?
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, type, `%${String(marker).replace(/[%_]/g, "")}%`);
    if (duplicate) return "Ce partage existe déjà.";
  }
  return "";
}

function announceFirstLogin(user) {
  if (!user || user.first_login_announcement_at) return;
  db.prepare(`
    INSERT INTO chat_messages(user_id,type,body,meta)
    VALUES(?,?,?,?)
  `).run(user.id, "message", `${user.pseudo} vient de rejoindre Familier Tracker.`, JSON.stringify({ system: "first_login" }));
  logCommunity({ userId: user.id, type: "first_login", body: `${user.pseudo} a rejoint Familier Tracker.` });
  db.prepare("UPDATE users SET first_login_announcement_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
}

function isValidPseudo(value) {
  return /^[a-zA-Z0-9À-ÿ _.-]{3,24}$/.test(value);
}

function isExpired(date) {
  return date && new Date(date).getTime() <= Date.now();
}

function purgeExpiredClosedAccounts() {
  try {
    db.prepare("DELETE FROM users WHERE deletion_requested_at IS NOT NULL AND datetime(deletion_requested_at) <= datetime('now','-30 days')").run();
  } catch {
    // La purge ne doit jamais bloquer les routes critiques.
  }
}

function getUserById(id) {
  purgeExpiredClosedAccounts();
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

function getUserByPseudo(pseudo) {
  const value = cleanPseudo(pseudo);
  if (!value) return null;
  return db.prepare(`
    SELECT * FROM users
    WHERE lower(pseudo) = lower(?)
    ORDER BY CASE WHEN pseudo = ? THEN 0 ELSE 1 END,
             CASE WHEN email_verified_at IS NOT NULL THEN 0 ELSE 1 END,
             id DESC
    LIMIT 1
  `).get(value, value) || null;
}

function getUserByIdentifier(identifier) {
  const value = cleanIdentifier(identifier);
  if (!value) return null;
  if (!value.includes("@")) return getUserByPseudo(value);
  return db.prepare(`
    SELECT * FROM users
    WHERE lower(email) = lower(?)
    ORDER BY CASE WHEN email = ? THEN 0 ELSE 1 END,
             CASE WHEN email_verified_at IS NOT NULL THEN 0 ELSE 1 END,
             id DESC
    LIMIT 1
  `).get(value, value) || null;
}

function authenticateRequest(req, res, next, { allowBanned = false } = {}) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentification requise." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUserById(payload.id);
    if (!user) return res.status(401).json({ error: "Compte introuvable." });
    if (Number(payload.sv || 0) !== Number(user.session_version || 0)) return res.status(401).json({ error: "Session expirée. Reconnectez-vous." });
    if (user.is_banned && !allowBanned) {
      return res.status(403).json({ error: user.ban_until ? `Compte banni jusqu'au ${user.ban_until}.` : "Compte banni." });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Session invalide." });
  }
}

function requireAuth(req, res, next) {
  return authenticateRequest(req, res, next);
}

function requireCommandAuth(req, res, next) {
  return authenticateRequest(req, res, next, { allowBanned: true });
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUserById(payload.id);
    if (user && Number(payload.sv || 0) === Number(user.session_version || 0) && !user.is_banned) req.user = user;
  } catch {
    req.user = null;
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || ROLE_ORDER[req.user.role] < ROLE_ORDER[role]) {
      return res.status(403).json({ error: "Permission insuffisante." });
    }
    next();
  };
}

const ADMIN_PERMISSION_CATALOG = Object.freeze([
  { id: "console.view", group: "Acces", label: "Ouvrir le centre de controle", description: "Acces au panneau de moderation et d'administration." },
  { id: "users.view", group: "Utilisateurs", label: "Consulter les comptes", description: "Afficher les profils complets et les historiques de moderation." },
  { id: "users.warn", group: "Utilisateurs", label: "Avertir", description: "Envoyer un avertissement visible par le membre." },
  { id: "users.mute", group: "Utilisateurs", label: "Mute", description: "Restreindre temporairement la messagerie d'un membre." },
  { id: "users.ban", group: "Utilisateurs", label: "Bannir", description: "Bannir, debannir ou deconnecter un membre." },
  { id: "users.ban.permanent", group: "Utilisateurs", label: "Ban definitif", description: "Appliquer un bannissement sans date de fin. Reserve aux droits avances." },
  { id: "users.history.manage", group: "Utilisateurs", label: "Corriger l'historique", description: "Retirer les sanctions recentes affichees, sans effacer l'audit." },
  { id: "users.notes", group: "Utilisateurs", label: "Notes internes", description: "Conserver une note visible uniquement par l'equipe." },
  { id: "users.restrict", group: "Utilisateurs", label: "Restreindre les fonctions sociales", description: "Bloquer separement chat, messages, amis, partages, avatar ou profil public." },
  { id: "users.rename", group: "Utilisateurs", label: "Modifier un pseudo", description: "Renommer un membre avec historique obligatoire." },
  { id: "users.avatar.manage", group: "Utilisateurs", label: "Gerer les avatars", description: "Changer ou supprimer la photo de profil d'un membre avec audit." },
  { id: "users.sessions.revoke", group: "Securite", label: "Revoquer les sessions", description: "Deconnecter le membre de tous ses appareils." },
  { id: "users.password.reset", group: "Securite", label: "Forcer un nouveau mot de passe", description: "Envoyer un lien de recuperation et bloquer la connexion actuelle." },
  { id: "users.delete", group: "Utilisateurs", label: "Supprimer un compte", description: "Suppression definitive d'un compte. Reserve aux administrateurs." },
  { id: "reports.view", group: "Signalements", label: "Consulter les signalements", description: "Lire les dossiers, messages et contextes conserves." },
  { id: "reports.assign", group: "Signalements", label: "Organiser les dossiers", description: "Assigner, prioriser et annoter un signalement." },
  { id: "reports.resolve", group: "Signalements", label: "Clore les dossiers", description: "Classer un signalement ou appliquer une sanction autorisee." },
  { id: "logs.view", group: "Journal", label: "Voir les journaux utilisateurs", description: "Consulter l'activite communautaire recente." },
  { id: "audit.view", group: "Journal", label: "Voir l'audit immuable", description: "Consulter la trace permanente des actions sensibles." },
  { id: "chat.configure", group: "Communication", label: "Configurer le chat", description: "Fermer le chat ou regler son mode lent." },
  { id: "chat.clear", group: "Communication", label: "Vider le chat", description: "Masquer tous les messages visibles du chat global." },
  { id: "notifications.send", group: "Communication", label: "Envoyer des notifications", description: "Envoyer une notification ou une popup a un membre." },
  { id: "events.target", group: "Outils", label: "Jouer un evenement individuel", description: "Declencher un evenement cosmetique pour un joueur." },
  { id: "events.configure", group: "Outils", label: "Configurer les evenements", description: "Modifier le calendrier global des evenements." },
  { id: "tracker.reset", group: "Donnees", label: "Reparer ou reset le tracker", description: "Intervenir sur les donnees de progression." },
  { id: "achievements.manage", group: "Donnees", label: "Gerer les succes", description: "Ajouter, retirer ou recalculer des succes." },
  { id: "gallery.manage", group: "Donnees", label: "Gerer la galerie", description: "Modifier les archives et evenements decouverts." },
  { id: "profiles.manage", group: "Donnees", label: "Gerer les profils Pykur", description: "Renommer ou supprimer des profils Pykur." },
  { id: "roles.manage", group: "Administration", label: "Gerer les roles", description: "Promouvoir ou retrograder les moderateurs." },
  { id: "permissions.manage", group: "Administration", label: "Gerer les permissions", description: "Personnaliser les droits detailles des moderateurs." },
  { id: "security.configure", group: "Administration", label: "Configurer la securite", description: "Modifier les regles anti-abus du serveur." }
]);

const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_CATALOG.map((permission) => permission.id);
const ADMIN_PERMISSION_MATRIX = Object.freeze({
  moderator: [
    "console.view", "users.view", "users.warn", "users.mute", "users.ban", "users.history.manage",
    "users.notes", "users.restrict",
    "reports.view", "reports.assign", "reports.resolve", "logs.view",
    "notifications.send", "events.target", "chat.configure", "chat.clear"
  ],
  admin: ALL_ADMIN_PERMISSIONS
});

function baseAdminPermissions(role) {
  return [...(ADMIN_PERMISSION_MATRIX[role] || [])];
}

function adminPermissions(user) {
  const permissions = new Set(baseAdminPermissions(user?.role));
  if (!user?.id || user.role !== "moderator") return [...permissions];
  const overrides = db.prepare("SELECT permission,allowed FROM staff_permission_overrides WHERE user_id = ?").all(user.id);
  overrides.forEach((override) => {
    if (Number(override.allowed)) permissions.add(override.permission);
    else permissions.delete(override.permission);
  });
  return [...permissions];
}

function hasPermission(user, permission) {
  return adminPermissions(user).includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!adminPermissions(req.user).includes(permission)) {
      return res.status(403).json({ error: "Permission insuffisante.", permission });
    }
    next();
  };
}

function auditLog({ actorId = null, targetId = null, action, entityType = null, entityId = null, details = {}, req = null }) {
  if (!action) return;
  const actorSnapshot = actorId ? getUserById(actorId) : null;
  const targetSnapshot = targetId ? getUserById(targetId) : null;
  const storedDetails = {
    ...(details || {}),
    actorSnapshot: actorSnapshot ? { id: actorSnapshot.id, pseudo: actorSnapshot.pseudo, role: actorSnapshot.role } : null,
    targetSnapshot: targetSnapshot ? { id: targetSnapshot.id, pseudo: targetSnapshot.pseudo, role: targetSnapshot.role } : null
  };
  db.prepare(`
    INSERT INTO moderation_audit_log(actor_user_id,target_user_id,action,entity_type,entity_id,details,request_id,ip_address)
    VALUES(?,?,?,?,?,?,?,?)
  `).run(
    actorId || null,
    targetId || null,
    String(action).slice(0, 100),
    entityType ? String(entityType).slice(0, 80) : null,
    entityId === null || entityId === undefined ? null : String(entityId).slice(0, 120),
    JSON.stringify(storedDetails),
    req?.requestId || null,
    req?.ip || null
  );
}

function auditLogView(row) {
  const details = safeParseJson(row.details, {});
  return {
    id: Number(row.id),
    action: row.action,
    entityType: row.entity_type || "",
    entityId: row.entity_id || "",
    details,
    requestId: row.request_id || "",
    ipAddress: row.ip_address || "",
    createdAt: row.created_at,
    actor: row.actor_pseudo ? { pseudo: row.actor_pseudo, role: row.actor_role || "moderator" } : (details.actorSnapshot || null),
    target: row.target_pseudo ? { pseudo: row.target_pseudo, role: row.target_role || "user" } : (details.targetSnapshot || null)
  };
}

function adminCommandView(row) {
  return {
    id: Number(row.id),
    type: row.type,
    payload: safeParseJson(row.payload, {}),
    status: row.status,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
    completedAt: row.completed_at,
    result: safeParseJson(row.result, null),
    actor: row.actor_pseudo ? { pseudo: row.actor_pseudo, role: row.actor_role } : null,
    target: row.target_pseudo ? { pseudo: row.target_pseudo, role: row.target_role } : null
  };
}

function queueAdminCommand({ actor, target, type, payload = {} }) {
  const info = db.prepare(`
    INSERT INTO admin_commands(target_user_id,actor_user_id,type,payload)
    VALUES(?,?,?,?)
  `).run(target.id, actor.id, type, JSON.stringify(payload || {}));
  logCommunity({
    userId: actor.id,
    type: "admin_command",
    body: type,
    meta: { commandId: info.lastInsertRowid, targetId: target.id, targetPseudo: target.pseudo, payload }
  });
  auditLog({ actorId: actor.id, targetId: target.id, action: `admin.command.${type}`, entityType: "admin_command", entityId: info.lastInsertRowid, details: { payload } });
  return info.lastInsertRowid;
}

function loadCloudPayloadForUser(userId) {
  const row = db.prepare("SELECT payload FROM cloud_saves WHERE user_id = ?").get(userId);
  return safeParseJson(row?.payload, { store: { profiles: {} } }) || { store: { profiles: {} } };
}

function saveCloudPayloadForUser(userId, payload) {
  payload.savedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO cloud_saves(user_id,payload,updated_at)
    VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP
  `).run(userId, JSON.stringify(payload));
}

function gallerySources(store) {
  const sources = [];
  if (store?.sharedGallery) sources.push(store.sharedGallery);
  Object.values(store?.profiles || {}).forEach((profile) => {
    if (profile?.data?.gallery) sources.push(profile.data.gallery);
  });
  return sources;
}

function achievementSources(store) {
  const sources = [];
  if (store?.sharedAchievements) sources.push(store.sharedAchievements);
  Object.values(store?.profiles || {}).forEach((profile) => {
    if (profile?.data?.achievements) sources.push(profile.data.achievements);
  });
  return sources;
}

function applyCloudAdminMutation(targetId, type, commandPayload = {}) {
  const payload = loadCloudPayloadForUser(targetId);
  const store = payload.store || (payload.store = { profiles: {} });
  const profileId = String(commandPayload.profileId || "");
  if (type === "reset-gallery") {
    gallerySources(store).forEach((source) => {
      source.removedPykurs = Object.assign({}, source.removedPykurs || {});
      (source.completedPykurs || []).forEach((item) => { if (item?.id) source.removedPykurs[item.id] = new Date().toISOString(); });
      source.removedEvents = Object.assign({}, source.removedEvents || {});
      Object.keys(source.eventsDiscovered || {}).forEach((id) => { source.removedEvents[id] = new Date().toISOString(); });
      source.completedPykurs = [];
      source.eventsDiscovered = {};
      source.currentCycleArchived = false;
      source.currentCycleCompletionSeen = false;
    });
  } else if (type === "reset-achievements") {
    achievementSources(store).forEach((source) => {
      source.removedUnlocked = Object.assign({}, source.removedUnlocked || {});
      Object.keys(source.unlocked || {}).forEach((id) => { source.removedUnlocked[id] = new Date().toISOString(); });
      source.unlocked = {};
      source.secretCategoriesUnlocked = false;
      source.eggCollected = false;
      source.counters = {};
    });
  } else if (type === "reset-profile" || type === "reset-pykur") {
    const profile = store.profiles?.[profileId];
    if (!profile?.data) throw new Error("Profil Pykur introuvable.");
    const data = profile.data;
    data.runs = { morose: 0, tynril: 0 };
    data.mobs = { morose: {}, tynril: {}, zone: {} };
    data.chrono = { seconds: 0, running: false, startedAt: null, lastMarkSeconds: 0, marks: [] };
    data.session = { active: false, startedAt: null, sessionStartedAt: null, totalSeconds: 0, runs: { morose: 0, tynril: 0 }, ppStart: 0, ppGain: 0, lastSummary: null };
    data.activity = [];
    data.undo = [];
    data.createdAt = new Date().toISOString();
  } else if (type === "remove-achievement") {
    const achievementId = String(commandPayload.achievementId || "");
    achievementSources(store).forEach((source) => {
      if (source?.unlocked) delete source.unlocked[achievementId];
      source.removedUnlocked = Object.assign({}, source.removedUnlocked || {}, { [achievementId]: new Date().toISOString() });
    });
  } else if (type === "remove-gallery-event") {
    const eventId = String(commandPayload.eventId || "");
    gallerySources(store).forEach((source) => {
      if (source?.eventsDiscovered) delete source.eventsDiscovered[eventId];
      source.removedEvents = Object.assign({}, source.removedEvents || {}, { [eventId]: new Date().toISOString() });
    });
  } else if (type === "remove-gallery-pykur") {
    const pykurId = String(commandPayload.pykurId || "");
    gallerySources(store).forEach((source) => {
      source.completedPykurs = (Array.isArray(source.completedPykurs) ? source.completedPykurs : [])
        .filter((item) => String(item?.id || "") !== pykurId)
        .map((item, index) => Object.assign({}, item, { number: index + 1 }));
      source.removedPykurs = Object.assign({}, source.removedPykurs || {}, { [pykurId]: new Date().toISOString() });
    });
  } else if (type === "rename-profile") {
    if (!store.profiles?.[profileId]) throw new Error("Profil Pykur introuvable.");
    store.profiles[profileId].name = String(commandPayload.name || "").trim().slice(0, 80) || store.profiles[profileId].name;
  } else if (type === "delete-profile") {
    if (!store.profiles?.[profileId]) throw new Error("Profil Pykur introuvable.");
    if (Object.keys(store.profiles).length <= 1) throw new Error("Le dernier profil ne peut pas être supprimé.");
    store.deletedProfiles = Object.assign({}, store.deletedProfiles || {}, { [profileId]: new Date().toISOString() });
    delete store.profiles[profileId];
    if (store.active === profileId) store.active = Object.keys(store.profiles)[0];
  } else {
    return payload;
  }
  saveCloudPayloadForUser(targetId, payload);
  return payload;
}

const CLOUD_PP_NEEDS = Object.freeze({
  chiendent: 80, nerbe: 80, fecorce: 60, abrakleur: 40, bitouf: 40,
  floribonde: 40, brouture: 60, tynrilAhuri: 3, tynrilPerfide: 3,
  tynrilDeconcerte: 3, tynrilConsterne: 3
});

function cloudProfilePP(profileData) {
  const totals = {};
  for (const source of ["morose", "tynril", "zone"]) {
    for (const [id, value] of Object.entries(profileData?.mobs?.[source] || {})) {
      totals[id] = (totals[id] || 0) + Math.max(0, Number(value) || 0);
    }
  }
  return Object.entries(CLOUD_PP_NEEDS).reduce((sum, [id, need]) => sum + Math.floor((totals[id] || 0) / need), 0);
}

function friendshipPair(idA, idB) {
  const a = Number(idA);
  const b = Number(idB);
  return a < b ? { userA: a, userB: b } : { userA: b, userB: a };
}

function getFriendshipBetween(idA, idB) {
  if (!idA || !idB || Number(idA) === Number(idB)) return null;
  const pair = friendshipPair(idA, idB);
  return db.prepare("SELECT * FROM friendships WHERE user_a_id = ? AND user_b_id = ?").get(pair.userA, pair.userB) || null;
}

function friendStatus(viewerId, targetId) {
  if (!viewerId || !targetId) return { isSelf: false, status: "anonymous" };
  if (Number(viewerId) === Number(targetId)) return { isSelf: true, status: "self" };
  const friendship = getFriendshipBetween(viewerId, targetId);
  if (!friendship) return { isSelf: false, status: "none" };
  if (friendship.status === "accepted") return { isSelf: false, status: "friends" };
  return {
    isSelf: false,
    status: Number(friendship.requester_id) === Number(viewerId) ? "pending_sent" : "pending_received"
  };
}

function socialProfileMeta(viewer, target, preferences) {
  const state = friendStatus(viewer?.id, target.id);
  return Object.assign(state, {
    canRequestFriend: !!viewer && !state.isSelf && ["none", "pending_received"].includes(state.status),
    canMessage: !!viewer && !state.isSelf && !!preferences.allowPrivateMessages && state.status === "friends"
  });
}

function getOrCreatePrivateConversation(idA, idB) {
  const pair = friendshipPair(idA, idB);
  let conversation = db.prepare("SELECT * FROM private_conversations WHERE user_a_id = ? AND user_b_id = ?").get(pair.userA, pair.userB);
  if (!conversation) {
    const info = db.prepare(`
      INSERT INTO private_conversations(user_a_id,user_b_id)
      VALUES(?,?)
    `).run(pair.userA, pair.userB);
    conversation = db.prepare("SELECT * FROM private_conversations WHERE id = ?").get(info.lastInsertRowid);
  }
  return conversation;
}

function canMessageUser(viewer, target) {
  if (!viewer || !target || Number(viewer.id) === Number(target.id)) return false;
  const friendship = getFriendshipBetween(viewer.id, target.id);
  const preferences = parsePreferences(target.preferences);
  return friendship?.status === "accepted" && !!preferences.allowPrivateMessages;
}

function conversationOtherUser(row, viewerId) {
  const otherIsA = Number(row.user_a_id) !== Number(viewerId);
  const lastLoginAt = otherIsA ? row.user_a_last_login_at : row.user_b_last_login_at;
  const presenceSeenAt = otherIsA ? row.user_a_presence_seen_at : row.user_b_presence_seen_at;
  const banned = !!(otherIsA ? row.user_a_is_banned : row.user_b_is_banned);
  return {
    pseudo: otherIsA ? row.user_a_pseudo : row.user_b_pseudo,
    role: otherIsA ? row.user_a_role : row.user_b_role,
    avatarUrl: otherIsA ? row.user_a_avatar_url : row.user_b_avatar_url,
    createdAt: otherIsA ? row.user_a_created_at : row.user_b_created_at,
    lastLoginAt,
    isOnline: !banned && isRecentlyOnline(presenceSeenAt),
    isBanned: banned,
    banUntil: otherIsA ? row.user_a_ban_until : row.user_b_ban_until
  };
}

function publicMessage(row, viewerId) {
  return {
    id: row.id,
    body: row.body,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    isMine: Number(row.sender_id) === Number(viewerId),
    sender: {
      pseudo: row.sender_pseudo,
      role: row.sender_role
    }
  };
}

function publicChatMessage(row, viewerId) {
  const banned = !!row.sender_is_banned;
  return {
    id: row.id,
    type: row.type || "message",
    body: row.body,
    meta: safeParseJson(row.meta, {}),
    editedAt: row.edited_at,
    createdAt: row.created_at,
    isMine: Number(row.user_id) === Number(viewerId),
    sender: row.sender_pseudo ? {
      pseudo: row.sender_pseudo,
      role: row.sender_role,
      avatarUrl: row.sender_avatar_url || "",
      isBanned: banned,
      isOnline: !banned && isRecentlyOnline(row.sender_presence_seen_at)
    } : {
      pseudo: "Compte supprimé",
      role: "user",
      avatarUrl: "",
      isBanned: false,
      isOnline: false
    }
  };
}

function chatMessageSelect(where = "m.deleted_at IS NULL") {
  return `
    SELECT m.*, u.pseudo AS sender_pseudo, u.role AS sender_role, u.avatar_url AS sender_avatar_url,
           u.last_login_at AS sender_last_login_at, u.presence_seen_at AS sender_presence_seen_at, u.is_banned AS sender_is_banned
    FROM chat_messages m
    LEFT JOIN users u ON u.id = m.user_id
    WHERE ${where}
  `;
}

function canModerateTarget(actor, target) {
  if (!actor || !target) return false;
  if (Number(actor.id) === Number(target.id)) return false;
  return ROLE_ORDER[target.role] < ROLE_ORDER[actor.role];
}

function moderationUserView(user, actor) {
  const base = publicUser(user);
  if (!base) return null;
  if (actor?.role !== "admin" && base.email) {
    const [name, domain] = String(base.email).split("@");
    base.email = `${name ? name.slice(0, 2) : "**"}***@${domain || "***"}`;
  }
  base.canModerate = canModerateTarget(actor, user);
  base.canDelete = actor?.role === "admin" && user.role !== "admin" && Number(actor.id) !== Number(user.id);
  base.socialRestrictions = parseSocialRestrictions(user.social_restrictions);
  base.profileLocked = !!user.profile_locked;
  base.avatarLocked = !!user.avatar_locked;
  base.passwordResetRequired = !!user.password_reset_required;
  base.staffNote = hasPermission(actor, "users.notes") ? String(user.staff_note || "") : "";
  return base;
}

function pseudoHistory(targetId) {
  return db.prepare(`
    SELECT h.id,h.old_pseudo AS oldPseudo,h.new_pseudo AS newPseudo,h.reason,h.created_at AS createdAt,
           actor.pseudo AS actorPseudo
    FROM user_pseudo_history h
    LEFT JOIN users actor ON actor.id = h.actor_user_id
    WHERE h.user_id = ?
    ORDER BY h.created_at DESC
    LIMIT 20
  `).all(targetId);
}

function moderationHistory(targetId) {
  const actions = db.prepare(`
    SELECT a.*, actor.pseudo AS actor_pseudo, actor.role AS actor_role
    FROM moderation_actions a
    LEFT JOIN users actor ON actor.id = a.actor_user_id
    WHERE a.target_user_id = ?
    ORDER BY a.created_at DESC
    LIMIT 30
  `).all(targetId).map((row) => ({
    id: row.id,
    type: row.type,
    reason: row.reason,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    actor: {
      pseudo: row.actor_pseudo || "Système",
      role: row.actor_role || "moderator"
    }
  }));
  const warnings = db.prepare(`
    SELECT w.*, actor.pseudo AS actor_pseudo, actor.role AS actor_role
    FROM moderation_warnings w
    LEFT JOIN users actor ON actor.id = w.actor_user_id
    WHERE w.target_user_id = ?
    ORDER BY w.created_at DESC
    LIMIT 30
  `).all(targetId).map((row) => ({
    id: `warn-${row.id}`,
    type: "warn",
    reason: row.reason,
    expiresAt: null,
    createdAt: row.created_at,
    actor: {
      pseudo: row.actor_pseudo || "Système",
      role: row.actor_role || "moderator"
    }
  }));
  return actions.concat(warnings)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);
}

function moderationLog({ targetId, actorId, type, reason, expiresAt = null, req = null }) {
  db.prepare(`
    INSERT INTO moderation_actions(target_user_id, actor_user_id, type, reason, expires_at)
    VALUES(?,?,?,?,?)
  `).run(targetId, actorId, type, reason || null, expiresAt || null);
  logCommunity({ userId: actorId, type: "moderation_action", body: type, meta: { targetId, reason: reason || "", expiresAt } });
  auditLog({
    actorId,
    targetId,
    action: `moderation.${type}`,
    entityType: "user",
    entityId: targetId,
    details: { reason: reason || "", expiresAt: expiresAt || null },
    req
  });
}

function queueForcedDisconnect(actor, target, message) {
  return queueAdminCommand({
    actor,
    target,
    type: "kick",
    payload: { message: String(message || "Votre session a été interrompue par l'équipe de modération.").slice(0, 500) }
  });
}

function reportContextForChat(messageId) {
  const anchor = db.prepare("SELECT id FROM chat_messages WHERE id = ?").get(messageId);
  if (!anchor) return [];
  return db.prepare(`
    SELECT m.id,m.body,m.type,m.created_at AS createdAt,m.edited_at AS editedAt,
           u.pseudo AS senderPseudo,u.role AS senderRole
    FROM chat_messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.id BETWEEN ? AND ?
    ORDER BY m.id ASC
  `).all(Math.max(1, Number(anchor.id) - 5), Number(anchor.id) + 5);
}

function reportContextForPrivate(messageId, conversationId) {
  const anchor = db.prepare("SELECT id FROM private_messages WHERE id = ? AND conversation_id = ?").get(messageId, conversationId);
  if (!anchor) return [];
  return db.prepare(`
    SELECT m.id,m.body,m.created_at AS createdAt,m.edited_at AS editedAt,
           u.pseudo AS senderPseudo,u.role AS senderRole
    FROM private_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ? AND m.id BETWEEN ? AND ?
    ORDER BY m.id ASC
  `).all(conversationId, Math.max(1, Number(anchor.id) - 5), Number(anchor.id) + 5);
}

function createMessageReport({ reporterId, targetId, chatMessage = null, privateMessage = null, reason }) {
  const messageSnapshot = chatMessage?.body || privateMessage?.body || "";
  const context = chatMessage
    ? reportContextForChat(chatMessage.id)
    : reportContextForPrivate(privateMessage.id, privateMessage.conversation_id);
  const duplicate = db.prepare(`
    SELECT id FROM message_reports
    WHERE reporter_user_id = ? AND status = 'open'
      AND COALESCE(chat_message_id,0) = COALESCE(?,0)
      AND COALESCE(private_message_id,0) = COALESCE(?,0)
    LIMIT 1
  `).get(reporterId, chatMessage?.id || null, privateMessage?.id || null);
  if (duplicate) return { duplicate: true, id: duplicate.id };
  const info = db.prepare(`
    INSERT INTO message_reports(
      reporter_user_id,target_user_id,chat_message_id,private_message_id,reason,
      priority,workflow_status,message_snapshot,context_snapshot,updated_at
    ) VALUES(?,?,?,?,?,'normal','new',?,?,CURRENT_TIMESTAMP)
  `).run(
    reporterId,
    targetId,
    chatMessage?.id || null,
    privateMessage?.id || null,
    reason,
    messageSnapshot,
    JSON.stringify(context)
  );
  return { duplicate: false, id: Number(info.lastInsertRowid) };
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
    if (PUBLIC_DEPLOYMENT) throw new Error("SMTP non configure en production.");
    console.warn(`[password-reset] SMTP non configure. Lien de test: ${link}`);
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
    if (PUBLIC_DEPLOYMENT) throw new Error("SMTP non configure en production.");
    console.warn(`[email-verification] SMTP non configure. Lien de test: ${link}`);
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
  res.json({ ok: true, service: "pykur-tracker", version: "1.5.0" });
});

app.get("/api/events/living", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(publicLivingEventSchedule());
});

app.post("/api/auth/register", registrationLimiter, asyncRoute(async (req, res) => {
  const pseudo = cleanPseudo(req.body.pseudo);
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!isValidPseudo(pseudo)) return res.status(400).json({ error: "Pseudo invalide : 3 à 24 caractères." });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Email invalide." });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Le mot de passe doit contenir entre 8 et 128 caractères." });

  const existing = db.prepare("SELECT id FROM users WHERE lower(pseudo) = lower(?) OR lower(email) = lower(?) LIMIT 1").get(pseudo, email);
  if (existing) return res.status(409).json({ error: "Pseudo ou email deja utilise." });

  const hash = await bcrypt.hash(password, 12);
  try {
    const created = db.transaction(() => {
      const count = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
      const role = count === 0 ? "admin" : "user";
      const info = db.prepare(`
        INSERT INTO users(pseudo,email,password_hash,role)
        VALUES(?,?,?,?)
      `).run(pseudo, email, hash, role);
      return { id: info.lastInsertRowid, role };
    })();
    const role = created.role;
    const user = getUserById(created.id);
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
}));

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
    db.prepare("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP, last_login_at = CURRENT_TIMESTAMP, presence_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.user_id);
    db.prepare("UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  });
  transaction();
  const user = getUserById(row.user_id);
  announceFirstLogin(user);
  res.json({ token: signUser(user), user: publicUser(user) });
});

app.post("/api/auth/login", loginLimiter, asyncRoute(async (req, res) => {
  purgeExpiredClosedAccounts();
  const identifier = String(req.body.identifier || "").trim();
  const password = String(req.body.password || "");
  if (!identifier || identifier.length > 254 || password.length > 128) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }
  const user = getUserByIdentifier(identifier);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }
  if (user.is_banned && !isExpired(user.ban_until)) {
    const sanction = db.prepare(`
      SELECT reason FROM moderation_actions
      WHERE target_user_id = ? AND type IN ('ban','timeban')
      ORDER BY created_at DESC LIMIT 1
    `).get(user.id);
    const reason = String(sanction?.reason || "").trim();
    const status = user.ban_until ? `Compte banni jusqu'au ${user.ban_until}.` : "Compte banni.";
    return res.status(403).json({ error: reason ? `${status} Motif : ${reason}` : status });
  }
  if (!user.email_verified_at) {
    return res.status(403).json({ error: "Veuillez confirmer votre email avant de vous connecter." });
  }
  if (user.password_reset_required) {
    return res.status(403).json({ error: "La securite de ce compte exige un nouveau mot de passe. Utilisez Mot de passe oublie." });
  }
  db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP, presence_seen_at = CURRENT_TIMESTAMP, deletion_requested_at = NULL WHERE id = ?").run(user.id);
  const refreshed = getUserById(user.id);
  announceFirstLogin(refreshed);
  logCommunity({ userId: refreshed.id, type: "login", body: "Connexion au compte." });
  res.json({ token: signUser(refreshed), user: publicUser(refreshed) });
}));

app.post("/api/auth/password-reset/request", passwordResetLimiter, asyncRoute(async (req, res) => {
  const identifier = cleanIdentifier(req.body.identifier);
  const user = getUserByIdentifier(identifier);
  if (user && !user.is_banned) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL").run(user.id);
    db.prepare(`
      INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)
      VALUES(?,?,?)
    `).run(user.id, tokenHash(token), expiresAt);
    try {
      await sendPasswordResetEmail(user, resetLink(token));
    } catch (error) {
      console.error("[password-reset] Envoi impossible.", error?.message || error);
    }
  }
  res.json({ ok: true, message: "Si un compte correspond, un email de récupération vient d'être envoyé." });
}));

app.post("/api/auth/password-reset/confirm", passwordResetLimiter, asyncRoute(async (req, res) => {
  const token = String(req.body.token || "");
  const newPassword = String(req.body.newPassword || "");
  if (token.length < 32) return res.status(400).json({ error: "Lien de récupération invalide." });
  if (newPassword.length < 8 || newPassword.length > 128) return res.status(400).json({ error: "Le nouveau mot de passe doit contenir entre 8 et 128 caractères." });
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
    db.prepare("UPDATE users SET password_hash = ?, password_reset_required = 0, session_version = session_version + 1, last_login_at = CURRENT_TIMESTAMP, presence_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hash, row.user_id);
    db.prepare("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
  });
  transaction();
  const user = getUserById(row.user_id);
  res.json({ token: signUser(user), user: publicUser(user) });
}));

app.get("/api/auth/me", requireAuth, (req, res) => {
  db.prepare("UPDATE users SET presence_seen_at = CURRENT_TIMESTAMP, deletion_requested_at = NULL WHERE id = ?").run(req.user.id);
  const user = getUserById(req.user.id);
  res.json({ user: publicUser(user), muted: !!user.mute_until, muteUntil: user.mute_until });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  db.prepare("UPDATE users SET presence_seen_at = NULL WHERE id = ?").run(req.user.id);
  res.json({ ok: true });
});

app.post("/api/account/close", requireAuth, (req, res) => {
  if (req.user.role === "admin") return res.status(403).json({ error: "Un admin ne peut pas fermer son compte depuis cette interface." });
  db.prepare("UPDATE users SET deletion_requested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id);
  logCommunity({ userId: req.user.id, type: "account_close_requested", body: "Fermeture de compte demandee." });
  res.json({ ok: true, deletionDelayDays: 30 });
});

app.put("/api/account/email", requireAuth, asyncRoute(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const currentPassword = String(req.body.currentPassword || "");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Email invalide." });
  if (!(await bcrypt.compare(currentPassword, req.user.password_hash))) return res.status(401).json({ error: "Mot de passe actuel incorrect." });
  try {
    db.prepare("UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(email, req.user.id);
    logCommunity({ userId: req.user.id, type: "account_email", body: "Email du compte modifie." });
    res.json({ user: publicUser(getUserById(req.user.id)) });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return res.status(409).json({ error: "Email déjà utilisé." });
    throw error;
  }
}));

app.put("/api/account/password", requireAuth, asyncRoute(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (!(await bcrypt.compare(currentPassword, req.user.password_hash))) return res.status(401).json({ error: "Mot de passe actuel incorrect." });
  if (newPassword.length < 8 || newPassword.length > 128) return res.status(400).json({ error: "Le nouveau mot de passe doit contenir entre 8 et 128 caractères." });
  const hash = await bcrypt.hash(newPassword, 12);
  db.prepare("UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(hash, req.user.id);
  logCommunity({ userId: req.user.id, type: "account_password", body: "Mot de passe modifie." });
  const user = getUserById(req.user.id);
  res.json({ ok: true, token: signUser(user), user: publicUser(user) });
}));

app.put("/api/account/preferences", requireAuth, (req, res) => {
  const preferences = cleanPreferences(req.body.preferences);
  if (req.user.profile_locked) preferences.publicProfile = false;
  db.prepare("UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(JSON.stringify(preferences), req.user.id);
  res.json({ user: publicUser(getUserById(req.user.id)) });
});

app.put("/api/account/avatar", requireAuth, (req, res) => {
  try {
    if (req.user.avatar_locked) return res.status(403).json({ error: "Votre photo de profil est verrouillee par la moderation." });
    const avatarUrl = cleanAvatarUrl(req.body.avatarUrl);
    db.prepare("UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(avatarUrl || null, req.user.id);
    logCommunity({ userId: req.user.id, type: "avatar", body: avatarUrl ? "Photo de profil modifiee." : "Photo de profil supprimee." });
    res.json({ user: publicUser(getUserById(req.user.id)) });
  } catch (error) {
    res.status(400).json({ error: error.message || "Photo de profil invalide." });
  }
});

app.get("/api/account/warnings", requireAuth, (req, res) => {
  const warnings = db.prepare(`
    SELECT w.*, actor.pseudo AS actor_pseudo, actor.role AS actor_role
    FROM moderation_warnings w
    LEFT JOIN users actor ON actor.id = w.actor_user_id
    WHERE w.target_user_id = ?
    ORDER BY w.created_at DESC
    LIMIT 30
  `).all(req.user.id).map((row) => ({
    id: row.id,
    reason: row.reason,
    createdAt: row.created_at,
    actor: {
      pseudo: row.actor_pseudo || "Moderation",
      role: row.actor_role || "moderator"
    }
  }));
  res.json({ warnings });
});

app.put("/api/cloud/save", requireAuth, (req, res) => {
  const incomingPayload = req.body.payload;
  if (!incomingPayload || typeof incomingPayload !== "object" || Array.isArray(incomingPayload)) {
    return res.status(400).json({ error: "Sauvegarde cloud invalide." });
  }
  const nextPayload = Object.assign({}, incomingPayload || {}, {
    savedAt: new Date().toISOString()
  });
  const serializedPayload = JSON.stringify(nextPayload);
  if (Buffer.byteLength(serializedPayload, "utf8") > 1_750_000) {
    return res.status(413).json({ error: "Sauvegarde cloud trop volumineuse." });
  }
  db.prepare(`
    INSERT INTO cloud_saves(user_id,payload,updated_at)
    VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, serializedPayload);
  res.json({ ok: true, payload: nextPayload });
});

app.get("/api/cloud/save", requireAuth, (req, res) => {
  const row = db.prepare("SELECT payload, updated_at FROM cloud_saves WHERE user_id = ?").get(req.user.id);
  res.json({ payload: row ? safeParseJson(row.payload, null) : null, updatedAt: row?.updated_at || null });
});

app.get("/api/account/admin-commands", requireCommandAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, actor.pseudo AS actor_pseudo, actor.role AS actor_role
    FROM admin_commands c
    LEFT JOIN users actor ON actor.id = c.actor_user_id
    WHERE c.target_user_id = ?
      AND (c.status = 'pending' OR (c.status = 'delivered' AND datetime(c.delivered_at) <= datetime('now','-2 minutes')))
    ORDER BY c.created_at ASC
    LIMIT 30
  `).all(req.user.id);
  if (rows.length) {
    const ids = rows.map((row) => Number(row.id));
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(`UPDATE admin_commands SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
    }
  }
  res.json({ commands: rows.map(adminCommandView) });
});

app.post("/api/account/admin-commands/:id/complete", requireCommandAuth, (req, res) => {
  const command = db.prepare("SELECT * FROM admin_commands WHERE id = ? AND target_user_id = ?").get(Number(req.params.id), req.user.id);
  if (!command) return res.status(404).json({ error: "Commande introuvable." });
  if (!["pending", "delivered"].includes(command.status)) {
    return res.status(409).json({ error: "Cette commande est deja terminee." });
  }
  const status = req.body.ok === false ? "failed" : "completed";
  const result = JSON.stringify({ message: String(req.body.message || "").slice(0, 500) });
  db.prepare("UPDATE admin_commands SET status = ?, result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, result, command.id);
  res.json({ ok: true });
});

app.get("/api/community/users", (req, res) => {
  const query = cleanPseudo(req.query.q || "");
  if (query.length < 2) return res.json({ users: [] });
  const rows = db.prepare(`
    SELECT pseudo, role, avatar_url, preferences, created_at, last_login_at, presence_seen_at, is_banned, ban_until
    FROM users
    WHERE email_verified_at IS NOT NULL
      AND is_banned = 0
      AND lower(pseudo) LIKE lower(?)
    ORDER BY pseudo COLLATE NOCASE ASC
    LIMIT 30
  `).all(`%${query}%`);
  const users = rows.slice(0, 12).map(publicCommunityUser);
  res.json({ users });
});

app.get("/api/community/users/:pseudo", optionalAuth, (req, res) => {
  const pseudo = cleanPseudo(req.params.pseudo);
  const user = getUserByPseudo(pseudo);
  if (!user || !user.email_verified_at) return res.status(404).json({ error: "Profil introuvable." });
  if (user.is_banned && !["moderator", "admin"].includes(req.user?.role)) return res.status(404).json({ error: "Profil introuvable." });
  const row = db.prepare("SELECT payload FROM cloud_saves WHERE user_id = ?").get(user.id);
  let payload = null;
  try {
    payload = row ? JSON.parse(row.payload) : null;
  } catch {
    payload = null;
  }
  const moderationView = ["moderator", "admin"].includes(req.user?.role);
  const profile = buildCommunityProfile(user, payload, { moderationView });
  if (!profile) return res.status(404).json({ error: "Profil public désactivé." });
  profile.social = socialProfileMeta(req.user, user, parsePreferences(user.preferences));
  res.json({ profile });
});

function getTargetUserByPseudo(pseudo) {
  const user = getUserByPseudo(pseudo);
  if (!user || user.is_banned || !user.email_verified_at) return null;
  return user;
}

app.get("/api/social/online", requireAuth, (req, res) => {
  db.prepare("UPDATE users SET presence_seen_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id);
  const rows = db.prepare(`
    SELECT pseudo, role, avatar_url, preferences, created_at, last_login_at, presence_seen_at, is_banned, ban_until
    FROM users
    WHERE email_verified_at IS NOT NULL
      AND is_banned = 0
      AND presence_seen_at IS NOT NULL
      AND datetime(presence_seen_at) >= datetime('now','-2 minutes')
    ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,
             presence_seen_at DESC
    LIMIT 80
  `).all().map(publicCommunityUser);
  res.json({ users: rows });
});

app.get("/api/social/chat", requireAuth, (req, res) => {
  db.prepare("UPDATE users SET presence_seen_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id);
  const limit = Math.max(20, Math.min(120, Number(req.query.limit) || 80));
  const rows = db.prepare(`
    ${chatMessageSelect(`m.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM ignored_users i
        WHERE i.user_id = ${Number(req.user.id)} AND i.ignored_user_id = m.user_id
      )`)}
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ?
  `).all(limit).reverse();
  const ignored = db.prepare(`
    SELECT u.pseudo FROM ignored_users i
    JOIN users u ON u.id = i.ignored_user_id
    WHERE i.user_id = ?
    ORDER BY u.pseudo ASC
  `).all(req.user.id).map((row) => row.pseudo);
  res.json({ messages: rows.map((row) => publicChatMessage(row, req.user.id)), settings: chatSettings(), ignored });
});

app.post("/api/social/chat", requireAuth, socialWriteLimiter, (req, res) => {
  db.prepare("UPDATE users SET presence_seen_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id);
  if (req.user.mute_until && !isExpired(req.user.mute_until)) {
    return res.status(403).json({ error: `Vous êtes mute jusqu'au ${req.user.mute_until}.` });
  }
  const type = ["message", "achievement", "pykur"].includes(req.body.type) ? req.body.type : "message";
  const restriction = socialRestrictionError(req.user, type === "message" ? "chat" : "sharing", type === "message" ? "Le chat global est" : "Le partage automatique est");
  if (restriction) return res.status(403).json(restriction);
  const body = String(req.body.body || "").trim();
  const meta = req.body.meta && typeof req.body.meta === "object" ? req.body.meta : {};
  const settings = chatSettings();
  if (type === "message" && settings.locked && !["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "La chatbox est temporairement fermee par l'equipe de moderation." });
  }
  if (type === "message" && Number(settings.slowModeSeconds) > 0 && !["moderator", "admin"].includes(req.user.role)) {
    const last = db.prepare("SELECT created_at FROM chat_messages WHERE user_id = ? AND type = 'message' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1").get(req.user.id);
    if (last) {
      const elapsed = (Date.now() - new Date(String(last.created_at).replace(" ", "T") + "Z").getTime()) / 1000;
      if (elapsed < Number(settings.slowModeSeconds)) return res.status(429).json({ error: `Mode lent actif. Attendez encore ${Math.ceil(Number(settings.slowModeSeconds) - elapsed)}s.` });
    }
  }
  if (body.length < 1) return res.status(400).json({ error: "Message vide." });
  if (body.length > 500) return res.status(400).json({ error: "Message trop long." });
  const shareError = shareLimitError(req.user.id, type, meta);
  if (shareError) return res.status(429).json({ error: shareError });
  const result = db.prepare(`
    INSERT INTO chat_messages(user_id,type,body,meta)
    VALUES(?,?,?,?)
  `).run(req.user.id, type, body, JSON.stringify(meta));
  logCommunity({ userId: req.user.id, type: type === "message" ? "chat_message" : `share_${type}`, body, meta });
  const row = db.prepare(`${chatMessageSelect("m.id = ?")}`).get(result.lastInsertRowid);
  res.json({ message: publicChatMessage(row, req.user.id) });
});

app.patch("/api/social/chat/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const body = String(req.body.body || "").trim();
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Message invalide." });
  if (body.length < 1) return res.status(400).json({ error: "Message vide." });
  if (body.length > 500) return res.status(400).json({ error: "Message trop long." });
  const row = db.prepare("SELECT * FROM chat_messages WHERE id = ? AND deleted_at IS NULL").get(id);
  if (!row) return res.status(404).json({ error: "Message introuvable." });
  if (row.type !== "message") return res.status(403).json({ error: "Un partage automatique ne peut pas être modifié." });
  if (Number(row.user_id) !== Number(req.user.id)) return res.status(403).json({ error: "Vous pouvez uniquement modifier vos propres messages." });
  db.prepare("UPDATE chat_messages SET body = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?").run(body, id);
  const updated = db.prepare(`${chatMessageSelect("m.id = ?")}`).get(id);
  res.json({ message: publicChatMessage(updated, req.user.id) });
});

app.delete("/api/social/chat/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Message invalide." });
  const row = db.prepare("SELECT * FROM chat_messages WHERE id = ? AND deleted_at IS NULL").get(id);
  if (!row) return res.status(404).json({ error: "Message introuvable." });
  if (Number(row.user_id) !== Number(req.user.id) && !["moderator", "admin"].includes(req.user.role)) return res.status(403).json({ error: "Suppression non autorisee." });
  db.prepare("UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP, deleted_by_user_id = ? WHERE id = ?").run(req.user.id, id);
  res.json({ ok: true });
});

app.post("/api/social/chat/:id/report", requireAuth, socialReportLimiter, (req, res) => {
  const id = Number(req.params.id);
  const reason = String(req.body.reason || "").trim().slice(0, 300);
  const row = db.prepare("SELECT * FROM chat_messages WHERE id = ? AND deleted_at IS NULL").get(id);
  if (!row) return res.status(404).json({ error: "Message introuvable." });
  if (Number(row.user_id) === Number(req.user.id)) return res.status(400).json({ error: "Impossible de signaler votre propre message." });
  const report = createMessageReport({
    reporterId: req.user.id,
    targetId: row.user_id,
    chatMessage: row,
    reason: reason || "Signalement chatbox"
  });
  if (report.duplicate) return res.status(409).json({ error: "Ce message est deja signale et en cours de traitement." });
  logCommunity({ userId: req.user.id, type: "report_chat", body: "Signalement chatbox.", meta: { messageId: id, targetId: row.user_id } });
  res.json({ ok: true });
});

app.post("/api/social/ignore/:pseudo", requireAuth, (req, res) => {
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (Number(target.id) === Number(req.user.id)) return res.status(400).json({ error: "Impossible de vous ignorer vous-meme." });
  db.prepare("INSERT OR IGNORE INTO ignored_users(user_id,ignored_user_id) VALUES(?,?)").run(req.user.id, target.id);
  res.json({ ok: true });
});

app.delete("/api/social/ignore/:pseudo", requireAuth, (req, res) => {
  const target = getUserByPseudo(req.params.pseudo);
  if (target) db.prepare("DELETE FROM ignored_users WHERE user_id = ? AND ignored_user_id = ?").run(req.user.id, target.id);
  res.json({ ok: true });
});

app.get("/api/social/friends", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT f.*, ua.pseudo AS user_a_pseudo, ua.role AS user_a_role, ua.avatar_url AS user_a_avatar_url, ua.created_at AS user_a_created_at,
           ua.last_login_at AS user_a_last_login_at, ua.presence_seen_at AS user_a_presence_seen_at, ua.is_banned AS user_a_is_banned, ua.ban_until AS user_a_ban_until,
           ub.pseudo AS user_b_pseudo, ub.role AS user_b_role, ub.avatar_url AS user_b_avatar_url, ub.created_at AS user_b_created_at,
           ub.last_login_at AS user_b_last_login_at, ub.presence_seen_at AS user_b_presence_seen_at, ub.is_banned AS user_b_is_banned, ub.ban_until AS user_b_ban_until
    FROM friendships f
    JOIN users ua ON ua.id = f.user_a_id
    JOIN users ub ON ub.id = f.user_b_id
    WHERE f.user_a_id = ? OR f.user_b_id = ?
    ORDER BY f.updated_at DESC
  `).all(req.user.id, req.user.id);
  const result = { friends: [], incoming: [], outgoing: [] };
  rows.forEach((row) => {
    const otherIsA = Number(row.user_a_id) !== Number(req.user.id);
    const otherBanned = !!(otherIsA ? row.user_a_is_banned : row.user_b_is_banned);
    const other = {
      pseudo: otherIsA ? row.user_a_pseudo : row.user_b_pseudo,
      role: otherIsA ? row.user_a_role : row.user_b_role,
      avatarUrl: otherIsA ? row.user_a_avatar_url : row.user_b_avatar_url,
      createdAt: otherIsA ? row.user_a_created_at : row.user_b_created_at,
      lastLoginAt: otherIsA ? row.user_a_last_login_at : row.user_b_last_login_at,
      isOnline: !otherBanned && isRecentlyOnline(otherIsA ? row.user_a_presence_seen_at : row.user_b_presence_seen_at),
      isBanned: otherBanned,
      banUntil: otherIsA ? row.user_a_ban_until : row.user_b_ban_until
    };
    const item = { user: other, createdAt: row.created_at, updatedAt: row.updated_at };
    if (row.status === "accepted") result.friends.push(item);
    else if (Number(row.requester_id) === Number(req.user.id)) result.outgoing.push(item);
    else result.incoming.push(item);
  });
  res.json(result);
});

app.post("/api/social/friends/:pseudo/request", requireAuth, (req, res) => {
  const restriction = socialRestrictionError(req.user, "friendRequests", "L'envoi de demandes d'ami est");
  if (restriction) return res.status(403).json(restriction);
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (Number(target.id) === Number(req.user.id)) return res.status(400).json({ error: "Impossible de vous ajouter vous-même." });
  const pair = friendshipPair(req.user.id, target.id);
  const existing = getFriendshipBetween(req.user.id, target.id);
  if (existing?.status === "accepted") return res.json({ status: "friends" });
  if (existing?.status === "pending") {
    if (Number(existing.requester_id) !== Number(req.user.id)) {
      db.prepare("UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(existing.id);
      return res.json({ status: "friends" });
    }
    return res.json({ status: "pending_sent" });
  }
  db.prepare(`
    INSERT INTO friendships(user_a_id,user_b_id,requester_id,status)
    VALUES(?,?,?,'pending')
  `).run(pair.userA, pair.userB, req.user.id);
  res.json({ status: "pending_sent" });
});

app.post("/api/social/friends/:pseudo/accept", requireAuth, (req, res) => {
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  const friendship = getFriendshipBetween(req.user.id, target.id);
  if (!friendship || friendship.status !== "pending" || Number(friendship.requester_id) === Number(req.user.id)) {
    return res.status(400).json({ error: "Aucune demande reçue à accepter." });
  }
  db.prepare("UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(friendship.id);
  res.json({ status: "friends" });
});

app.post("/api/social/friends/:pseudo/reject", requireAuth, (req, res) => {
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  const friendship = getFriendshipBetween(req.user.id, target.id);
  if (!friendship || friendship.status !== "pending") return res.status(400).json({ error: "Aucune demande à refuser." });
  db.prepare("DELETE FROM friendships WHERE id = ?").run(friendship.id);
  res.json({ status: "none" });
});

app.delete("/api/social/friends/:pseudo", requireAuth, (req, res) => {
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  const friendship = getFriendshipBetween(req.user.id, target.id);
  if (friendship) db.prepare("DELETE FROM friendships WHERE id = ?").run(friendship.id);
  res.json({ status: "none" });
});

app.get("/api/social/messages", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, ua.pseudo AS user_a_pseudo, ua.role AS user_a_role, ua.avatar_url AS user_a_avatar_url, ua.created_at AS user_a_created_at,
           ua.last_login_at AS user_a_last_login_at, ua.presence_seen_at AS user_a_presence_seen_at, ua.is_banned AS user_a_is_banned, ua.ban_until AS user_a_ban_until,
           ub.pseudo AS user_b_pseudo, ub.role AS user_b_role, ub.avatar_url AS user_b_avatar_url, ub.created_at AS user_b_created_at,
           ub.last_login_at AS user_b_last_login_at, ub.presence_seen_at AS user_b_presence_seen_at, ub.is_banned AS user_b_is_banned, ub.ban_until AS user_b_ban_until,
           m.id AS last_message_id, m.sender_id AS last_sender_id,
           m.body AS last_body, m.created_at AS last_message_at, s.pseudo AS last_sender_pseudo
    FROM private_conversations c
    JOIN users ua ON ua.id = c.user_a_id
    JOIN users ub ON ub.id = c.user_b_id
    LEFT JOIN private_messages m ON m.id = (
      SELECT id FROM private_messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    )
    LEFT JOIN users s ON s.id = m.sender_id
    WHERE c.user_a_id = ? OR c.user_b_id = ?
    ORDER BY COALESCE(m.created_at,c.updated_at) DESC
    LIMIT 50
  `).all(req.user.id, req.user.id);
  const conversations = rows.map((row) => {
    const readMessageId = Number(row.user_a_id) === Number(req.user.id) ? Number(row.user_a_read_message_id || 0) : Number(row.user_b_read_message_id || 0);
    const unread = !!row.last_message_id
      && Number(row.last_sender_id) !== Number(req.user.id)
      && Number(row.last_message_id) > readMessageId;
    return {
      id: row.id,
      other: conversationOtherUser(row, req.user.id),
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
      unread,
      lastMessage: row.last_body ? {
        id: row.last_message_id,
        body: row.last_body,
        createdAt: row.last_message_at,
        senderPseudo: row.last_sender_pseudo
      } : null
    };
  });
  res.json({ conversations, unreadCount: conversations.filter((item) => item.unread).length });
});

app.post("/api/social/messages/read-all", requireAuth, (req, res) => {
  db.prepare(`UPDATE private_conversations SET user_a_read_at = CURRENT_TIMESTAMP, user_a_read_message_id = COALESCE((SELECT MAX(id) FROM private_messages WHERE conversation_id = private_conversations.id),0) WHERE user_a_id = ?`).run(req.user.id);
  db.prepare(`UPDATE private_conversations SET user_b_read_at = CURRENT_TIMESTAMP, user_b_read_message_id = COALESCE((SELECT MAX(id) FROM private_messages WHERE conversation_id = private_conversations.id),0) WHERE user_b_id = ?`).run(req.user.id);
  res.json({ ok: true });
});

app.post("/api/social/messages/:pseudo", requireAuth, socialWriteLimiter, (req, res) => {
  const restriction = socialRestrictionError(req.user, "privateMessages", "La messagerie privee est");
  if (restriction) return res.status(403).json(restriction);
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canMessageUser(req.user, target)) return res.status(403).json({ error: "Vous devez être amis et les messages privés doivent être autorisés." });
  const conversation = getOrCreatePrivateConversation(req.user.id, target.id);
  const body = String(req.body.body || "").trim();
  if (body.length < 1) return res.status(400).json({ error: "Message vide." });
  if (body.length > 1000) return res.status(400).json({ error: "Message trop long." });
  db.prepare(`
    INSERT INTO private_messages(conversation_id,sender_id,body)
    VALUES(?,?,?)
  `).run(conversation.id, req.user.id, body);
  db.prepare("UPDATE private_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversation.id);
  logCommunity({ userId: req.user.id, type: "private_message", body: "Message prive envoye.", meta: { to: target.pseudo } });
  res.json({ conversationId: conversation.id });
});

app.patch("/api/social/messages/:pseudo/:id", requireAuth, (req, res) => {
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canMessageUser(req.user, target)) return res.status(403).json({ error: "Vous devez etre amis pour modifier cette conversation." });
  const conversation = getOrCreatePrivateConversation(req.user.id, target.id);
  const id = Number(req.params.id);
  const body = String(req.body.body || "").trim();
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Message invalide." });
  if (body.length < 1) return res.status(400).json({ error: "Message vide." });
  if (body.length > 1000) return res.status(400).json({ error: "Message trop long." });
  const row = db.prepare("SELECT * FROM private_messages WHERE id = ? AND conversation_id = ? AND deleted_at IS NULL").get(id, conversation.id);
  if (!row) return res.status(404).json({ error: "Message introuvable." });
  if (Number(row.sender_id) !== Number(req.user.id)) return res.status(403).json({ error: "Modification non autorisee." });
  db.prepare("UPDATE private_messages SET body = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?").run(body, id);
  res.json({ ok: true });
});

app.delete("/api/social/messages/:pseudo/:id", requireAuth, (req, res) => {
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canMessageUser(req.user, target)) return res.status(403).json({ error: "Vous devez etre amis pour modifier cette conversation." });
  const conversation = getOrCreatePrivateConversation(req.user.id, target.id);
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM private_messages WHERE id = ? AND conversation_id = ? AND deleted_at IS NULL").get(id, conversation.id);
  if (!row) return res.status(404).json({ error: "Message introuvable." });
  if (Number(row.sender_id) !== Number(req.user.id)) return res.status(403).json({ error: "Suppression non autorisee." });
  db.prepare("UPDATE private_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.post("/api/social/messages/:pseudo/:id/report", requireAuth, socialReportLimiter, (req, res) => {
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canMessageUser(req.user, target)) return res.status(403).json({ error: "Vous devez etre amis pour signaler cette conversation." });
  const conversation = getOrCreatePrivateConversation(req.user.id, target.id);
  const id = Number(req.params.id);
  const reason = String(req.body.reason || "").trim().slice(0, 300);
  const row = db.prepare("SELECT * FROM private_messages WHERE id = ? AND conversation_id = ? AND deleted_at IS NULL").get(id, conversation.id);
  if (!row) return res.status(404).json({ error: "Message introuvable." });
  if (Number(row.sender_id) === Number(req.user.id)) return res.status(400).json({ error: "Impossible de signaler votre propre message." });
  const report = createMessageReport({
    reporterId: req.user.id,
    targetId: row.sender_id,
    privateMessage: row,
    reason: reason || "Signalement message prive"
  });
  if (report.duplicate) return res.status(409).json({ error: "Ce message est deja signale et en cours de traitement." });
  logCommunity({ userId: req.user.id, type: "report_private", body: "Signalement message prive.", meta: { messageId: id, targetId: row.sender_id } });
  res.json({ ok: true });
});

app.get("/api/social/messages/:pseudo", requireAuth, (req, res) => {
  const target = getTargetUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canMessageUser(req.user, target)) return res.status(403).json({ error: "Vous devez être amis pour consulter cette conversation." });
  const conversation = getOrCreatePrivateConversation(req.user.id, target.id);
  const isUserA = Number(conversation.user_a_id) === Number(req.user.id);
  const readAtColumn = isUserA ? "user_a_read_at" : "user_b_read_at";
  const readIdColumn = isUserA ? "user_a_read_message_id" : "user_b_read_message_id";
  db.prepare(`UPDATE private_conversations SET ${readAtColumn} = CURRENT_TIMESTAMP, ${readIdColumn} = COALESCE((SELECT MAX(id) FROM private_messages WHERE conversation_id = ?),0) WHERE id = ?`).run(conversation.id, conversation.id);
  const rows = db.prepare(`
    SELECT m.*, u.pseudo AS sender_pseudo, u.role AS sender_role
    FROM private_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ? AND m.deleted_at IS NULL
    ORDER BY m.created_at ASC, m.id ASC
    LIMIT 100
  `).all(conversation.id);
  res.json({
    conversation: {
      id: conversation.id,
      other: publicCommunityUser(target),
      messages: rows.map((row) => publicMessage(row, req.user.id))
    }
  });
});

app.get("/api/admin/console", requireAuth, requireRole("moderator"), requirePermission("console.view"), (req, res) => {
  const schedule = publicLivingEventSchedule();
  const recentCommands = db.prepare(`
    SELECT c.*, actor.pseudo AS actor_pseudo, actor.role AS actor_role,
           target.pseudo AS target_pseudo, target.role AS target_role
    FROM admin_commands c
    LEFT JOIN users actor ON actor.id = c.actor_user_id
    LEFT JOIN users target ON target.id = c.target_user_id
    ORDER BY c.created_at DESC LIMIT 40
  `).all().map(adminCommandView);
  res.json({
    role: req.user.role,
    permissions: adminPermissions(req.user),
    eventSchedule: schedule,
    metrics: {
      users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
      online: db.prepare("SELECT COUNT(*) AS count FROM users WHERE datetime(last_login_at) >= datetime('now','-5 minutes') AND is_banned = 0").get().count,
      pendingCommands: db.prepare("SELECT COUNT(*) AS count FROM admin_commands WHERE status IN ('pending','delivered')").get().count,
      openReports: db.prepare("SELECT COUNT(*) AS count FROM message_reports WHERE status = 'open'").get().count
    },
    recentCommands
  });
});

app.post("/api/admin/broadcast", requireAuth, requireRole("moderator"), requirePermission("notifications.send"), (req, res) => {
  const message = String(req.body.message || "").trim().slice(0, 500);
  const mode = ["notification", "info", "popup"].includes(String(req.body.mode || ""))
    ? String(req.body.mode)
    : "notification";
  if (!message) return res.status(400).json({ error: "Message requis." });

  const users = db.prepare(`
    SELECT id,pseudo,role
    FROM users
    WHERE is_banned = 0
      AND email_verified_at IS NOT NULL
      AND presence_seen_at IS NOT NULL
      AND datetime(presence_seen_at) >= datetime('now','-2 minutes')
    ORDER BY id ASC
  `).all();
  const commandType = mode === "popup" ? "popup-message" : "notification";
  const payload = {
    message,
    level: mode === "info" ? "info" : "announcement",
    broadcast: true
  };
  const queueBroadcast = db.transaction((targets) => {
    targets.forEach((target) => queueAdminCommand({ actor: req.user, target, type: commandType, payload }));
  });
  queueBroadcast(users);
  logCommunity({
    userId: req.user.id,
    type: "admin_broadcast",
    body: message,
    meta: { mode, recipients: users.length }
  });
  res.status(201).json({ ok: true, recipients: users.length, mode });
});

app.get("/api/admin/users/:pseudo/control", requireAuth, requireRole("moderator"), requirePermission("users.view"), (req, res) => {
  const target = getUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  const save = db.prepare("SELECT payload,updated_at FROM cloud_saves WHERE user_id = ?").get(target.id);
  const payload = safeParseJson(save?.payload, null);
  const profiles = Object.entries(payload?.store?.profiles || {}).map(([id, profile]) => ({
    id,
    name: String(profile?.name || "Profil sans nom").slice(0, 80),
    pp: cloudProfilePP(profile?.data),
    morose: Number(profile?.data?.runs?.morose || 0),
    tynril: Number(profile?.data?.runs?.tynril || 0),
    active: id === payload?.store?.active
  }));
  const achievementIds = new Set();
  const galleryEvents = new Map();
  const galleryPykurs = new Map();
  achievementSources(payload?.store || {}).forEach((source) => {
    Object.keys(source?.unlocked || {}).forEach((id) => achievementIds.add(id));
  });
  gallerySources(payload?.store || {}).forEach((source) => {
    Object.entries(source?.eventsDiscovered || {}).forEach(([id, item]) => {
      if (item) galleryEvents.set(id, { id, count: Number(item.count) || 1 });
    });
    (Array.isArray(source?.completedPykurs) ? source.completedPykurs : []).forEach((item) => {
      if (item?.id) galleryPykurs.set(String(item.id), {
        id: String(item.id),
        number: Number(item.number) || 0,
        profileName: String(item.profileName || "Profil"),
        pp: Number(item.pp) || 0,
        finishedAt: item.finishedAt || null
      });
    });
  });
  const commands = db.prepare(`
    SELECT c.*, actor.pseudo AS actor_pseudo, actor.role AS actor_role,
           target.pseudo AS target_pseudo, target.role AS target_role
    FROM admin_commands c
    LEFT JOIN users actor ON actor.id = c.actor_user_id
    LEFT JOIN users target ON target.id = c.target_user_id
    WHERE c.target_user_id = ? ORDER BY c.created_at DESC LIMIT 25
  `).all(target.id).map(adminCommandView);
  res.json({
    user: moderationUserView(target, req.user),
    profiles,
    achievements: [...achievementIds].sort(),
    galleryEvents: [...galleryEvents.values()].sort((a, b) => a.id.localeCompare(b.id)),
    galleryPykurs: [...galleryPykurs.values()].sort((a, b) => (a.number || 0) - (b.number || 0)),
    cloudUpdatedAt: save?.updated_at || null,
    history: moderationHistory(target.id),
    commands,
    permissions: adminPermissions(req.user)
  });
});

app.post("/api/admin/users/:id/commands", requireAuth, requireRole("moderator"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (Number(target.id) === Number(req.user.id) && req.body.type !== "notification") {
    return res.status(400).json({ error: "Cette action ne peut pas cibler votre propre compte." });
  }
  const type = String(req.body.type || "");
  const payload = req.body.payload && typeof req.body.payload === "object" ? req.body.payload : {};
  const moderatorTypes = new Set(["notification", "popup-message", "kick", "living-event"]);
  const adminTypes = new Set([
    "notification", "living-event", "reset-gallery", "reset-achievements",
    "reset-profile", "reset-pykur", "delete-profile", "rename-profile",
    "remove-achievement", "remove-gallery-event", "remove-gallery-pykur",
    "popup-message", "kick", "recalculate-achievements", "repair-progression"
  ]);
  const allowed = req.user.role === "admin" ? adminTypes : moderatorTypes;
  if (!allowed.has(type)) return res.status(403).json({ error: "Action non autorisee pour votre role." });
  const permissionByType = {
    notification: "notifications.send",
    "popup-message": "notifications.send",
    kick: "users.ban",
    "living-event": "events.target",
    "reset-gallery": "gallery.manage",
    "reset-achievements": "achievements.manage",
    "recalculate-achievements": "achievements.manage",
    "reset-profile": "tracker.reset",
    "reset-pykur": "tracker.reset",
    "repair-progression": "tracker.reset",
    "delete-profile": "profiles.manage",
    "rename-profile": "profiles.manage",
    "remove-achievement": "achievements.manage",
    "remove-gallery-event": "gallery.manage",
    "remove-gallery-pykur": "gallery.manage"
  };
  if (!adminPermissions(req.user).includes(permissionByType[type])) {
    return res.status(403).json({ error: "Permission insuffisante.", permission: permissionByType[type] });
  }
  if (Number(target.id) !== Number(req.user.id) && !canModerateTarget(req.user, target)) {
    return res.status(403).json({ error: "Vous ne pouvez pas agir sur ce role." });
  }
  if (type === "living-event" && !LIVING_EVENT_CATALOG.some((event) => event.id === payload.eventId)) {
    return res.status(400).json({ error: "Evenement inconnu." });
  }
  if (["reset-profile", "reset-pykur", "delete-profile", "rename-profile"].includes(type) && !String(payload.profileId || "")) {
    return res.status(400).json({ error: "Profil cible requis." });
  }
  if (["notification", "popup-message", "kick"].includes(type)) {
    payload.message = String(payload.message || "").trim().slice(0, 500);
    if (!payload.message) return res.status(400).json({ error: "Message requis." });
  }
  if (type === "rename-profile") {
    payload.name = String(payload.name || "").trim().slice(0, 80);
    if (!payload.name) return res.status(400).json({ error: "Nouveau nom requis." });
  }
  if (type === "remove-achievement" && !String(payload.achievementId || "")) return res.status(400).json({ error: "Succès cible requis." });
  if (type === "remove-gallery-event" && !String(payload.eventId || "")) return res.status(400).json({ error: "Événement cible requis." });
  if (type === "remove-gallery-pykur" && !String(payload.pykurId || "")) return res.status(400).json({ error: "Pykur archivé cible requis." });
  if (["reset-gallery", "reset-achievements", "reset-profile", "reset-pykur", "delete-profile", "rename-profile", "remove-achievement", "remove-gallery-event", "remove-gallery-pykur"].includes(type)) {
    try {
      applyCloudAdminMutation(target.id, type, payload);
    } catch (error) {
      return res.status(400).json({ error: error.message || "Modification cloud impossible." });
    }
  }
  const id = queueAdminCommand({ actor: req.user, target, type, payload });
  res.status(201).json({ ok: true, commandId: id });
});

app.post("/api/admin/events/force", requireAuth, requireRole("admin"), requirePermission("events.configure"), (req, res) => {
  const event = LIVING_EVENT_CATALOG.find((item) => item.id === String(req.body.eventId || ""));
  if (!event) return res.status(400).json({ error: "Evenement inconnu." });
  const current = db.prepare("SELECT sequence FROM living_event_schedule WHERE id = 1").get();
  const startsAt = Date.now() + Math.max(0, Math.min(300, Number(req.body.delaySeconds) || 0)) * 1000;
  const endsAt = startsAt + event.duration;
  db.prepare(`
    INSERT INTO living_event_schedule(id,sequence,event_id,starts_at,ends_at)
    VALUES(1,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET sequence=excluded.sequence,event_id=excluded.event_id,
      starts_at=excluded.starts_at,ends_at=excluded.ends_at,updated_at=CURRENT_TIMESTAMP
  `).run(Number(current?.sequence || 0) + 1, event.id, startsAt, endsAt);
  logCommunity({ userId: req.user.id, type: "event_force", body: event.id, meta: { startsAt } });
  res.json(publicLivingEventSchedule());
});

app.put("/api/admin/events/settings", requireAuth, requireRole("admin"), requirePermission("events.configure"), (req, res) => {
  const min = Math.max(30, Math.min(86400, Math.round(Number(req.body.minCooldownSeconds) || 600)));
  const max = Math.max(min, Math.min(172800, Math.round(Number(req.body.maxCooldownSeconds) || 1500)));
  const paused = req.body.paused ? 1 : 0;
  db.prepare(`UPDATE living_event_settings SET paused=?,min_cooldown_seconds=?,max_cooldown_seconds=?,updated_by_user_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`)
    .run(paused, min, max, req.user.id);
  if (!paused && req.body.reschedule) {
    const current = db.prepare("SELECT sequence FROM living_event_schedule WHERE id=1").get();
    createLivingEventSchedule(current?.sequence || 0);
  }
  logCommunity({ userId: req.user.id, type: "event_settings", body: paused ? "paused" : "active", meta: { min, max } });
  res.json(publicLivingEventSchedule());
});

app.post("/api/admin/commands/:id/cancel", requireAuth, requireRole("admin"), (req, res) => {
  const command = db.prepare("SELECT * FROM admin_commands WHERE id = ?").get(Number(req.params.id));
  if (!command) return res.status(404).json({ error: "Commande introuvable." });
  if (!['pending','delivered'].includes(command.status)) return res.status(409).json({ error: "Commande deja terminee." });
  db.prepare("UPDATE admin_commands SET status='cancelled',completed_at=CURRENT_TIMESTAMP,result=? WHERE id=?")
    .run(JSON.stringify({ message: String(req.body.reason || "Annulee par un administrateur").slice(0, 300) }), command.id);
  res.json({ ok: true });
});

app.get("/api/admin/staff-permissions", requireAuth, requireRole("admin"), requirePermission("permissions.manage"), (req, res) => {
  const staff = db.prepare(`
    SELECT id,pseudo,role,avatar_url
    FROM users
    WHERE role IN ('moderator','admin')
    ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END,pseudo COLLATE NOCASE
  `).all().map((user) => ({
    id: Number(user.id),
    pseudo: user.pseudo,
    role: user.role,
    avatarUrl: user.avatar_url || "",
    basePermissions: baseAdminPermissions(user.role),
    permissions: adminPermissions(user),
    editable: user.role === "moderator"
  }));
  res.json({ catalog: ADMIN_PERMISSION_CATALOG, staff });
});

app.put("/api/admin/staff-permissions/:id", requireAuth, requireRole("admin"), requirePermission("permissions.manage"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Membre du staff introuvable." });
  if (target.role !== "moderator") return res.status(400).json({ error: "Seules les permissions des moderateurs sont personnalisables." });
  const requested = new Set(Array.isArray(req.body.permissions) ? req.body.permissions.map(String) : []);
  const known = new Set(ALL_ADMIN_PERMISSIONS);
  for (const permission of requested) {
    if (!known.has(permission)) return res.status(400).json({ error: `Permission inconnue : ${permission}` });
  }
  const before = adminPermissions(target);
  const base = new Set(baseAdminPermissions(target.role));
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM staff_permission_overrides WHERE user_id = ?").run(target.id);
    const insert = db.prepare(`
      INSERT INTO staff_permission_overrides(user_id,permission,allowed,updated_by_user_id,updated_at)
      VALUES(?,?,?,?,CURRENT_TIMESTAMP)
    `);
    ADMIN_PERMISSION_CATALOG.forEach(({ id }) => {
      const desired = requested.has(id);
      if (desired !== base.has(id)) insert.run(target.id, id, desired ? 1 : 0, req.user.id);
    });
  });
  transaction();
  const after = adminPermissions(target);
  auditLog({
    actorId: req.user.id,
    targetId: target.id,
    action: "staff.permissions.update",
    entityType: "user",
    entityId: target.id,
    details: { before, after },
    req
  });
  res.json({ userId: target.id, permissions: after });
});

app.get("/api/moderation/users", requireAuth, requireRole("moderator"), requirePermission("users.view"), (req, res) => {
  db.prepare("UPDATE users SET is_banned = 0, ban_until = NULL WHERE is_banned = 1 AND ban_until IS NOT NULL AND datetime(ban_until) <= datetime('now')").run();
  db.prepare("UPDATE users SET mute_until = NULL WHERE mute_until IS NOT NULL AND datetime(mute_until) <= datetime('now')").run();
  const users = db.prepare(`
    SELECT id,pseudo,email,role,avatar_url,is_banned,ban_until,mute_until,created_at,last_login_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 200
  `).all().map(publicUser);
  res.json({ users });
});

function moderationReportView(row) {
  const savedContext = safeParseJson(row.context_snapshot, null);
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    priority: row.priority || "normal",
    workflowStatus: row.workflow_status || (row.status === "resolved" ? "resolved" : "new"),
    internalNote: row.internal_note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    resolvedAt: row.resolved_at,
    resolutionAction: row.resolution_action || "",
    resolutionNote: row.resolution_note || "",
    type: row.chat_message_id ? "chatbox" : "message prive",
    body: row.message_snapshot || row.chat_body || row.private_body || "",
    context: Array.isArray(savedContext) ? savedContext : (row.private_conversation_id ? db.prepare(`
      SELECT m.id, m.body, m.created_at AS createdAt, m.edited_at AS editedAt, u.pseudo AS senderPseudo, u.role AS senderRole
      FROM private_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 12
    `).all(row.private_conversation_id).reverse() : (row.chat_message_id ? reportContextForChat(row.chat_message_id) : [])),
    reporter: { pseudo: row.reporter_pseudo, role: row.reporter_role },
    target: row.target_pseudo ? { pseudo: row.target_pseudo, role: row.target_role } : null,
    assignedTo: row.assignee_pseudo ? { id: row.assigned_to_user_id, pseudo: row.assignee_pseudo, role: row.assignee_role } : null,
    resolvedBy: row.resolver_pseudo ? { pseudo: row.resolver_pseudo, role: row.resolver_role } : null
  };
}

app.get("/api/moderation/overview", requireAuth, requireRole("moderator"), requirePermission("console.view"), (req, res) => {
  const permissions = adminPermissions(req.user);
  db.prepare("UPDATE users SET is_banned = 0, ban_until = NULL WHERE is_banned = 1 AND ban_until IS NOT NULL AND datetime(ban_until) <= datetime('now')").run();
  db.prepare("UPDATE users SET mute_until = NULL WHERE mute_until IS NOT NULL AND datetime(mute_until) <= datetime('now')").run();
  const banned = db.prepare(`
    SELECT id,pseudo,email,role,avatar_url,is_banned,ban_until,mute_until,created_at,last_login_at
    FROM users
    WHERE is_banned = 1
    ORDER BY COALESCE(ban_until,'9999-12-31') DESC, updated_at DESC
    LIMIT 100
  `).all().map((user) => moderationUserView(user, req.user));
  const muted = db.prepare(`
    SELECT id,pseudo,email,role,avatar_url,is_banned,ban_until,mute_until,created_at,last_login_at
    FROM users
    WHERE mute_until IS NOT NULL AND datetime(mute_until) > datetime('now')
    ORDER BY mute_until DESC
    LIMIT 100
  `).all().map((user) => moderationUserView(user, req.user));
  const moderators = db.prepare(`
    SELECT id,pseudo,email,role,avatar_url,is_banned,ban_until,mute_until,created_at,last_login_at
    FROM users
    WHERE role IN ('moderator','admin')
    ORDER BY role DESC, pseudo ASC
    LIMIT 100
  `).all().map((user) => moderationUserView(user, req.user));
  const users = db.prepare(`
    SELECT id,pseudo,email,role,avatar_url,is_banned,ban_until,mute_until,created_at,last_login_at
    FROM users
    ORDER BY pseudo COLLATE NOCASE ASC
    LIMIT 300
  `).all().map((user) => moderationUserView(user, req.user));
  const reports = db.prepare(`
    SELECT r.*, reporter.pseudo AS reporter_pseudo, reporter.role AS reporter_role,
           target.pseudo AS target_pseudo, target.role AS target_role,
           resolver.pseudo AS resolver_pseudo, resolver.role AS resolver_role,
           assignee.pseudo AS assignee_pseudo, assignee.role AS assignee_role,
           cm.body AS chat_body, pm.body AS private_body, pm.conversation_id AS private_conversation_id
    FROM message_reports r
    JOIN users reporter ON reporter.id = r.reporter_user_id
    LEFT JOIN users target ON target.id = r.target_user_id
    LEFT JOIN users resolver ON resolver.id = r.resolved_by_user_id
    LEFT JOIN users assignee ON assignee.id = r.assigned_to_user_id
    LEFT JOIN chat_messages cm ON cm.id = r.chat_message_id
    LEFT JOIN private_messages pm ON pm.id = r.private_message_id
    WHERE r.status = 'open'
    ORDER BY r.created_at DESC
    LIMIT 100
  `).all().map(moderationReportView);
  const resolvedReports = db.prepare(`
    SELECT r.*, reporter.pseudo AS reporter_pseudo, reporter.role AS reporter_role,
           target.pseudo AS target_pseudo, target.role AS target_role,
           resolver.pseudo AS resolver_pseudo, resolver.role AS resolver_role,
           assignee.pseudo AS assignee_pseudo, assignee.role AS assignee_role,
           cm.body AS chat_body, pm.body AS private_body, pm.conversation_id AS private_conversation_id
    FROM message_reports r
    JOIN users reporter ON reporter.id = r.reporter_user_id
    LEFT JOIN users target ON target.id = r.target_user_id
    LEFT JOIN users resolver ON resolver.id = r.resolved_by_user_id
    LEFT JOIN users assignee ON assignee.id = r.assigned_to_user_id
    LEFT JOIN chat_messages cm ON cm.id = r.chat_message_id
    LEFT JOIN private_messages pm ON pm.id = r.private_message_id
    WHERE r.status = 'resolved'
    ORDER BY COALESCE(r.resolved_at,r.created_at) DESC
    LIMIT 60
  `).all().map(moderationReportView);
  const communityLogs = db.prepare(`
    SELECT l.*, u.pseudo, u.role, u.avatar_url
    FROM community_logs l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.created_at DESC
    LIMIT 160
  `).all().map((row) => ({
    id: row.id,
    type: row.type,
    body: row.body,
    meta: safeParseJson(row.meta, {}),
    createdAt: row.created_at,
    user: row.user_id ? {
      id: row.user_id,
      pseudo: row.pseudo || "Compte supprime",
      role: row.role || "user",
      avatarUrl: row.avatar_url || ""
    } : null
  }));
  const moderationLogs = req.user.role === "admin" ? db.prepare(`
    SELECT a.id, a.type, a.reason, a.expires_at, a.created_at,
           actor.pseudo AS actor_pseudo, actor.role AS actor_role,
           target.pseudo AS target_pseudo, target.role AS target_role
    FROM moderation_actions a
    LEFT JOIN users actor ON actor.id = a.actor_user_id
    LEFT JOIN users target ON target.id = a.target_user_id
    ORDER BY a.created_at DESC
    LIMIT 120
  `).all().map((row) => ({
    id: row.id,
    type: row.type,
    reason: row.reason,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    actor: { pseudo: row.actor_pseudo || "Systeme", role: row.actor_role || "moderator" },
    target: { pseudo: row.target_pseudo || "Compte supprime", role: row.target_role || "user" }
  })) : [];
  const auditLogs = hasPermission(req.user, "audit.view") ? db.prepare(`
    SELECT a.*,actor.pseudo AS actor_pseudo,actor.role AS actor_role,
           target.pseudo AS target_pseudo,target.role AS target_role
    FROM moderation_audit_log a
    LEFT JOIN users actor ON actor.id = a.actor_user_id
    LEFT JOIN users target ON target.id = a.target_user_id
    ORDER BY a.created_at DESC,a.id DESC
    LIMIT 250
  `).all().map(auditLogView) : [];
  const staffPermissions = hasPermission(req.user, "permissions.manage") ? db.prepare(`
    SELECT id,pseudo,role,avatar_url FROM users
    WHERE role IN ('moderator','admin')
    ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END,pseudo COLLATE NOCASE
  `).all().map((user) => ({
    id: Number(user.id),
    pseudo: user.pseudo,
    role: user.role,
    avatarUrl: user.avatar_url || "",
    basePermissions: baseAdminPermissions(user.role),
    permissions: adminPermissions(user),
    editable: user.role === "moderator"
  })) : [];
  res.json({
    permissions,
    permissionCatalog: ADMIN_PERMISSION_CATALOG,
    banned: hasPermission(req.user, "users.view") ? banned : [],
    muted: hasPermission(req.user, "users.view") ? muted : [],
    moderators: hasPermission(req.user, "users.view") ? moderators : [],
    users: hasPermission(req.user, "users.view") ? users : [],
    reports: hasPermission(req.user, "reports.view") ? reports : [],
    resolvedReports: hasPermission(req.user, "reports.view") ? resolvedReports : [],
    metrics: {
      users: db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
      reports24h: db.prepare("SELECT COUNT(*) AS count FROM message_reports WHERE datetime(created_at) >= datetime('now','-1 day')").get().count,
      actions24h: db.prepare("SELECT COUNT(*) AS count FROM moderation_actions WHERE datetime(created_at) >= datetime('now','-1 day')").get().count
    },
    chatSettings: chatSettings(),
    securitySettings: securitySettings(),
    communityLogs: hasPermission(req.user, "logs.view") ? communityLogs : [],
    moderationLogs: hasPermission(req.user, "logs.view") ? moderationLogs : [],
    auditLogs,
    staffPermissions
  });
});

app.post("/api/moderation/chat/clear", requireAuth, requireRole("moderator"), requirePermission("chat.clear"), (req, res) => {
  db.prepare("UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP, deleted_by_user_id = ? WHERE deleted_at IS NULL").run(req.user.id);
  auditLog({ actorId: req.user.id, action: "chat.clear", entityType: "chat", details: {}, req });
  res.json({ ok: true });
});

app.put("/api/moderation/chat-settings", requireAuth, requireRole("moderator"), requirePermission("chat.configure"), (req, res) => {
  const locked = req.body.locked ? 1 : 0;
  const slow = Math.max(0, Math.min(300, Number(req.body.slowModeSeconds) || 0));
  db.prepare("UPDATE chat_settings SET locked = ?, slow_mode_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(locked, slow);
  auditLog({ actorId: req.user.id, action: "chat.settings.update", entityType: "chat", details: { locked: !!locked, slowModeSeconds: slow }, req });
  res.json({ settings: chatSettings() });
});

app.put("/api/admin/security-settings", requireAuth, requireRole("admin"), (req, res) => {
  const mode = ["soft", "normal", "strict"].includes(req.body.mode) ? req.body.mode : "normal";
  const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  };
  const values = {
    achievementCooldownSeconds: clamp(req.body.achievementCooldownSeconds, 0, 3600, 120),
    pykurCooldownSeconds: clamp(req.body.pykurCooldownSeconds, 0, 604800, 86400),
    maxAchievementSharesPerHour: clamp(req.body.maxAchievementSharesPerHour, 1, 100, 8),
    maxPykurSharesPerDay: clamp(req.body.maxPykurSharesPerDay, 1, 20, 2),
    minPykurAgeHours: clamp(req.body.minPykurAgeHours, 0, 720, 12),
    allowUnverifiedPublic: req.body.allowUnverifiedPublic ? 1 : 0,
    showUnverifiedBadges: req.body.showUnverifiedBadges ? 1 : 0,
    autoShareEnabled: req.body.autoShareEnabled === false ? 0 : 1
  };
  db.prepare(`
    UPDATE security_settings
    SET mode = ?,
        achievement_cooldown_seconds = ?,
        pykur_cooldown_seconds = ?,
        max_achievement_shares_per_hour = ?,
        max_pykur_shares_per_day = ?,
        min_pykur_age_hours = ?,
        allow_unverified_public = ?,
        show_unverified_badges = ?,
        auto_share_enabled = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(
    mode,
    values.achievementCooldownSeconds,
    values.pykurCooldownSeconds,
    values.maxAchievementSharesPerHour,
    values.maxPykurSharesPerDay,
    values.minPykurAgeHours,
    values.allowUnverifiedPublic,
    values.showUnverifiedBadges,
    values.autoShareEnabled
  );
  logCommunity({ userId: req.user.id, type: "security_settings", body: "Reglages anti-abus modifies.", meta: { mode } });
  res.json({ settings: securitySettings() });
});

app.patch("/api/moderation/reports/:id", requireAuth, requireRole("moderator"), requirePermission("reports.assign"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Signalement invalide." });
  const report = db.prepare("SELECT * FROM message_reports WHERE id = ?").get(id);
  if (!report) return res.status(404).json({ error: "Signalement introuvable." });
  if (report.status !== "open") return res.status(409).json({ error: "Ce dossier est deja clos." });
  const priority = req.body.priority === undefined ? report.priority : String(req.body.priority);
  const workflowStatus = req.body.workflowStatus === undefined ? report.workflow_status : String(req.body.workflowStatus);
  const internalNote = req.body.internalNote === undefined ? report.internal_note : String(req.body.internalNote || "").trim().slice(0, 1200);
  let assignedToUserId = req.body.assignedToUserId === undefined ? report.assigned_to_user_id : (req.body.assignedToUserId || null);
  if (!['low','normal','high','urgent'].includes(priority)) return res.status(400).json({ error: "Priorite invalide." });
  if (!['new','in_review'].includes(workflowStatus)) return res.status(400).json({ error: "Etat de dossier invalide." });
  if (assignedToUserId) {
    const assignee = getUserById(assignedToUserId);
    if (!assignee || !['moderator','admin'].includes(assignee.role)) return res.status(400).json({ error: "Responsable invalide." });
    assignedToUserId = assignee.id;
  }
  db.prepare(`
    UPDATE message_reports
    SET priority=?,workflow_status=?,assigned_to_user_id=?,internal_note=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(priority, workflowStatus, assignedToUserId, internalNote || null, id);
  auditLog({
    actorId: req.user.id,
    targetId: report.target_user_id,
    action: "report.update",
    entityType: "message_report",
    entityId: id,
    details: {
      before: { priority: report.priority, workflowStatus: report.workflow_status, assignedToUserId: report.assigned_to_user_id, internalNote: report.internal_note || "" },
      after: { priority, workflowStatus, assignedToUserId, internalNote: internalNote || "" }
    },
    req
  });
  res.json({ ok: true });
});

app.post("/api/moderation/reports/:id/resolve", requireAuth, requireRole("moderator"), requirePermission("reports.resolve"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Signalement invalide." });
  const note = String(req.body?.reason || "").trim().slice(0, 300);
  const report = db.prepare("SELECT * FROM message_reports WHERE id = ?").get(id);
  if (!report) return res.status(404).json({ error: "Signalement introuvable." });
  db.prepare("UPDATE message_reports SET status = 'resolved', workflow_status='resolved', resolution_action = 'close', resolution_note = ?, resolved_by_user_id = ?, resolved_at = CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id = ?").run(note || null, req.user.id, id);
  auditLog({ actorId: req.user.id, targetId: report.target_user_id, action: "report.resolve", entityType: "message_report", entityId: id, details: { action: "close", note }, req });
  res.json({ ok: true });
});

app.post("/api/moderation/reports/:id/action", requireAuth, requireRole("moderator"), requirePermission("reports.resolve"), (req, res) => {
  const id = Number(req.params.id);
  const action = String(req.body.action || "");
  const reason = String(req.body.reason || "").trim().slice(0, 300);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Signalement invalide." });
  const report = db.prepare(`
    SELECT r.*
    FROM message_reports r
    WHERE r.id = ? AND r.status = 'open'
  `).get(id);
  if (!report) return res.status(404).json({ error: "Signalement introuvable." });
  const targetId = report.target_user_id;
  const target = targetId ? getUserById(targetId) : null;
  if (["warn", "mute1", "mute24", "ban24", "ban"].includes(action)) {
    if (!target) return res.status(404).json({ error: "Utilisateur cible introuvable." });
    if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Vous ne pouvez pas sanctionner ce membre." });
  }
  const requiredActionPermission = action === "warn" ? "users.warn" : (action.startsWith("mute") ? "users.mute" : (action.startsWith("ban") ? "users.ban" : null));
  if (requiredActionPermission && !hasPermission(req.user, requiredActionPermission)) {
    return res.status(403).json({ error: "Permission insuffisante pour cette sanction.", permission: requiredActionPermission });
  }
  if (action === "warn") {
    db.prepare("INSERT INTO moderation_warnings(target_user_id, actor_user_id, reason) VALUES(?,?,?)").run(target.id, req.user.id, reason || "Avertissement modération");
    auditLog({ actorId: req.user.id, targetId: target.id, action: "moderation.warn", entityType: "message_report", entityId: id, details: { reason: reason || "", source: "report" }, req });
    logCommunity({ userId: req.user.id, type: "moderation_warn", body: "Avertissement envoye.", meta: { targetId: target.id, reason: reason || "" } });
  } else if (action === "mute1" || action === "mute24") {
    const hours = action === "mute1" ? 1 : 24;
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    db.prepare("UPDATE users SET mute_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(until, target.id);
    moderationLog({ targetId: target.id, actorId: req.user.id, type: "mute", reason: reason || `Mute depuis signalement (${hours}h)`, expiresAt: until, req });
  } else if (action === "ban24") {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare("UPDATE users SET is_banned = 1, ban_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(until, target.id);
    moderationLog({ targetId: target.id, actorId: req.user.id, type: "timeban", reason: reason || "Ban 24h depuis signalement", expiresAt: until, req });
    queueForcedDisconnect(req.user, target, `Votre compte est banni jusqu'au ${until}. ${reason || ""}`.trim());
  } else if (action === "ban") {
    db.prepare("UPDATE users SET is_banned = 1, ban_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(target.id);
    moderationLog({ targetId: target.id, actorId: req.user.id, type: "ban", reason: reason || "Ban depuis signalement", req });
    queueForcedDisconnect(req.user, target, `Votre compte a été banni. ${reason || ""}`.trim());
  } else if (action !== "close") {
    return res.status(400).json({ error: "Action inconnue." });
  }
  db.prepare("UPDATE message_reports SET status = 'resolved', workflow_status='resolved', resolution_action = ?, resolution_note = ?, resolved_by_user_id = ?, resolved_at = CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id = ?").run(action, reason || null, req.user.id, id);
  auditLog({ actorId: req.user.id, targetId, action: "report.resolve", entityType: "message_report", entityId: id, details: { action, reason }, req });
  res.json({ ok: true });
});

app.get("/api/moderation/users/:pseudo", requireAuth, requireRole("moderator"), requirePermission("users.view"), (req, res) => {
  const target = getUserByPseudo(req.params.pseudo);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  res.json({
    user: moderationUserView(target, req.user),
    history: moderationHistory(target.id),
    pseudoHistory: pseudoHistory(target.id),
    permissions: adminPermissions(req.user)
  });
});

function requiredModerationReason(value) {
  const reason = String(value || "").trim().slice(0, 500);
  return reason.length >= 3 ? reason : "";
}

app.put("/api/moderation/users/:id/pseudo", requireAuth, requireRole("moderator"), requirePermission("users.rename"), (req, res) => {
  const target = getUserById(req.params.id);
  const pseudo = cleanPseudo(req.body.pseudo);
  const reason = requiredModerationReason(req.body.reason);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Modification non autorisee." });
  if (!reason) return res.status(400).json({ error: "Une raison est obligatoire." });
  if (!isValidPseudo(pseudo)) return res.status(400).json({ error: "Pseudo invalide : 3 a 24 caracteres." });
  if (pseudo.toLowerCase() === String(target.pseudo).toLowerCase()) return res.status(400).json({ error: "Ce pseudo est deja utilise par ce compte." });
  if (db.prepare("SELECT id FROM users WHERE lower(pseudo)=lower(?) AND id<>?").get(pseudo, target.id)) return res.status(409).json({ error: "Pseudo deja utilise." });
  const oldPseudo = target.pseudo;
  db.transaction(() => {
    db.prepare("UPDATE users SET pseudo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(pseudo, target.id);
    db.prepare("INSERT INTO user_pseudo_history(user_id,old_pseudo,new_pseudo,actor_user_id,reason) VALUES(?,?,?,?,?)").run(target.id, oldPseudo, pseudo, req.user.id, reason);
  })();
  auditLog({ actorId: req.user.id, targetId: target.id, action: "user.pseudo.update", entityType: "user", entityId: target.id, details: { oldPseudo, newPseudo: pseudo, reason }, req });
  res.json({ user: moderationUserView(getUserById(target.id), req.user) });
});

app.put("/api/moderation/users/:id/note", requireAuth, requireRole("moderator"), requirePermission("users.notes"), (req, res) => {
  const target = getUserById(req.params.id);
  const note = String(req.body.note || "").trim().slice(0, 2000);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Modification non autorisee." });
  db.prepare("UPDATE users SET staff_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(note || null, target.id);
  auditLog({ actorId: req.user.id, targetId: target.id, action: "user.note.update", entityType: "user", entityId: target.id, details: { noteLength: note.length }, req });
  res.json({ ok: true });
});

app.put("/api/moderation/users/:id/restrictions", requireAuth, requireRole("moderator"), requirePermission("users.restrict"), (req, res) => {
  const target = getUserById(req.params.id);
  const reason = requiredModerationReason(req.body.reason);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Modification non autorisee." });
  if (!reason) return res.status(400).json({ error: "Une raison est obligatoire." });
  const restrictions = parseSocialRestrictions(req.body.restrictions);
  const profileLocked = !!req.body.profileLocked;
  const avatarLocked = !!req.body.avatarLocked;
  db.prepare("UPDATE users SET social_restrictions=?, profile_locked=?, avatar_locked=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(JSON.stringify(restrictions), profileLocked ? 1 : 0, avatarLocked ? 1 : 0, target.id);
  auditLog({ actorId: req.user.id, targetId: target.id, action: "user.restrictions.update", entityType: "user", entityId: target.id, details: { restrictions, profileLocked, avatarLocked, reason }, req });
  res.json({ user: moderationUserView(getUserById(target.id), req.user) });
});

app.put("/api/moderation/users/:id/avatar", requireAuth, requireRole("moderator"), requirePermission("users.avatar.manage"), (req, res) => {
  const target = getUserById(req.params.id);
  const reason = requiredModerationReason(req.body.reason);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Modification non autorisee." });
  if (!reason) return res.status(400).json({ error: "Une raison est obligatoire." });
  const avatarUrl = cleanAvatarUrl(req.body.avatarUrl);
  db.prepare("UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(avatarUrl || null, target.id);
  auditLog({
    actorId: req.user.id,
    targetId: target.id,
    action: "user.avatar.update",
    entityType: "user",
    entityId: target.id,
    details: { cleared: !avatarUrl, reason },
    req
  });
  logCommunity({
    userId: req.user.id,
    type: "moderation_avatar",
    body: avatarUrl ? "Avatar modifie par moderation." : "Avatar supprime par moderation.",
    meta: { targetId: target.id, reason }
  });
  res.json({ user: moderationUserView(getUserById(target.id), req.user) });
});

app.post("/api/moderation/users/:id/sessions/revoke", requireAuth, requireRole("moderator"), requirePermission("users.sessions.revoke"), (req, res) => {
  const target = getUserById(req.params.id);
  const reason = requiredModerationReason(req.body.reason);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Action non autorisee." });
  if (!reason) return res.status(400).json({ error: "Une raison est obligatoire." });
  db.prepare("UPDATE users SET session_version=session_version+1, presence_seen_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(target.id);
  auditLog({ actorId: req.user.id, targetId: target.id, action: "user.sessions.revoke", entityType: "user", entityId: target.id, details: { reason }, req });
  res.json({ ok: true });
});

app.post("/api/moderation/users/:id/password-reset", requireAuth, requireRole("moderator"), requirePermission("users.password.reset"), asyncRoute(async (req, res) => {
  const target = getUserById(req.params.id);
  const reason = requiredModerationReason(req.body.reason);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Action non autorisee." });
  if (!reason) return res.status(400).json({ error: "Une raison est obligatoire." });
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id=? AND used_at IS NULL").run(target.id);
  db.prepare("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES(?,?,?)").run(target.id, tokenHash(token), expiresAt);
  try {
    await sendPasswordResetEmail(target, resetLink(token));
  } catch (error) {
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id=? AND token_hash=?").run(target.id, tokenHash(token));
    throw error;
  }
  db.prepare("UPDATE users SET password_reset_required=1, session_version=session_version+1, presence_seen_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(target.id);
  auditLog({ actorId: req.user.id, targetId: target.id, action: "user.password_reset.force", entityType: "user", entityId: target.id, details: { reason }, req });
  res.json({ ok: true });
}));

app.delete("/api/moderation/actions/:id", requireAuth, requireRole("moderator"), requirePermission("users.history.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Action invalide." });
  const action = db.prepare("SELECT * FROM moderation_actions WHERE id = ?").get(id);
  if (!action) return res.status(404).json({ error: "Action introuvable." });
  const target = getUserById(action.target_user_id);
  if (target && !canModerateTarget(req.user, target)) return res.status(403).json({ error: "Suppression non autorisee." });
  db.prepare("DELETE FROM moderation_actions WHERE id = ?").run(id);
  auditLog({ actorId: req.user.id, targetId: action.target_user_id, action: "moderation.history.delete", entityType: "moderation_action", entityId: id, details: { deletedAction: action }, req });
  logCommunity({ userId: req.user.id, type: "moderation_history_delete", body: "Action de moderation retiree.", meta: { actionId: id } });
  res.json({ ok: true });
});

app.delete("/api/moderation/warnings/:id", requireAuth, requireRole("moderator"), requirePermission("users.history.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Avertissement invalide." });
  const warning = db.prepare("SELECT * FROM moderation_warnings WHERE id = ?").get(id);
  if (!warning) return res.status(404).json({ error: "Avertissement introuvable." });
  const target = getUserById(warning.target_user_id);
  if (target && !canModerateTarget(req.user, target)) return res.status(403).json({ error: "Suppression non autorisee." });
  db.prepare("DELETE FROM moderation_warnings WHERE id = ?").run(id);
  auditLog({ actorId: req.user.id, targetId: warning.target_user_id, action: "moderation.warning.delete", entityType: "moderation_warning", entityId: id, details: { deletedWarning: warning }, req });
  logCommunity({ userId: req.user.id, type: "moderation_history_delete", body: "Avertissement retire.", meta: { warningId: id } });
  res.json({ ok: true });
});

app.delete("/api/moderation/users/:id/history", requireAuth, requireRole("moderator"), requirePermission("users.history.manage"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Suppression non autorisee." });
  const actions = db.prepare("SELECT id FROM moderation_actions WHERE target_user_id = ?").all(target.id);
  const warnings = db.prepare("SELECT id FROM moderation_warnings WHERE target_user_id = ?").all(target.id);
  db.prepare("DELETE FROM moderation_actions WHERE target_user_id = ?").run(target.id);
  db.prepare("DELETE FROM moderation_warnings WHERE target_user_id = ?").run(target.id);
  auditLog({ actorId: req.user.id, targetId: target.id, action: "moderation.history.reset", entityType: "user", entityId: target.id, details: { deletedActions: actions.length, deletedWarnings: warnings.length }, req });
  logCommunity({ userId: req.user.id, type: "moderation_history_reset", body: "Historique recent de sanctions vide.", meta: { targetId: target.id } });
  res.json({ ok: true });
});

app.post("/api/moderation/users/:id/ban", requireAuth, requireRole("moderator"), requirePermission("users.ban"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (ROLE_ORDER[target.role] >= ROLE_ORDER[req.user.role]) return res.status(403).json({ error: "Vous ne pouvez pas sanctionner ce rôle." });
  const reason = requiredModerationReason(req.body.reason);
  if (!reason) return res.status(400).json({ error: "Une raison est obligatoire." });
  const untilDate = req.body.until ? new Date(req.body.until) : null;
  if (untilDate && Number.isNaN(untilDate.getTime())) return res.status(400).json({ error: "Date de fin de ban invalide." });
  const until = untilDate ? untilDate.toISOString() : null;
  if (!until && !hasPermission(req.user, "users.ban.permanent")) {
    return res.status(403).json({ error: "Permission insuffisante pour un ban definitif." });
  }
  db.prepare("UPDATE users SET is_banned = 1, ban_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(until, target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: until ? "timeban" : "ban", reason, expiresAt: until, req });
  queueForcedDisconnect(req.user, target, until
    ? `Votre compte est banni jusqu'au ${until}. ${reason}`.trim()
    : `Votre compte a été banni. ${reason}`.trim());
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.post("/api/moderation/users/:id/unban", requireAuth, requireRole("moderator"), requirePermission("users.ban"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (ROLE_ORDER[target.role] >= ROLE_ORDER[req.user.role]) return res.status(403).json({ error: "Vous ne pouvez pas modifier ce rôle." });
  db.prepare("UPDATE users SET is_banned = 0, ban_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: "unban", reason: req.body.reason, req });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.post("/api/moderation/users/:id/mute", requireAuth, requireRole("moderator"), requirePermission("users.mute"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  const reason = requiredModerationReason(req.body.reason);
  if (!reason) return res.status(400).json({ error: "Une raison est obligatoire." });
  const untilDate = req.body.until ? new Date(req.body.until) : null;
  if (!untilDate || Number.isNaN(untilDate.getTime())) return res.status(400).json({ error: "Date de fin de mute invalide." });
  const until = untilDate.toISOString();
  if (ROLE_ORDER[target.role] >= ROLE_ORDER[req.user.role]) return res.status(403).json({ error: "Vous ne pouvez pas mute ce rôle." });
  db.prepare("UPDATE users SET mute_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(until, target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: "mute", reason, expiresAt: until, req });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.post("/api/moderation/users/:id/warn", requireAuth, requireRole("moderator"), requirePermission("users.warn"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Vous ne pouvez pas avertir ce membre." });
  const reason = requiredModerationReason(req.body.reason);
  if (!reason) return res.status(400).json({ error: "Une raison est obligatoire." });
  db.prepare("INSERT INTO moderation_warnings(target_user_id, actor_user_id, reason) VALUES(?,?,?)").run(target.id, req.user.id, reason);
  auditLog({ actorId: req.user.id, targetId: target.id, action: "moderation.warn", entityType: "user", entityId: target.id, details: { reason: reason || "" }, req });
  logCommunity({ userId: req.user.id, type: "moderation_warn", body: "Avertissement envoye.", meta: { targetId: target.id, reason: reason || "" } });
  res.json({ ok: true });
});

app.post("/api/moderation/users/:id/unmute", requireAuth, requireRole("moderator"), requirePermission("users.mute"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (ROLE_ORDER[target.role] >= ROLE_ORDER[req.user.role]) return res.status(403).json({ error: "Vous ne pouvez pas modifier ce rôle." });
  db.prepare("UPDATE users SET mute_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: "unmute", reason: req.body.reason, req });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.post("/api/admin/users/:id/role", requireAuth, requireRole("admin"), requirePermission("roles.manage"), (req, res) => {
  const target = getUserById(req.params.id);
  const role = String(req.body.role || "");
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (Number(target.id) === Number(req.user.id)) return res.status(400).json({ error: "Vous ne pouvez pas modifier votre propre rôle." });
  if (target.role === "admin") return res.status(403).json({ error: "Impossible de modifier un admin depuis cette interface." });
  if (!["user", "moderator"].includes(role)) return res.status(400).json({ error: "Rôle invalide." });
  db.prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(role, target.id);
  if (role !== "moderator") db.prepare("DELETE FROM staff_permission_overrides WHERE user_id = ?").run(target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: ROLE_ORDER[role] > ROLE_ORDER[target.role] ? "promote" : "demote", reason: req.body.reason, req });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.delete("/api/admin/users/:id", requireAuth, requireRole("admin"), requirePermission("users.delete"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (Number(target.id) === Number(req.user.id)) return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
  if (target.role === "admin") return res.status(403).json({ error: "Impossible de supprimer un admin depuis cette interface." });
  auditLog({ actorId: req.user.id, targetId: target.id, action: "user.delete", entityType: "user", entityId: target.id, details: { pseudo: target.pseudo, role: target.role }, req });
  db.prepare("DELETE FROM users WHERE id = ?").run(target.id);
  res.json({ ok: true });
});

app.post("/api/admin/users/:id/role-legacy-disabled", requireAuth, requireRole("admin"), (req, res) => {
  return res.status(410).json({ error: "Route désactivée." });
  const target = getUserById(req.params.id);
  const role = String(req.body.role || "");
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!["user", "moderator", "admin"].includes(role)) return res.status(400).json({ error: "Rôle invalide." });
  db.prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(role, target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: ROLE_ORDER[role] > ROLE_ORDER[target.role] ? "promote" : "demote", reason: req.body.reason });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.use((error, req, res, next) => {
  const requestId = req.requestId || crypto.randomUUID();
  const status = Number(error?.status || error?.statusCode || 500);
  console.error(`[api] ${requestId} ${req.method} ${req.originalUrl}`, error);
  if (res.headersSent) return next(error);
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: status >= 500 ? "Erreur serveur temporaire." : (error?.message || "Requête impossible."),
    code: error?.code || "API_ERROR",
    requestId
  });
});

app.listen(PORT, () => {
  console.log(`Pykur Tracker API listening on http://127.0.0.1:${PORT}`);
});
