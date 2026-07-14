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
const vm = require("vm");

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const DB_PATH = process.env.DB_PATH ? path.resolve(__dirname, process.env.DB_PATH) : path.join(__dirname, "data", "pykur.sqlite");
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://127.0.0.1:8765";
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || CLIENT_ORIGIN;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const KEPH_MODEL = process.env.KEPH_MODEL || "qwen2.5:1.5b";
const KEPH_AI_TIMEOUT_MS = Number(process.env.KEPH_AI_TIMEOUT_MS || 4500);
const KEPH_REMOTE_TIMEOUT_MS = Number(process.env.KEPH_REMOTE_TIMEOUT_MS || 7000);
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
ensureColumn("users", "last_ip_address", "TEXT");
ensureColumn("users", "last_browser_id", "TEXT");
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
  CREATE TABLE IF NOT EXISTS keph_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT,
    vote TEXT NOT NULL CHECK(vote IN ('like','dislike')),
    reason TEXT,
    question TEXT,
    answer TEXT,
    source TEXT,
    intent TEXT,
    actions_json TEXT,
    context_json TEXT,
    ip_address TEXT,
    user_agent TEXT,
    task_status TEXT NOT NULL DEFAULT 'open',
    task_note TEXT,
    updated_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_keph_feedback_created ON keph_feedback(created_at);
  CREATE INDEX IF NOT EXISTS idx_keph_feedback_vote ON keph_feedback(vote, created_at);

  CREATE TABLE IF NOT EXISTS keph_command_rejections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    reason TEXT,
    question TEXT,
    context_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_keph_command_rejections_created ON keph_command_rejections(created_at);
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
  CREATE TABLE IF NOT EXISTS blocked_ip_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT,
    actor_user_id INTEGER,
    target_user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS blocked_browsers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    browser_id TEXT NOT NULL UNIQUE,
    reason TEXT,
    actor_user_id INTEGER,
    target_user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE SET NULL
  );
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
ensureColumn("keph_feedback", "task_status", "TEXT NOT NULL DEFAULT 'open'");
ensureColumn("keph_feedback", "task_note", "TEXT");
ensureColumn("keph_feedback", "category", "TEXT");
ensureColumn("keph_feedback", "training_case_json", "TEXT");
ensureColumn("keph_feedback", "doc_suggestion_json", "TEXT");
ensureColumn("keph_feedback", "updated_at", "TEXT");
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
const kephLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Keph recoit trop de questions. Reessayez dans quelques secondes.", code: "KEPH_RATE_LIMITED" }
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

function normalizeIpAddress(value) {
  return String(value || "").trim().replace(/^::ffff:/, "").slice(0, 80);
}

function requestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0];
  return normalizeIpAddress(forwarded || req.ip || req.socket?.remoteAddress || "");
}

function normalizeBrowserId(value) {
  const text = String(value || "").trim();
  return /^[a-zA-Z0-9._:-]{12,120}$/.test(text) ? text.slice(0, 120) : "";
}

function requestBrowserId(req) {
  return normalizeBrowserId(req.headers["x-browser-id"]);
}

function securityLoginBlock(req) {
  const ip = requestIp(req);
  const browserId = requestBrowserId(req);
  if (ip) {
    const row = db.prepare("SELECT reason FROM blocked_ip_addresses WHERE ip_address = ?").get(ip);
    if (row) return { blocked: true, type: "ip", reason: row.reason || "" };
  }
  if (browserId) {
    const row = db.prepare("SELECT reason FROM blocked_browsers WHERE browser_id = ?").get(browserId);
    if (row) return { blocked: true, type: "browser", reason: row.reason || "" };
  }
  return { blocked: false, ip, browserId };
}

function updateUserSecurityFootprint(userId, req) {
  const ip = requestIp(req);
  const browserId = requestBrowserId(req);
  db.prepare(`
    UPDATE users
    SET last_ip_address = COALESCE(?, last_ip_address),
        last_browser_id = COALESCE(?, last_browser_id)
    WHERE id = ?
  `).run(ip || null, browserId || null, userId);
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
const PUBLIC_ABRA_MOBS = {
  cheneMou: 1,
  abraknydeAncestral: 10,
  abraknydeSombre: 20,
  abrakneSombre: 20,
  abraknyde: 50,
  abraknydeVenerable: 50,
  abrakne: 50,
  tronknyde: 150
};
const PUBLIC_DRAGOUNE_MOBS = {
  crocabulia: 1,
  aerotrugoburMalveillant: 5,
  aqualikrosImpitoyable: 5,
  aerohouctorGuerrier: 5,
  aquabralakGuerrier: 5,
  terrakoubiakGuerrier: 10,
  ignelicroburGuerrier: 10,
  terraburkalPerfide: 10,
  ignerkocroposAffame: 10,
  dragossNoir: 15,
  dragossBlanc: 15,
  dragossSaphir: 15,
  dragossDoreEveille: 15,
  dragossNoirEveille: 15,
  dragossBlancEveille: 15,
  dragossSaphirEveille: 15,
  dragossDore: 15,
  dragoeufVolant: 15,
  dragoeufGuerrier: 15,
  dragueuse: 15,
  dragoeufDoreImmature: 50,
  dragoeufNoirImmature: 50,
  dragoeufBlancImmature: 50,
  dragoeufSaphirImmature: 50,
  dragoeufDore: 50,
  dragoeufNoir: 50,
  dragoeufBlanc: 50,
  dragoeufSaphir: 50,
  dragoeufDoreEveille: 50,
  dragoeufNoirEveille: 50,
  dragoeufBlancEveille: 50,
  dragoeufSaphirEveille: 50,
  coquilleSoignante: 100,
  coquilleExplosive: 100
};
const PUBLIC_TOFOUDRE_MOBS = {
  sphincterCell: 5,
  ratNoir: 25,
  ratBlanc: 25,
  ratCroc: 150,
  ratBajoie: 150,
  ratBasher: 150,
  ratKlure: 150,
  ratBatteur: 150,
  ratDeMarais: 150,
  ratHyoactif: 200,
  chamanEgoutant: 250,
  ratEgoutant: 300,
  ratEgoutantMalade: 300,
  miliratEgoutantMalade: 400
};
const PUBLIC_CROUM_MOBS = {
  silfRasboul: 1,
  mufafah: 40,
  craqueboulePoli: 40,
  kido: 50,
  kilibriss: 50,
  bitoufPlaines: 50,
  craqueleurPoli: 60
};
function publicCroumFamiliar(label, progressShort) {
  return {
    label,
    defaultProfileLabel: `Profil ${label}`,
    progressShort,
    objectiveMax: 90,
    thresholds: PUBLIC_CROUM_MOBS,
    runs: [
      { key: "gouletRasboul", label: "Rasboul" }
    ]
  };
}
let PUBLIC_FAMILIARS = {
  pykur: {
    label: "Pykur",
    defaultProfileLabel: "Profil Pykur",
    progressShort: "PP",
    objectiveMax: 90,
    thresholds: PUBLIC_MOBS,
    runs: [
      { key: "morose", label: "Morose" },
      { key: "tynril", label: "Tynril" }
    ]
  },
  "abra-kadabra": {
    label: "Abra Kadabra",
    defaultProfileLabel: "Profil Abra Kadabra",
    progressShort: "puissance",
    objectiveMax: 55,
    thresholds: PUBLIC_ABRA_MOBS,
    runs: [
      { key: "donjonAbraknyde", label: "Abraknyde" },
      { key: "cheneMou", label: "Chêne Mou" },
      { key: "salleAbrakne", label: "Salle Abrakne" }
    ]
  },
  "dragoune-noir": {
    label: "Dragoune Noir",
    defaultProfileLabel: "Profil Dragoune Noir",
    progressShort: "sagesse",
    objectiveMax: 55,
    thresholds: PUBLIC_DRAGOUNE_MOBS,
    runs: [
      { key: "sanctuaireDragoeufs", label: "Sanctuaire" }
    ]
  },
  tofoudre: {
    label: "Tofoudre",
    defaultProfileLabel: "Profil Tofoudre",
    progressShort: "dommages",
    objectiveMax: 11,
    thresholds: PUBLIC_TOFOUDRE_MOBS,
    runs: [
      { key: "ratsAmakna", label: "Rats Amakna" },
      { key: "ratsBrakmar", label: "Rats Brakmar" },
      { key: "ratsBonta", label: "Rats Bonta" }
    ]
  },
  "croum-aqueux": publicCroumFamiliar("Croum Aqueux", "chance"),
  "croum-volatile": publicCroumFamiliar("Croum Volatile", "agilité"),
  "croum-igne": publicCroumFamiliar("Croum Igné", "intelligence"),
  "croum-vegetal": publicCroumFamiliar("Croum Végétal", "force")
};
function loadPublicFamiliarsFromClientData() {
  const dataPath = path.join(__dirname, "..", "familiers", "pykur", "data", "familiars.js");
  try {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(dataPath, "utf8"), sandbox, { filename: dataPath, timeout: 1000 });
    const shared = sandbox.window.PYKUR_FAMILIAR_DATA || {};
    const familiars = shared.FAMILIARS || {};
    const runtimes = shared.FAMILIAR_RUNTIME || {};
    return Object.fromEntries(Object.entries(familiars).map(([id, familiar]) => {
      const runtime = runtimes[id] || {};
      const mobs = runtime.mobs || {};
      const thresholds = Object.fromEntries(Object.entries(mobs).map(([mobId, mob]) => [
        mobId,
        {
          need: Math.max(1, Number(mob?.ppNeed) || 1),
          gainValue: Math.max(1, Number(mob?.gainValue) || 1)
        }
      ]));
      return [id, {
        label: String(familiar.label || id),
        defaultProfileLabel: `Profil ${familiar.label || id}`,
        progressShort: String(familiar.progressShort || "PP"),
        objectiveMax: Math.max(1, Number(familiar.objectiveMax) || 90),
        thresholds,
        runs: Array.isArray(familiar.dungeons)
          ? familiar.dungeons.map((run) => ({
              key: String(run.key || ""),
              label: String(run.label || run.fullLabel || run.key || "Run")
            })).filter((run) => run.key)
          : []
      }];
    }));
  } catch (error) {
    console.warn("[community] Impossible de charger les familiers publics partages:", error.message);
    return null;
  }
}

PUBLIC_FAMILIARS = Object.assign({}, PUBLIC_FAMILIARS, loadPublicFamiliarsFromClientData() || {});
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

function publicFamiliarMeta(familiarId) {
  return PUBLIC_FAMILIARS[familiarId] || PUBLIC_FAMILIARS.pykur;
}

function publicProfileFamiliarId(profileData) {
  return PUBLIC_FAMILIARS[profileData?.familiarId] ? profileData.familiarId : "pykur";
}

function publicProgressFromMobs(mobs, meta = PUBLIC_FAMILIARS.pykur) {
  let pp = 0;
  Object.entries(meta.thresholds || PUBLIC_MOBS).forEach(([id, threshold]) => {
    const need = typeof threshold === "object" ? threshold.need : threshold;
    const gainValue = typeof threshold === "object" ? threshold.gainValue : 1;
    pp += Math.floor((Number(mobs?.[id]) || 0) / Math.max(1, Number(need) || 1)) * Math.max(1, Number(gainValue) || 1);
  });
  return Math.min(meta.objectiveMax || PP_MAX, Math.max(0, pp));
}

function publicPpFromMobs(mobs) {
  return publicProgressFromMobs(mobs, PUBLIC_FAMILIARS.pykur);
}

function publicTotalMobs(mobs, meta = PUBLIC_FAMILIARS.pykur) {
  const total = {};
  Object.keys(meta.thresholds || PUBLIC_MOBS).forEach((id) => {
    total[id] = Object.values(mobs || {}).reduce((sum, source) => sum + (Number(source?.[id]) || 0), 0);
  });
  return total;
}

function publicProfileSummary(entry, index, activeId, preferences) {
  const profileData = entry?.data || {};
  const familiarId = publicProfileFamiliarId(profileData);
  const familiar = publicFamiliarMeta(familiarId);
  const totalMobs = publicTotalMobs(profileData.mobs || {}, familiar);
  const progressValue = publicProgressFromMobs(totalMobs, familiar);
  const runSummary = Object.fromEntries(familiar.runs.map((run) => [run.key, Number(profileData.runs?.[run.key]) || 0]));
  const safeName = preferences.hidePykurProfileNames ? `${familiar.defaultProfileLabel} #${index + 1}` : String(entry?.name || `${familiar.defaultProfileLabel} #${index + 1}`);
  const profile = {
    id: entry?.id,
    name: safeName,
    familiarId,
    familiarLabel: familiar.label,
    progressLabel: familiar.progressShort,
    objectiveMax: familiar.objectiveMax,
    isMain: entry?.id === activeId,
    createdAt: profileData.createdAt || null,
    pp: progressValue,
    progressValue,
    progress: Math.min(100, Math.round((progressValue / (familiar.objectiveMax || PP_MAX)) * 10000) / 100),
    runs: runSummary,
    runDetails: familiar.runs.map((run) => ({
      key: run.key,
      label: run.label,
      value: runSummary[run.key] || 0
    }))
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
      achievements: { hiddenSecrets: true, eggCollected: false, secretCategoriesUnlocked: false, unlocked: [] }
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
  const achievementSource = store.sharedAchievements || profileEntries.find((entry) => entry.id === activeId)?.data?.achievements;
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
      eggCollected: !!achievementSource?.eggCollected,
      secretCategoriesUnlocked: !!achievementSource?.secretCategoriesUnlocked,
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
      return "Familier termine trop rapidement pour etre partage publiquement.";
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
    if (!allowBanned) {
      const block = securityLoginBlock(req);
      if (block.blocked) {
        return res.status(403).json({
          error: block.type === "ip" ? "Connexion refusee depuis cette adresse IP." : "Connexion refusee depuis ce navigateur.",
          code: "SECURITY_BLOCKED"
        });
      }
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
  { id: "users.ip.view", group: "Securite", label: "Voir les IP", description: "Afficher la derniere IP connue d'un membre." },
  { id: "users.ip.ban", group: "Securite", label: "Bannir une IP", description: "Bloquer la connexion depuis une adresse IP." },
  { id: "users.browser.ban", group: "Securite", label: "Bannir un navigateur", description: "Bloquer la connexion depuis le navigateur signale." },
  { id: "users.security_bans.view", group: "Securite", label: "Voir les bans techniques", description: "Consulter les IP et navigateurs bannis." },
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
  { id: "profiles.manage", group: "Donnees", label: "Gerer les profils familiers", description: "Renommer ou supprimer des profils familiers." },
  { id: "roles.manage", group: "Administration", label: "Gerer les roles", description: "Promouvoir ou retrograder les moderateurs." },
  { id: "permissions.manage", group: "Administration", label: "Gerer les permissions", description: "Personnaliser les droits detailles des moderateurs." },
  { id: "security.configure", group: "Administration", label: "Configurer la securite", description: "Modifier les regles anti-abus du serveur." }
]);

const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_CATALOG.map((permission) => permission.id);
const ADMIN_PERMISSION_MATRIX = Object.freeze({
  moderator: [
    "console.view", "users.view", "users.warn", "users.mute", "users.ban", "users.history.manage",
    "users.notes", "users.restrict", "users.ip.view",
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
    if (!profile?.data) throw new Error("Profil familier introuvable.");
    const data = profile.data;
    const familiar = publicFamiliarMeta(publicProfileFamiliarId(data));
    const runKeys = (familiar.runs || PUBLIC_FAMILIARS.pykur.runs).map((run) => run.key);
    data.runs = Object.fromEntries(runKeys.map((key) => [key, 0]));
    data.mobs = Object.assign({ zone: {} }, Object.fromEntries(runKeys.map((key) => [key, {}])));
    data.chrono = { seconds: 0, running: false, startedAt: null, lastMarkSeconds: 0, marks: [] };
    data.session = { active: false, startedAt: null, sessionStartedAt: null, totalSeconds: 0, runs: Object.fromEntries(runKeys.map((key) => [key, 0])), ppStart: 0, ppGain: 0, lastSummary: null };
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
    if (!store.profiles?.[profileId]) throw new Error("Profil familier introuvable.");
    store.profiles[profileId].name = String(commandPayload.name || "").trim().slice(0, 80) || store.profiles[profileId].name;
  } else if (type === "delete-profile") {
    if (!store.profiles?.[profileId]) throw new Error("Profil familier introuvable.");
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

function cloudProfileProgress(profileData) {
  const familiarId = publicProfileFamiliarId(profileData || {});
  const familiar = publicFamiliarMeta(familiarId);
  const totals = {};
  for (const source of Object.values(profileData?.mobs || {})) {
    for (const [id, value] of Object.entries(source || {})) {
      totals[id] = (totals[id] || 0) + Math.max(0, Number(value) || 0);
    }
  }
  const value = Object.entries(familiar.thresholds || CLOUD_PP_NEEDS).reduce((sum, [id, threshold]) => {
    const need = typeof threshold === "object" ? threshold.need : threshold;
    const gainValue = typeof threshold === "object" ? threshold.gainValue : 1;
    return sum + Math.floor((totals[id] || 0) / Math.max(1, Number(need) || 1)) * Math.max(1, Number(gainValue) || 1);
  }, 0);
  return Math.min(familiar.objectiveMax || PP_MAX, Math.max(0, value));
}

function cloudProfilePP(profileData) {
  return cloudProfileProgress(Object.assign({}, profileData, { familiarId: "pykur" }));
}

function cloudProfileAdminSummary(id, profile, activeId) {
  const profileData = profile?.data || {};
  const familiarId = publicProfileFamiliarId(profileData);
  const familiar = publicFamiliarMeta(familiarId);
  const progressValue = cloudProfileProgress(profileData);
  const runs = familiar.runs.map((run) => ({
    key: run.key,
    label: run.label,
    value: Number(profileData.runs?.[run.key] || 0)
  }));
  return {
    id,
    name: String(profile?.name || "Profil sans nom").slice(0, 80),
    familiarId,
    familiarLabel: familiar.label,
    pp: progressValue,
    progressValue,
    progressLabel: familiar.progressShort,
    objectiveMax: familiar.objectiveMax,
    runs: Object.fromEntries(runs.map((run) => [run.key, run.value])),
    runDetails: runs,
    morose: Number(profileData.runs?.morose || 0),
    tynril: Number(profileData.runs?.tynril || 0),
    active: id === activeId
  };
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
  if (hasPermission(actor, "users.ip.view")) {
    base.lastIpAddress = user.last_ip_address || "";
    base.lastBrowserId = user.last_browser_id || "";
  }
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

function authClientPath(client) {
  return client === "v2" ? "/v2/index.html" : "/familiers/pykur/index.html";
}

function resetLink(token, client) {
  const url = new URL(authClientPath(client), APP_PUBLIC_URL);
  url.searchParams.set("resetToken", token);
  return url.toString();
}

function verificationLink(token, client) {
  const url = new URL(authClientPath(client), APP_PUBLIC_URL);
  url.searchParams.set("verifyToken", token);
  return url.toString();
}

const charlieKephKnowledgePath = path.join(__dirname, "charlie-keph-knowledge.json");
const kephSiteDocsPath = path.join(__dirname, "keph-docs", "site.json");
const kephSiteManualPath = path.join(__dirname, "keph-docs", "site-manual.md");
let charlieKephKnowledgeCache = null;
let kephSiteDocsCache = null;
let kephSiteManualCache = null;

function charlieKephKnowledge() {
  if (charlieKephKnowledgeCache) return charlieKephKnowledgeCache;
  try {
    charlieKephKnowledgeCache = JSON.parse(fs.readFileSync(charlieKephKnowledgePath, "utf8"));
  } catch (error) {
    console.warn("[keph] Base de connaissance indisponible.", error.message);
    charlieKephKnowledgeCache = { features: [], actions: [], principles: [] };
  }
  return charlieKephKnowledgeCache;
}

function kephSiteDocs() {
  if (kephSiteDocsCache) return kephSiteDocsCache;
  try {
    kephSiteDocsCache = JSON.parse(fs.readFileSync(kephSiteDocsPath, "utf8"));
  } catch (error) {
    console.warn("[keph] Documentation structuree indisponible.", error.message);
    kephSiteDocsCache = { sections: [], documents: [], generalFacts: [] };
  }
  return kephSiteDocsCache;
}

function kephSiteManualDocs() {
  if (kephSiteManualCache) return kephSiteManualCache;
  try {
    const markdown = fs.readFileSync(kephSiteManualPath, "utf8");
    const chunks = [];
    const blocks = markdown.split(/\n(?=##\s+)/g);
    blocks.forEach((block, index) => {
      const title = (block.match(/^##\s+(.+)$/m) || block.match(/^#\s+(.+)$/m) || [null, `Manuel Keph ${index + 1}`])[1];
      const content = block.replace(/^#+\s+.+$/m, "").trim();
      if (!content) return;
      chunks.push({
        id: `manual_${normalizeKephText(title).replace(/\s+/g, "_").slice(0, 64) || index}`,
        title: `Manuel - ${title}`,
        keywords: normalizeKephText(title).split(" ").filter((part) => part.length > 2),
        content,
        actions: []
      });
    });
    kephSiteManualCache = chunks;
  } catch (error) {
    console.warn("[keph] Manuel complet indisponible.", error.message);
    kephSiteManualCache = [];
  }
  return kephSiteManualCache;
}

function kephPublicAvatar() {
  try {
    const row = db.prepare("SELECT avatar_url FROM users WHERE lower(pseudo) = lower(?) LIMIT 1").get("Sinaye");
    return row?.avatar_url || "";
  } catch {
    return "";
  }
}

function normalizedKephActions(actions, knowledge) {
  const allowed = new Map((knowledge.actions || []).map((action) => [action.id, action]));
  return (Array.isArray(actions) ? actions : [])
    .map((action) => typeof action === "string" ? { id: action } : action)
    .filter((action) => action && allowed.has(action.id))
    .slice(0, 4)
    .map((action) => ({ id: action.id, label: action.label || allowed.get(action.id).label || action.id }));
}

function normalizeKephText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bcr er\b/g, "creer")
    .replace(/\bcr e\b/g, "cree")
    .replace(/\bpr senter\b/g, "presenter")
    .replace(/\bpr sentation\b/g, "presentation")
    .replace(/\br pliques?\b/g, "replique")
    .replace(/\br glages?\b/g, "reglage")
    .replace(/\br gie\b/g, "regie")
    .replace(/\bdrole\b|\bdr le\b/g, "drole")
    .replace(/\bpo d\b/g, "poid")
    .trim();
}

function findKephLot(lots, rawName) {
  const wanted = normalizeKephText(rawName);
  if (!wanted) return null;
  const candidates = (Array.isArray(lots) ? lots : []).map((lot, index) => ({
    lot,
    index,
    name: String(lot?.name || ""),
    norm: normalizeKephText(lot?.name || "")
  }));
  const exact = candidates.find((entry) => entry.norm === wanted);
  if (exact) return exact;
  const partial = candidates.find((entry) => entry.norm.includes(wanted) || wanted.includes(entry.norm));
  if (partial) return partial;
  const best = candidates
    .map((entry) => ({ ...entry, score: wanted.split(" ").filter((part) => part && entry.norm.includes(part)).length }))
    .sort((a, b) => b.score - a.score)[0];
  return best?.score ? best : null;
}

const KEPH_UI_MAP = [
  {
    id: "launch",
    names: ["lancer", "bouton lancer", "demarrer la roue", "lancer la roue"],
    answer: "Lancer démarre un vrai tirage pour le participant actuel. Il peut consommer un stock, écrire dans l'historique et retirer un lancer au participant. À utiliser seulement quand tu es prêt à valider un vrai passage live.",
    danger: "Impact réel : stocks, historique et lancers participant.",
    actions: ["open_prepare"]
  },
  {
    id: "stop",
    names: ["stop", "bouton stop", "arreter la roue", "arrêter la roue"],
    answer: "Stop sert à arrêter la roue pendant un tirage. Il devient utile seulement quand la roue est en cours et que l'arrêt est autorisé. S'il est gris, c'est souvent parce qu'aucun vrai tirage n'est lancé ou que la scène n'est pas au bon état.",
    danger: "À utiliser pendant le tirage, pas pendant la préparation.",
    actions: ["open_prepare"]
  },
  {
    id: "test_draw",
    names: ["tirage test", "bouton tirage test", "test roulette", "test roue"],
    answer: "Tirage test sert à vérifier la roue sans conséquence. Il peut montrer un résultat fictif, tester l'ambiance et les sons, mais ne consomme pas les stocks, ne touche pas à l'historique et ne retire pas de lancer.",
    actions: ["open_prepare"]
  },
  {
    id: "next",
    names: ["suivant", "bouton suivant", "prochain", "candidat suivant"],
    answer: "Suivant charge le prochain candidat de la file. Utilise-le après un résultat validé ou si tu veux passer quelqu'un. Il change le participant affiché sur la scène et le contexte des dialogues.",
    actions: ["open_prepare"]
  },
  {
    id: "present",
    names: ["presenter les candidats", "présenter les candidats", "bouton presenter", "presentation candidats"],
    answer: "Présenter les candidats lance une intro de spectacle : Charlie/Victoria peuvent annoncer les participants et installer l'ambiance. Ça ne lance pas la roue, ne consomme aucun stock et n'écrit rien dans l'historique.",
    actions: ["open_scenario_studio"]
  },
  {
    id: "jingle_start",
    names: ["jingle debut", "jingle début", "bouton jingle", "jingle"],
    answer: "Jingle début déclenche le moment sonore/visuel d'ouverture prévu pour la scène. Les sons associés se règlent dans Sons, et les dialogues qui se jouent à ce moment se règlent dans l'étape Jingle du Studio de scénarios.",
    actions: ["open_scenario_studio", "open_audio"]
  },
  {
    id: "announce_candidate",
    names: ["annoncer le candidat", "annonce candidat", "bouton annonce"],
    answer: "Annoncer le candidat sert à mettre en avant le participant actuel avant son tirage. C'est une action de mise en scène : elle prépare le passage sans toucher aux lots, stocks ou historique.",
    actions: ["open_scenario_studio"]
  },
  {
    id: "finale",
    names: ["scene finale", "scène finale", "finale"],
    answer: "Scène finale lance la clôture du show. C'est prévu pour remercier les candidats, finir proprement et jouer les dialogues/effets de fin configurés dans le Studio de scénarios.",
    actions: ["open_scenario_studio"]
  },
  {
    id: "wheel_studio_lots",
    names: ["lots et roue", "studio roulette", "lots probabilites", "lots probabilités", "poids des lots", "stocks des lots"],
    answer: "Lots & roue ouvre le studio de la roulette. L'onglet Lots & probabilités sert à modifier les noms, poids, stocks, activation et disponibilité des lots. C'est là que tu règles ce qui peut tomber et avec quelle chance.",
    danger: "Peut changer les chances de tirage et la disponibilité des lots.",
    actions: ["open_wheel_studio_lots"]
  },
  {
    id: "wheel_studio_design",
    names: ["design png", "design et png", "apparence roue", "taille texte lot", "image lot", "png lot"],
    answer: "Design & PNG règle uniquement l'affichage de la roue : taille du texte, position, images, couleurs et lisibilité des cases. Ça ne change pas les probabilités ni les stocks.",
    actions: ["open_wheel_studio_design"]
  },
  {
    id: "scenario_studio",
    names: ["studio scenarios", "studio de scenarios", "studio scénarios", "dialogues", "repliques", "répliques"],
    answer: "Le Studio de scénarios sert à organiser les répliques de Charlie/Victoria par étape : présentation, jingle, pendant la roue, résultat, candidat suivant et finale. Tu peux y régler personnage, ciblage, emote, effet spécial et bruitage.",
    actions: ["open_scenario_studio"]
  },
  {
    id: "audio",
    names: ["sons", "audio", "volume", "mute", "couper les sons"],
    answer: "Sons sert à contrôler l'audio global : mute, volume des jingles, volume de la roulette et sons de scène. Les bruitages précis d'une réplique se règlent plutôt dans le Studio de scénarios, champ Bruitage.",
    actions: ["open_audio"]
  },
  {
    id: "save_data",
    names: ["sauvegarde", "historique", "csv"],
    answer: "Sauvegarde regroupe l'historique des vrais tirages, la correction du dernier tirage, l'export CSV et l'import/export du profil complet. C'est la zone sécurité pour garder ou restaurer une configuration.",
    actions: ["open_data"]
  },
  {
    id: "discord_mode",
    names: ["mode discord", "scene propre", "scène propre", "obs", "capture"],
    answer: "Le mode Discord/OBS sert à garder une scène publique propre pour la capture : roue, participant, résultat et dialogues, sans les boutons de régie. Pour piloter en même temps, utilise la régie détachée.",
    actions: ["highlight_discord", "detach_control"]
  },
  {
    id: "rehearsal",
    names: ["simulation", "simuler un passage", "mode repetition", "répétition"],
    answer: "Simuler un passage enchaîne un passage fictif pour régler le rythme avant le live. Ça ne touche pas aux stocks, ne remplit pas l'historique et ne retire pas de lancer.",
    actions: ["highlight_rehearsal"]
  }
];

function findKephUiEntry(message) {
  const text = normalizeKephText(message);
  const best = KEPH_UI_MAP
    .map((entry) => ({
      entry,
      score: entry.names.reduce((sum, name) => {
        const norm = normalizeKephText(name);
        if (!norm) return sum;
        if (text.includes(norm)) return sum + norm.split(" ").length + 2;
        const parts = norm.split(" ").filter((part) => part.length > 2);
        return sum + parts.filter((part) => text.includes(part)).length;
      }, 0)
    }))
    .sort((a, b) => b.score - a.score)[0];
  return best?.score > 1 ? best.entry : null;
}

function kephUiMapAnswer(message) {
  const text = normalizeKephText(message);
  if (!/\b(?:a quoi sert|sert a quoi|c est quoi|c quoi|explique|bouton|ou est|ou trouver|comment utiliser)\b/.test(text)) return null;
  const entry = findKephUiEntry(message);
  if (!entry) return null;
  const knowledge = charlieKephKnowledge();
  return {
    answer: entry.danger ? `${entry.answer} ${entry.danger}` : entry.answer,
    actions: normalizedKephActions(entry.actions, knowledge),
    source: "ui_map",
    matched: true,
    intent: `ui_${entry.id}`
  };
}

function kephDocumentation(context = {}) {
  const currentCandidate = String(context?.currentCandidate || "").trim();
  const activeSection = String(context?.activeSection || "").trim();
  const activePanel = String(context?.activePanel || context?.activeTab || context?.screen || "").trim();
  const activeControl = String(context?.activeControl || context?.currentControl || context?.focusedField || context?.selectedField || "").trim();
  const docs = kephSiteDocs();
  const structuredDocuments = Array.isArray(docs.documents) ? docs.documents : [];
  const manualDocuments = kephSiteManualDocs();
  if (structuredDocuments.length) {
    return [
      ...structuredDocuments.map((doc) => ({
        ...doc,
        content: doc.content || doc.answer || "",
        examples: Array.isArray(doc.examples) ? doc.examples : []
      })),
      ...manualDocuments,
      {
        id: "context",
        title: "Contexte actuel de la regie",
        keywords: ["maintenant", "actuel", "contexte", "ou je suis", "quoi faire"],
        actions: activeSection ? [activeSection === "wheel" ? "open_wheel_studio_lots" : activeSection === "show" ? "open_scenario_studio" : activeSection === "audio" ? "open_audio" : activeSection === "data" ? "open_data" : "open_prepare"] : [],
        content: `Contexte lu par Keph: candidat affiche=${currentCandidate || "aucun"}, section active=${activeSection || "inconnue"}, panneau actif=${activePanel || "inconnu"}, controle/champ actif=${activeControl || "inconnu"}, configuration ouverte=${context?.configOpen ? "oui" : "non"}, lots disponibles=${Number(context?.availableLots || 0)}, son coupe=${context?.soundMuted ? "oui" : "non"}. Le nom du candidat affiche n'est pas le nom de l'organisateur.`
      }
    ];
  }
  return [
    {
      id: "purpose",
      title: "A quoi sert Charlie Roulette",
      keywords: ["site", "application", "charlie roulette", "but", "objectif", "sert"],
      content: "Charlie Roulette est une regie de tirage en live. L'organisateur prepare une file de candidats, des lots, des stocks, des sons, des dialogues et des effets, puis pilote une scene publique propre pour Discord/OBS. La regie controle le live; la configuration prepare les donnees et le spectacle."
    },
    {
      id: "live_controls",
      title: "Regie live",
      keywords: ["lancer", "stop", "suivant", "tirage test", "dernier tirage", "live simple", "regie"],
      actions: ["open_prepare"],
      content: "Lancer demarre un vrai tirage: il peut consommer un stock, enregistrer l'historique et retirer un lancer au participant. Stop arrete la roue seulement quand le tirage est en cours. Tirage test sert a tester sans toucher aux stocks ni a l'historique. Suivant passe au prochain candidat. Dernier tirage sert a rappeler le dernier resultat utile en animation."
    },
    {
      id: "first_live_steps",
      title: "Par quoi commencer avant un live",
      keywords: ["par quoi commencer", "commencer avant live", "premier live", "je suis perdu", "preparer live", "avant live"],
      actions: ["open_prepare", "highlight_rehearsal"],
      content: "Avant un live, commence par Preparer: charge la file de participants, verifie le participant actuel et les lancers. Ensuite va dans Lots & roue pour verifier poids, stocks et lots disponibles. Puis teste Sons et Scenes avec Simuler un passage. Quand la checklist pre-live est verte, passe en scene Discord/OBS propre."
    },
    {
      id: "participants",
      title: "Participants et lancers",
      keywords: ["participant", "candidat", "file", "queue", "lancers", "participation", "tentative"],
      actions: ["open_prepare"],
      content: "Dans Preparer, l'organisateur charge une file avec un pseudo par ligne. Le participant actuel est celui affiche sur la scene. Chaque participant peut avoir un nombre de lancers/tickets; a chaque vrai tirage, le compteur descend. Quand ses lancers sont termines, on passe au suivant."
    },
    {
      id: "lots",
      title: "Lots, poids, stocks et activation",
      keywords: ["lot", "lots", "poids", "probabilite", "stock", "indisponible", "activer", "desactiver", "roue"],
      actions: ["open_wheel_studio_lots"],
      content: "Dans Lots & roue > Studio de la roulette > Lots & probabilites, chaque case a un nom, un poids, une activation et eventuellement un stock. Le poids est une chance relative: 20 sort environ deux fois plus souvent que 10. Si le stock est active et arrive a zero, le lot devient indisponible pour les prochains candidats. Desactiver un lot le retire de la roue sans le supprimer."
    },
    {
      id: "wheel_design",
      title: "Design et PNG de la roue",
      keywords: ["design", "png", "image", "taille texte", "police", "couleur", "case", "visuel"],
      actions: ["open_wheel_studio_design"],
      content: "Design & PNG regle uniquement l'affichage des cases: texte, taille, position, rotation, image, couleur et lisibilite. Ca ne change pas les probabilites, les stocks ni les chances de tirage."
    },
    {
      id: "scenarios",
      title: "Studio de scenarios",
      keywords: ["dialogue", "replique", "scenario", "scene", "victoria", "charlie", "presentation", "jingle", "resultat", "finale"],
      actions: ["open_scenario_studio"],
      content: "Le Studio de scenarios organise les repliques par etape: Presentation, Jingle, Temps mort/Pendant la roue, Apres le resultat, Candidat suivant et Scene finale. Chaque replique peut avoir un personnage, un type, un ciblage, une emote, un effet special et un bruitage. Le mode dialogue parle affiche une bulle de parole; l'indication scenique affiche une action plus discrete de type /me."
    },
    {
      id: "presentation_dialogues",
      title: "Modifier les dialogues de presentation",
      keywords: ["modifier dialogue presentation", "modifier dialogues presentation", "dialogue presenter candidats", "dialogues presenter candidats", "replique presentation", "presentation candidats"],
      actions: ["open_scenario_studio"],
      content: "Oui, les dialogues joues par le bouton Presenter les candidats sont modifiables. Il faut ouvrir Reglages > Scenes > Studio de scenarios, choisir l'etape Presentation dans la colonne de gauche, puis modifier, supprimer ou ajouter les repliques de Charlie/Victoria. Ces changements affectent l'intro spectacle, pas les stocks ni l'historique."
    },
    {
      id: "dialogue_targeting",
      title: "Ciblage des dialogues",
      keywords: ["cibler", "ciblage", "candidat cible", "participant cible", "tous les candidats", "candidat actuel"],
      actions: ["open_scenario_studio"],
      content: "Le ciblage d'une replique sert a choisir pour qui elle peut se jouer. Tous les candidats = replique generale. Candidat actuel = la replique utilise le candidat en train de passer. Candidat cible = la replique ne sort que pour un pseudo precis. C'est utile pour preparer une phrase speciale pour Kinza, Barbaric, etc. sans qu'elle apparaisse pour les autres."
    },
    {
      id: "dialogue_audio",
      title: "Bruitage sur une replique",
      keywords: ["mp3", "wav", "ogg", "bruitage", "son dialogue", "audio replique", "bibliotheque"],
      actions: ["open_scenario_studio"],
      content: "Pour mettre un son sur une replique, ouvrir le Studio de scenarios, selectionner ou creer la replique, puis utiliser le champ Bruitage dans le panneau de droite. Si le fichier n'est pas encore disponible, le bouton Importer a cote du champ Bruitage ajoute un MP3/WAV/OGG a la bibliotheque et le selectionne pour la replique en cours."
    },
    {
      id: "dialogue_types",
      title: "Dialogue parle ou indication scenique",
      keywords: ["dialogue parle", "indication scenique", "type dialogue", "type replique", "slash me", "/me"],
      actions: ["open_scenario_studio"],
      content: "Une replique en Dialogue parle affiche une vraie bulle de parole pour Charlie ou Victoria. Une Indication scenique est plus discrete: elle decrit une action de scene, comme un /me, par exemple Charlie observe la roue ou Victoria applaudit. Dialogue parle sert a faire entendre un texte au public; indication scenique sert a donner de la vie sans voler l'attention."
    },
    {
      id: "dialogue_queue",
      title: "Pilotage et file de dialogues",
      keywords: ["file dialogue", "file dialogues", "suivant dialogue", "passer dialogue", "rejouer dialogue", "auto manuel", "manuel"],
      actions: ["open_scenario_studio"],
      content: "La file de dialogues permet de garder la main sur ce que Charlie/Victoria vont dire. Suivant joue la prochaine replique, Passer la saute, Rejouer relance la replique actuelle, Vider nettoie la file. En Auto, le site enchaine selon la scene; en Manuel, l'organisateur controle le rythme."
    },
    {
      id: "emotes_effects",
      title: "Emotes et effets speciaux",
      keywords: ["emote", "emoji", "effet", "confetti", "firework", "flash", "fumee", "glitch", "projecteur"],
      actions: ["open_scenario_studio"],
      content: "Les emotes donnent une expression au dialogue. Les effets speciaux sont des animations CSS declenchees par une replique: confettis, feu d'artifice, flash plateau, coupure lumiere, projecteurs, spotlight, shake leger, glitch, pluie d'etoiles, fumee, vague doree et alerte rouge. Ils n'influencent pas le tirage."
    },
    {
      id: "show_options",
      title: "Options Charlie Show et dialogues inclus",
      keywords: ["charlie show", "dialogues inclus", "dialogues par defaut", "annoncer automatiquement", "candidat suivant automatique", "option cochable"],
      actions: ["open_scenario_studio"],
      content: "Activer Charlie Show autorise les interventions de Charlie/Victoria pendant le live. Dialogues inclus active les repliques par defaut fournies avec le site; si l'option est coupee, seules tes repliques personnalisees peuvent jouer. Annoncer automatiquement le candidat suivant declenche une annonce apres un tirage valide, utile si tu veux que la scene enchaine sans cliquer a chaque fois."
    },
    {
      id: "scene_presets",
      title: "Presets et boutons de scene",
      keywords: ["preset", "presets", "tirage normal", "pause", "annonce candidat", "resultat", "scene finale", "jingle debut"],
      actions: ["open_scenario_studio"],
      content: "Les presets servent a changer rapidement l'ambiance de scene. Tirage normal remet la roue au centre, Annonce candidat met le participant en avant, Pause nettoie la scene, Resultat focalise le public sur le lot obtenu, Scene finale lance la cloture. Jingle debut joue l'ouverture sonore/visuelle du show."
    },
    {
      id: "audio",
      title: "Sons et volumes",
      keywords: ["son", "sons", "audio", "jingle", "volume", "mute", "couper"],
      actions: ["open_audio"],
      content: "La section Sons gere le mute global, le volume des jingles, le volume de la roulette et les sons de scene. Les bruitages attaches a une replique se reglent dans le Studio de scenarios, pas seulement dans Sons."
    },
    {
      id: "shortcuts",
      title: "Raccourcis clavier",
      keywords: ["raccourci", "raccourcis", "clavier", "espace", "entree", "touche", "touches"],
      actions: ["open_shortcuts"],
      content: "Les raccourcis clavier servent a piloter la regie sans viser les boutons pendant le live. Espace peut lancer, Entree peut stopper, et les touches affichees entre parentheses sur les boutons declenchent les actions rapides comme Presenter, Jingle ou Finale. Dans Preparer > Raccourcis, clique un champ puis appuie sur la touche voulue."
    },
    {
      id: "simulation_checklist_alerts",
      title: "Simulation, checklist et alertes",
      keywords: ["simulation", "simuler", "repetition", "checklist", "pre live", "alerte", "alertes", "pret", "pret live"],
      actions: ["highlight_rehearsal"],
      content: "Simuler un passage enchaine un passage fictif pour tester le rythme sans toucher aux stocks, a l'historique ni aux vrais lancers. La checklist pre-live verifie participants, lots disponibles, stocks, son, scene propre et raccourcis. Les alertes previennent avant de lancer: lots indisponibles, son coupe, file bientot terminee ou stock manquant."
    },
    {
      id: "discord",
      title: "Scene Discord OBS",
      keywords: ["discord", "obs", "capture", "scene propre", "plein ecran", "detacher"],
      actions: ["highlight_discord", "detach_control"],
      content: "La scene Discord/OBS doit montrer seulement la partie publique: roue, participant, resultat et dialogues. Pour ne pas capturer les controles admin, utiliser le mode scene propre ou detacher la regie dans une autre fenetre."
    },
    {
      id: "history_data",
      title: "Historique, sauvegarde et profil",
      keywords: ["historique", "gagnant", "csv", "export", "import", "profil", "sauvegarde", "corriger"],
      actions: ["open_data"],
      content: "Sauvegarde regroupe l'historique des vrais tirages, le dernier gagnant, les gagnants par participant, la correction du dernier tirage, l'export CSV et l'import/export du profil complet. Les tirages test et simulations ne doivent pas remplir l'historique reel."
    },
    {
      id: "keph_learning",
      title: "Keph, logs et apprentissage",
      keywords: ["keph", "logs", "like", "dislike", "apprendre", "entrainer", "journal apprentissage", "reponse utile"],
      actions: [],
      content: "Keph utilise la documentation du site, le contexte de la regie et les retours like/dislike. Un dislike avec une raison devient un exemple d'erreur a eviter; un like devient un exemple de style a viser. Le bouton Logs affiche les derniers retours classes pour aider a enrichir la documentation."
    },
    {
      id: "context",
      title: "Contexte actuel de la regie",
      keywords: ["maintenant", "actuel", "contexte", "ou je suis", "quoi faire"],
      actions: activeSection ? [activeSection === "wheel" ? "open_wheel_studio_lots" : activeSection === "show" ? "open_scenario_studio" : activeSection === "audio" ? "open_audio" : activeSection === "data" ? "open_data" : "open_prepare"] : [],
      content: `Contexte lu par Keph: candidat affiche=${currentCandidate || "aucun"}, section active=${activeSection || "inconnue"}, panneau actif=${activePanel || "inconnu"}, controle/champ actif=${activeControl || "inconnu"}, configuration ouverte=${context?.configOpen ? "oui" : "non"}, lots disponibles=${Number(context?.availableLots || 0)}, son coupe=${context?.soundMuted ? "oui" : "non"}. Le nom du candidat affiche n'est pas le nom de l'organisateur.`
    }
  ];
}

function kephDocumentationSearch(message, context = {}) {
  const text = normalizeKephText(message);
  const tokens = new Set(text.split(" ").filter((part) => part.length > 2));
  const allDocs = kephDocumentation(context);
  const forcedIds = [];
  if (/\b(?:tu connais keph|qui est keph|qui es tu|tu es qui|tu t appelles comment)\b/.test(text)) forcedIds.push("keph_identity_human");
  if (/\b(?:a quoi sert|sert a quoi|que fait|ca fait quoi|pourquoi)\b/.test(text) && /\b(?:bouton\s+)?lancer\b/.test(text)) forcedIds.push("button_launch");
  if (/\b(?:a quoi sert|sert a quoi|que fait|ca fait quoi|pourquoi|quand utiliser)\b/.test(text) && /\bstop\b/.test(text)) forcedIds.push("button_stop");
  if (/\b(?:a quoi sert|sert a quoi|que fait|ca fait quoi|pourquoi|comment passer)\b/.test(text) && /\b(?:suivant|candidat suivant|participant suivant)\b/.test(text)) forcedIds.push("button_next");
  if (/\b(?:a quoi sert|sert a quoi|que fait|ca fait quoi|pourquoi)\b/.test(text) && /\b(?:presenter les candidats|presente les candidats|presentation candidats)\b/.test(text)) forcedIds.push("present_candidates_button");
  if (/\b(?:a quoi sert|sert a quoi|que fait|ca fait quoi|pourquoi|quand)\b/.test(text) && /\bjingle\b/.test(text)) forcedIds.push("jingle_button");
  if (/\b(?:a quoi sert|sert a quoi|que fait|ca fait quoi|pourquoi|quand)\b/.test(text) && /\b(?:scene finale|finale)\b/.test(text)) forcedIds.push("finale_button");
  if (/\b(?:comment|ou|où|ajouter|mettre|charger)\b/.test(text) && /\b(?:candidat|candidats|participant|participants|pseudo|pseudos)\b/.test(text) && !/\b(?:dialogue|replique)\b/.test(text)) forcedIds.push("add_candidates_howto");
  if (/\b(?:verifier|vérifier|check|controler|contrôler)\b/.test(text) && /\b(?:lot|lots|roue|stocks?)\b/.test(text)) forcedIds.push("verify_lots_purpose");
  if (/\b(?:couleur|couleurs|design|png|lisibilite|visuel)\b/.test(text) && /\b(?:case|cases|roue|lot|lots)\b/.test(text)) forcedIds.push("lot_color_design");
  if (/\b(?:comment|ou|où|creer|créer|cree|crée|ajouter|ecrire|écrire)\b/.test(text) && /\b(?:dialogue|replique|phrase)\b/.test(text) && !/\b(?:son|audio|mp3|bruitage|effet|emote|variable|bouton)\b/.test(text)) forcedIds.push("create_dialogue_howto_precise");
  if (/\b(?:import|importe|importer|restaurer|charger|recuperer|récupérer)\b/.test(text) && /\b(?:profil|profile|sauvegarde|configuration|pc|ordinateur|navigateur)\b/.test(text)) forcedIds.push("import_profile");
  if (/\b(?:export|exporte|exporter|backup|telecharger|sauvegarder|garder|deplacer|déplacer|changer)\b/.test(text) && /\b(?:profil|profile|sauvegarde|configuration|pc|ordinateur|navigateur)\b/.test(text)) forcedIds.push("export_profile");
  if (/\b(?:candidat actuel|candidat suivant|dernier lot|lot concerne|lot concerné|nombre de candidats|nombre de gagnants|bouton|boutons|variable|variables)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques|phrase)\b/.test(text)) forcedIds.push("dialogue_tokens");
  if (/\b(?:annoncer automatiquement|annonce automatique|option cochable annoncer|option annoncer|candidat suivant automatique)\b/.test(text)) forcedIds.push("show_options");
  if (/\b(?:a quoi sert|sert a quoi|ca sert a quoi|pourquoi|utilite)\b/.test(text) && !/\b(?:dialogue|dialogues|replique|repliques|option|cochable|annoncer|automatiquement)\b/.test(text) && /\b(?:participant|participants|candidat|candidats|file|liste d attente|file d attente)\b/.test(text)) forcedIds.push("participant_purpose");
  if (/\b(?:comment|ajouter|creer|cree|mettre)\b/.test(text) && /\b(?:lot|lots|case|roue|roulette)\b/.test(text) && !/\b(?:dialogue|replique)\b/.test(text)) forcedIds.push("add_lot_howto");
  if (/\b(?:maximum|max|limite|combien|nombre)\b/.test(text) && /\b(?:lot|lots|case|cases|roue|roulette)\b/.test(text)) forcedIds.push("wheel_lot_limit");
  if (/\b(?:nouveau|premiere fois|jamais utilise|je suis perdu|utiliser le site|guide moi|me guider|commencer)\b/.test(text) && !/\b(?:pc|ordinateur|export|importe|importer|import|profil|profile)\b/.test(text)) forcedIds.push("first_live_steps");
  if (forcedIds.length) {
    const forcedDocs = forcedIds
      .map((id, index) => allDocs.find((doc) => doc.id === id) ? { ...allDocs.find((doc) => doc.id === id), score: 100 - index } : null)
      .filter(Boolean);
    const contextDoc = allDocs.find((doc) => doc.id === "context");
    return contextDoc ? [...forcedDocs, { ...contextDoc, score: 1 }].slice(0, 2) : forcedDocs.slice(0, 2);
  }
  return allDocs
    .map((doc) => {
      const haystack = normalizeKephText(`${doc.title} ${(doc.keywords || []).join(" ")} ${doc.content || ""} ${doc.answer || ""} ${(doc.examples || []).join(" ")}`);
      let score = 0;
      const activeSection = normalizeKephText(context?.activeSection || "");
      const activePanel = normalizeKephText(`${context?.activePanel || ""} ${context?.activeTab || ""} ${context?.screen || ""}`);
      const activeControl = normalizeKephText(`${context?.activeControl || ""} ${context?.currentControl || ""} ${context?.focusedField || ""} ${context?.selectedField || ""}`);
      tokens.forEach((token) => { if (haystack.includes(token)) score += 1; });
      (doc.keywords || []).forEach((keyword) => {
        const normalizedKeyword = normalizeKephText(keyword);
        if (!normalizedKeyword) return;
        if (text.includes(normalizedKeyword)) score += normalizedKeyword.includes(" ") ? 18 : 4;
      });
      (doc.examples || []).forEach((example) => {
        const normalizedExample = normalizeKephText(example);
        if (!normalizedExample) return;
        if (text.includes(normalizedExample) || (text.length > 8 && normalizedExample.includes(text))) score += 24;
      });
      if (activeSection && doc.section && normalizeKephText(doc.section) === activeSection) score += 3;
      if (activePanel && haystack.includes(activePanel)) score += 8;
      if (activeControl && haystack.includes(activeControl)) score += 16;
      if (doc.id === "context" && context?.activeSection) score += 1;
      return { ...doc, score };
    })
    .filter((doc) => doc.score > 0 || doc.id === "context")
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((doc) => ({ ...doc, score: doc.score }));
}

function kephVerifiedDocs(message, context = {}) {
  return kephDocumentationSearch(message, context)
    .filter((doc) => doc.id !== "context" && Number(doc.score || 0) >= 8);
}

function kephDocCard(doc) {
  const answer = String(doc.answer || doc.content || "").trim();
  return {
    id: doc.id,
    section: doc.section || "",
    title: doc.title || doc.id,
    location: doc.location || doc.where || "",
    purpose: doc.purpose || answer,
    live_use: doc.live_use || "",
    modifies: doc.modifies || "",
    does_not_modify: doc.does_not_modify || "",
    direct_action: doc.direct_action || "",
    answer,
    actions: doc.actions || []
  };
}

function isKephSiteQuestion(message) {
  const text = normalizeKephText(message);
  return /\b(?:site|application|bouton|option|live|preparer|studio|show|charlie|victoria|roulette|regie|roue|lot|lots|stock|poid|poids|participant|candidat|dialogue|replique|scenario|scene|jingle|son|audio|bruitage|mp3|discord|obs|historique|profil|profile|sauvegarde|raccourci|lancer|stop|tirage|configuration|keph|emote|effet|ciblage)\b/.test(text);
}

function kephDiagnostics(message, context = {}) {
  const text = normalizeKephText(message);
  const asksProblem = /\b(?:probleme|bug|impossible|marche pas|peux pas|peut pas|bloque|bloquee|bloqué|bloquée|gris|grise|grisé|grisee|erreur)\b/.test(text);
  const asksReady = /\b(?:pret|prêt|check|diagnostic|avant live|tout va bien|je peux lancer)\b/.test(text)
    || (/\b(?:verifier|vérifier)\b/.test(text) && !/\b(?:a quoi sert|sert a quoi|pourquoi|utilite|ça sert|ca sert)\b/.test(text));
  if (!asksProblem && !asksReady) return null;

  const lots = Array.isArray(context.lots) ? context.lots : [];
  const unavailableNames = Array.isArray(context.unavailableLots)
    ? context.unavailableLots.filter(Boolean).slice(0, 5)
    : lots.filter((lot) => !lot.available).map((lot) => lot.name).slice(0, 5);
  const availableLots = Number.isFinite(Number(context.availableLots))
    ? Number(context.availableLots)
    : lots.filter((lot) => lot.available).length;
  const currentCandidate = String(context.currentCandidate || "").trim();
  const queueRemaining = Number(context.queueRemaining || 0);
  const stage = String(context.stage || "ready");
  const blockers = [];
  const warnings = [];

  if (!currentCandidate) blockers.push("aucun participant actuel n'est défini");
  if (!availableLots) blockers.push("aucun lot disponible n'est actif dans la roue");
  else if (unavailableNames.length) warnings.push(`${unavailableNames.length} lot(s) indisponible(s) : ${unavailableNames.join(", ")}`);
  if (context.soundMuted) warnings.push("le son global est coupé");
  if (queueRemaining <= 0 && /\b(?:suivant|file|queue|prochain)\b/.test(text)) warnings.push("la file semble arrivée à la fin");
  if (stage === "spinning" && /\b(?:lancer|roue|tirage)\b/.test(text)) blockers.push("la roue est déjà en cours");
  if (stage !== "spinning" && /\bstop\b/.test(text)) blockers.push("Stop est normalement indisponible tant qu'un vrai tirage n'est pas en cours");

  const actionIds = new Set(["open_prepare"]);
  if (!availableLots || unavailableNames.length) actionIds.add("open_wheel_studio_lots");
  if (context.soundMuted) actionIds.add("open_audio");

  if (!blockers.length && !warnings.length) {
    return {
      answer: `Diagnostic rapide : je ne vois pas de blocage évident. Participant actuel : ${currentCandidate || "non renseigné"}, lots disponibles : ${availableLots}, état scène : ${stage}. Si un bouton reste bloqué, ouvre la zone concernée et vérifie l'étape actuelle du live.`,
      actions: normalizedKephActions([...actionIds], charlieKephKnowledge()),
      source: "diagnostic",
      matched: true,
      intent: "diagnostic_ok"
    };
  }

  if (!blockers.length) {
    return {
      answer: `Tu peux lancer, mais attention : ${warnings.join("; ")}. Ce n'est pas forcément bloquant, simplement à vérifier avant le live.`,
      actions: normalizedKephActions([...actionIds], charlieKephKnowledge()),
      source: "diagnostic",
      matched: true,
      intent: "diagnostic_warning"
    };
  }

  return {
    answer: `Diagnostic rapide : ${blockers.join("; ")}${warnings.length ? `. À vérifier aussi : ${warnings.join("; ")}` : ""}. Corrige ces points avant de lancer un vrai tirage, surtout si tu es en live.`,
    actions: normalizedKephActions([...actionIds], charlieKephKnowledge()),
    source: "diagnostic",
    matched: true,
    intent: "diagnostic_warning"
  };
}

function parseKephCommand(message, context = {}) {
  const raw = String(message || "").trim();
  const normalized = normalizeKephText(raw);
  const triggerLabels = { presentation: "Presentation", jingle: "Jingle", spin: "Pendant la roue", result: "Resultat", next: "Candidat suivant", finale: "Finale" };
  const activeControlText = normalizeKephText(`${context?.activeControl || ""} ${context?.currentControl || ""} ${context?.focusedField || ""} ${context?.selectedField || ""}`);
  if (/^(?:a quoi sert|sert a quoi|ca sert a quoi|c est quoi|c quoi|pourquoi)\s*\??$/.test(normalized) && activeControlText) {
    const doc = kephDocumentationSearch(`${raw} ${activeControlText}`, context).find((item) => item.id !== "context");
    if (doc) {
      return {
        answer: doc.answer || doc.content || "Je vois le champ actif, mais je n'ai pas assez de detail pour l'expliquer proprement.",
        actions: normalizedKephActions(doc.actions || [], charlieKephKnowledge()),
        source: "conversation",
        intent: doc.id || "contextual_help"
      };
    }
  }
  if (/\b(?:idee|idees|idée|idées|tu ferais quoi|propose|suggestion|inspire)\b/.test(normalized) && /\b(?:dialogue|dialogues|replique|repliques)\b/.test(normalized) && /\bjingle\b/.test(normalized)) {
    return {
      answer: "Pour un jingle drôle, je partirais sur des phrases courtes et faciles à jouer en live. Exemples : « Le jingle part, la dignité reste en coulisses. », « Victoria, vérifie que la roue n'a pas signé chez la concurrence. », « Le hasard entre sur scène, merci de ne pas le regarder directement. », « Si ça clignote, c'est normal. Si ça explose, c'était prévu. »",
      actions: [{ id: "open_scenario_studio", label: "Ouvrir le studio" }],
      source: "conversation",
      intent: "jingle_dialogue_ideas"
    };
  }
  const triggerFromText = () => /\bfinale\b/.test(normalized) ? "finale"
    : /\b(?:suivant|prochain candidat|annonce candidat)\b/.test(normalized) ? "next"
      : /\b(?:resultat|gagnant|lot obtenu)\b/.test(normalized) ? "result"
        : /\b(?:roue|tirage|rotation|pendant)\b/.test(normalized) ? "spin"
          : /\bjingle\b/.test(normalized) ? "jingle"
            : "presentation";
  const controlledCommands = [];
  const addControlled = (command) => { if (command && kephCommandAllowed(command) && !controlledCommands.includes(command)) controlledCommands.push(command); };
  const participantNames = [...new Set([
    ...(Array.isArray(context.queue) ? context.queue : []),
    context.currentCandidate,
    context.nextParticipant
  ].map(cleanKephName).filter(Boolean))];
  const helpOnly = /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi|explique|pourquoi|comment je peux|comment faire|comment ajouter|comment creer|comment modifier|comment utiliser|ou est|ou trouver|ca sert a quoi)\b/.test(normalized);
  const explicitDoNow = /\b(?:tu peux|peux tu|peux-tu|stp|s il te plait|maintenant)\b/.test(normalized)
    && /\b(?:ajoute|ajouter|cree|creer|mets|mettre|met|modifie|modifier|change|changer|renomme|renommer|supprime|supprimer|vide|vider|active|activer|desactive|desactiver|lance|lancer|joue|jouer|ouvre|ouvrir)\b/.test(normalized)
    && !/\b(?:m aider|m expliquer|me guider|comment)\b/.test(normalized);
  if (helpOnly && !explicitDoNow) return null;
  if (/\b(?:dialogue|dialogues|replique|repliques)\b/.test(normalized)
    && /\b(?:presenter|presentation|présenter|présentation)\b/.test(normalized)
    && /\b(?:candidat|candidats|participant|participants)\b/.test(normalized)
    && /\b(?:cree|creer|crée|créer|fais|faire|prepare|preparer|prépare|préparer|genere|generer|génère|générer|ecris|ecrire|écris|écrire)\b/.test(normalized)) {
    const count = kephRequestedCount(raw, Math.min(5, Math.max(1, participantNames.length || 5)));
    kephCandidatePresentationDialogueCommands(participantNames, count).forEach(addControlled);
  }
  if (!controlledCommands.length && /\b(?:file|liste|queue|candidats|participants)\b/.test(normalized) && /\b(?:cree|creer|charge|charger|genere|generer|profil demo|3 candidats|trois candidats)\b/.test(normalized)) {
    const names = kephNamesFromListText(raw.split(/:|avec|pour/i).pop() || raw);
    const picked = names.length >= 2 ? names : ["Mira", "Grobid", "Tofu-Royal"];
    addControlled(`set_queue ${picked.slice(0, 6).map(quoteCommandArg).join(" ")}`);
  }
  if (/\b(?:roue|roulette|lots?)\b/.test(normalized) && /\b(?:complete|6|six|cree|creer|genere|generer)\b/.test(normalized)) {
    const lots = [
      ["Ticket VIP du Chaos", 26, 4, "#c1121f"],
      ["Bourse qui clignote 200.000k", 18, 3, "#023e8a"],
      ["Relance du Destin", 16, 2, "#ffd60a"],
      ["Cadeau mystere suspect", 14, 2, "#2dc653"],
      ["Malus: compliment a Charlie", 12, 5, "#6f2dbd"],
      ["Jackpot des Kamavores", 6, 1, "#f77f00"]
    ];
    addControlled("clear_lots");
    lots.forEach(([name, weight, stock, color]) => {
      addControlled(`add_lot ${quoteCommandArg(name)} ${weight} ${stock}`);
      addControlled(`set_lot_color ${quoteCommandArg(name)} ${quoteCommandArg(color)}`);
    });
  }
  if (/\b(?:regle|regler|configure|configurer)\b/.test(normalized) && /\b(?:show|profil|dynamique|anti repetition|humeur|dialogues)\b/.test(normalized)) {
    addControlled('set_setting "antiRepeatEnabled" "true"');
    addControlled('set_setting "antiRepeatMode" "session"');
    addControlled('set_setting "defaultDialoguesEnabled" "false"');
    addControlled('set_setting "showFrequency" "normal"');
    addControlled('set_setting "dialogueMode" "timed"');
    addControlled('set_setting "dialogueDuration" "7"');
    addControlled('set_setting "charlieMood" "taquin"');
    addControlled('set_setting "launchTrollChance" "12"');
  }
  const lotNames = Array.isArray(context.lots) ? context.lots.map((lot) => String(lot.name || "")).filter(Boolean) : [];
  const findMentionedLot = (hint = "") => {
    const exact = lotNames.find((name) => text.includes(normalizeKephText(name)));
    if (exact) return exact;
    const fromHint = findKephBestName(lotNames, hint);
    if (fromHint) return fromHint;
    const rawTokens = normalizeKephText(raw).split(/\s+/).filter((token) => token.length > 2);
    let best = "";
    let bestScore = 0;
    for (const name of lotNames) {
      const nameTokens = normalizeKephText(name).split(/\s+/).filter((token) => token.length > 2);
      const score = nameTokens.filter((token) => rawTokens.includes(token)).length;
      if (score > bestScore) {
        best = name;
        bestScore = score;
      }
    }
    return bestScore >= 2 ? best : "";
  };
  const directRename = raw.match(/\b(?:renomme|renommer|renome|renomer|appelle|nomme)\s+(?:le\s+)?(?:lot\s+)?(.+?)\s+(?:en|vers)\s+(.+?)(?:[?.!]|$)/i);
  if (directRename) addControlled(`rename_lot ${quoteCommandArg(findMentionedLot(cleanKephName(directRename[1])) || cleanKephName(directRename[1]))} ${quoteCommandArg(cleanKephName(directRename[2]))}`);
  if (/\b(?:supprime|supprimer|vide|vider|efface|effacer|retire|retirer)\b/.test(normalized) && /\b(?:file|liste|queue|attente|candidats|participants)\b/.test(normalized)) addControlled("clear_queue");
  const explicitQueue = raw.match(/\b(?:charge|charger|remplace|remplacer|mets|mettre)\s+(?:la\s+)?(?:file|liste|queue|liste d'attente|file d'attente)\s*(?:avec|par|:)?\s*(.+)$/i);
  const orderedQueue = /\b(?:tete de liste|tête de liste|en tete|en tête|premier|deux|deuxieme|deuxième|trois|troisieme|troisième)\b/.test(normalized)
    && /\b(?:liste|file|queue|ordre|candidats|participants)\b/.test(normalized);
  const parsedQueueNames = explicitQueue ? kephNamesFromListText(explicitQueue[1]) : orderedQueue ? kephNamesFromListText(raw) : [];
  if (!controlledCommands.length && parsedQueueNames.length) {
    const normalizedQueueNames = [...new Set(parsedQueueNames.map((name) => findKephBestName(participantNames, name) || name))];
    const rest = explicitQueue ? [] : participantNames.filter((name) => !normalizedQueueNames.some((item) => normalizeKephText(item) === normalizeKephText(name)));
    addControlled(`set_queue ${[...normalizedQueueNames, ...rest].map(quoteCommandArg).join(" ")}`);
  }
  if (!controlledCommands.length && /\b(?:file|liste|queue|candidats|participants)\b/.test(normalized) && /\b(?:cree|creer|charge|charger|genere|generer|profil demo|3 candidats|trois candidats)\b/.test(normalized)) {
    const names = kephNamesFromListText(raw.split(/:|avec|pour/i).pop() || raw);
    const picked = names.length >= 2 ? names : ["Mira", "Grobid", "Tofu-Royal"];
    addControlled(`set_queue ${picked.slice(0, 6).map(quoteCommandArg).join(" ")}`);
  }
  if (/\b(?:roue|roulette|lots?)\b/.test(normalized) && /\b(?:complete|6|six|cree|creer|genere|generer)\b/.test(normalized)) {
    const lots = [
      ["Ticket VIP du Chaos", 26, 4, "#c1121f"],
      ["Bourse qui clignote 200.000k", 18, 3, "#023e8a"],
      ["Relance du Destin", 16, 2, "#ffd60a"],
      ["Cadeau mystere suspect", 14, 2, "#2dc653"],
      ["Malus: compliment a Charlie", 12, 5, "#6f2dbd"],
      ["Jackpot des Kamavores", 6, 1, "#f77f00"]
    ];
    addControlled("clear_lots");
    lots.forEach(([name, weight, stock, color]) => {
      addControlled(`add_lot ${quoteCommandArg(name)} ${weight} ${stock}`);
      addControlled(`set_lot_color ${quoteCommandArg(name)} ${quoteCommandArg(color)}`);
    });
  }
  if (/\b(?:regle|regler|configure|configurer)\b/.test(normalized) && /\b(?:show|profil|dynamique|anti repetition|humeur|dialogues)\b/.test(normalized)) {
    addControlled('set_setting "antiRepeatEnabled" "true"');
    addControlled('set_setting "antiRepeatMode" "session"');
    addControlled('set_setting "defaultDialoguesEnabled" "false"');
    addControlled('set_setting "showFrequency" "normal"');
    addControlled('set_setting "dialogueMode" "timed"');
    addControlled('set_setting "dialogueDuration" "7"');
    addControlled('set_setting "charlieMood" "taquin"');
    addControlled('set_setting "launchTrollChance" "12"');
  }
  if (/\b(?:discord|obs|scene propre|mode capture)\b/.test(normalized) && /\b(?:active|activer|mets|mode|passe|passer)\b/.test(normalized)) addControlled("discordmode");
  if (/\b(?:detache|detacher|separe|separer)\b/.test(normalized) && /\b(?:regie|controle|panneau)\b/.test(normalized)) addControlled("detach_control");
  if (!controlledCommands.length && /\b(?:dialogue|dialogues|replique|repliques)\b/.test(normalized) && /\b(?:jingle|presentation|finale|resultat|roue|candidat suivant)\b/.test(normalized) && /\b(?:plusieurs|quelques|3|trois|4|quatre|5|cinq|fais|faire|prepare|preparer|genere|generer)\b/.test(normalized)) {
    const trigger = triggerFromText();
    const candidatesPart = raw.split(/(?:candidats?|participants?)\s*:?\s*/i).pop() || "";
    const names = candidatesPart.split(/,|\bet\b|\n|\r/).map(cleanKephName).filter((name) => /^[A-Za-z0-9À-ÿ _-]{2,40}$/.test(name)).slice(0, 6);
    const candidates = names.length ? names : (Array.isArray(context.queue) ? context.queue.slice(0, 4) : []);
    const list = candidates.length ? candidates.join(", ") : "les candidats";
    addControlled(`add_dialogue ${quoteCommandArg(trigger)} "charlie" ${quoteCommandArg(`Le jingle démarre, ${list} entrent dans la Charlie Roulette.`)} --emote "spark" --fx "spotlights"`);
    addControlled(`add_dialogue ${quoteCommandArg(trigger)} "victoria" ${quoteCommandArg(`Ce soir, ${list} vont tenter leur chance. Que la roue choisisse avec panache.`)} --emote "smile" --fx "goldwave"`);
    addControlled(`add_dialogue ${quoteCommandArg(trigger)} "charlie" ${quoteCommandArg("Les règles sont simples : la roue tourne, les lots tombent, et moi je nie toute responsabilité.")} --emote "wink"`);
  }
  if (controlledCommands.length) {
    return {
      answer: `Je peux preparer ${controlledCommands.length} commande${controlledCommands.length > 1 ? "s" : ""} controlee${controlledCommands.length > 1 ? "s" : ""}. Verifie l'aperçu, puis applique seulement si tout est bon.\n\n${controlledCommands.map((command) => `/${command}`).join("\n")}`,
      actions: [{ id: "apply_keph_command_batch", type: "command_batch", label: `Prévisualiser ${controlledCommands.length} commande${controlledCommands.length > 1 ? "s" : ""}`, payload: { commands: controlledCommands, question: raw } }],
      source: "command",
      intent: "command_batch"
    };
  }
  if (/\bcharlie show\b/.test(normalized)) {
    return {
      answer: "Charlie Show active les interventions de Charlie/Victoria pendant le live. Si c'est coupe, la roue peut rester plus sobre et les scenes parlent moins. Si c'est active, tes dialogues, emotes, effets et reactions peuvent donner de la vie au tirage.",
      actions: [{ id: "open_scenario_studio", label: "Ouvrir le studio" }],
      source: "command",
      intent: "explain_charlie_show"
    };
  }
  if (/\b(?:dialogues inclus|dialogue inclus|dialogues par defaut|dialogue par defaut)\b/.test(normalized)) {
    return {
      answer: "Dialogues inclus active les repliques par defaut fournies avec le site. Si tu le laisses active, Charlie/Victoria peuvent parler meme si tu n'as pas encore tout personnalise. Si tu le coupes, le show utilisera surtout tes dialogues personnalises du Studio de scenarios.",
      actions: [{ id: "open_scenario_studio", label: "Ouvrir le studio" }],
      source: "command",
      intent: "explain_default_dialogues"
    };
  }
  if (/\b(?:dialogue parle|indication scenique|slash me|\/me)\b/.test(normalized)) {
    return {
      answer: "Dialogue parle affiche une vraie bulle de parole pour Charlie ou Victoria. Indication scenique est plus discrete : elle decrit une action de scene, comme un /me, par exemple Charlie observe la roue. Utilise Dialogue parle pour un texte important, et Indication scenique pour donner de la vie sans couper le rythme.",
      actions: [{ id: "open_scenario_studio", label: "Ouvrir le studio" }],
      source: "command",
      intent: "explain_dialogue_types"
    };
  }
  if (/\b(?:liste|lister|quels sont|c est quoi|donne moi)\b/.test(normalized) && /\b(?:effet|effets|fx|speciaux|spéciaux)\b/.test(normalized)) {
    return {
      answer: "Les effets speciaux disponibles sont : confettis, feu d'artifice, flash plateau, coupure lumiere, projecteurs, spotlight, shake leger, glitch, pluie d'etoiles, fumee, vague doree et alerte rouge. Ils se reglent sur une replique dans le Studio de scenarios.",
      actions: [{ id: "open_scenario_studio", label: "Ouvrir le studio" }],
      source: "command",
      intent: "list_effects"
    };
  }
  if (/\b(?:liste|lister|affiche|afficher|montre|montrer|donne moi|quels sont|tous|toutes)\b/.test(normalized) && /\b(?:dialogue|dialogues|replique|repliques)\b/.test(normalized)) {
    const trigger = triggerFromText();
    const dialogues = (Array.isArray(context.dialogues) ? context.dialogues : []).filter((cue) => String(cue.trigger || "") === trigger);
    const label = triggerLabels[trigger] || trigger;
    if (!dialogues.length) {
      return {
        answer: `Je ne vois aucun dialogue personnalise dans l'etape ${label} avec le contexte actuel. Ouvre le Studio de scenarios pour verifier l'etape ou en ajouter.`,
        actions: [{ id: "open_scenario_studio", label: "Ouvrir le studio" }],
        source: "command",
        intent: "list_dialogues_empty"
      };
    }
    const lines = dialogues.slice(0, 8).map((cue, index) => {
      const who = cue.speaker === "victoria" ? "Victoria" : "Charlie";
      const kind = cue.kind === "me" ? "indication" : "dialogue";
      return `${index + 1}. id=${cue.id || "sans-id"} · ${who} (${kind}) : ${String(cue.text || "").slice(0, 120)}`;
    });
    const quickActions = [{ id: "open_scenario_studio", label: "Ouvrir le studio" }];
    return {
      answer: `Voici les dialogues de l'etape ${label} que je vois dans la regie, avec leurs ids pour pouvoir les modifier ou les supprimer :\n${lines.join("\n")}${dialogues.length > 8 ? `\n... et ${dialogues.length - 8} autre(s).` : ""}`,
      actions: quickActions,
      source: "command",
      intent: "list_dialogues"
    };
  }
  const greetingText = normalized.replace(/\bkeph\b/g, " ").replace(/\s+/g, " ").trim();
  const greetingOnly = /^(?:bonjour|salut|coucou|hello|yo|hey)(?:\s+(?:ca va|ca roule|la forme|cv|comment ca va|comment vas tu|tu vas bien))?\s*\??$/.test(greetingText);
  if (greetingOnly || /^(?:ca va|ca roule|la forme|comment ca va|comment vas tu|tu vas bien)\s*\??$/.test(greetingText)) {
    return {
      answer: "Salut, ça va bien, merci. Je suis prêt pour t'aider sur la régie, mais on peut aussi commencer simple : dis-moi ce que tu veux préparer ou ce qui te bloque.",
      actions: [],
      source: "conversation",
      intent: "greeting"
    };
  }
  if (/\b(?:demande pas si moi ca va|tu me demandes pas si moi ca va|tu me demande pas si moi ca va|et moi ca va|et moi alors)\b/.test(normalized)) {
    return {
      answer: "Tu as raison, j'aurais du te le demander. Et toi, ca va ? Si tu es en plein reglage, dis-moi aussi ce qui coince et je t'aide sans te renvoyer une fiche technique.",
      actions: [],
      source: "conversation",
      intent: "greeting_followup"
    };
  }
  if (/^(?:ca|cela|ce truc|c est|cest)?\s*(?:se trouve|est)?\s*ou\s*\??$/.test(normalized) || /^ou\s*\??$/.test(normalized)) {
    return {
      answer: "Tu parles de quel bouton ou quelle option ? Precise le nom exact, par exemple : \"ou se trouve le bruitage d'une replique ?\", \"ou modifier le poids d'un lot ?\" ou \"ou est le mode Discord ?\".",
      actions: [],
      source: "conversation",
      intent: "ambiguous_location"
    };
  }
  if (/\b(?:dragon laser|mode dragon|laser dragon)\b/.test(normalized)) {
    return {
      answer: "Je ne vois pas cette fonction dans la documentation du site. Le mode dragon laser n'existe pas dans Charlie Roulette, donc je ne vais pas inventer un bouton ou un réglage.",
      actions: [],
      source: "conversation",
      intent: "unverified_site_question"
    };
  }
  if (/\b(?:modifier|changer|regler|mettre|augmenter|baisser|possible|peut on|on peut)\b/.test(normalized) && /\b(?:poids|poid|probabilite|chance)\b/.test(normalized) && /\b(?:case|lot|roue)\b/.test(normalized)) {
    return {
      answer: "Oui, tu peux modifier le poids d'une case. Dans Lots & roue > Studio de la roulette > Lots & probabilites, change le poids du lot : plus le nombre est haut, plus la case a de chances de tomber. Tu peux aussi me demander « mets le poids du lot X a 10 » et je te proposerai une confirmation.",
      actions: [{ id: "open_wheel_studio_lots", label: "Ouvrir les lots" }],
      source: "command",
      intent: "explain_lot_weight"
    };
  }
  if (/\b(?:indisponible|epuise|epuisee|gris|grise|grisee)\b/.test(normalized) && /\b(?:lot|case|stock)\b/.test(normalized)) {
    return {
      answer: "Un lot devient indisponible s'il est desactive ou si son stock est active et tombe a zero. Dans ce cas, la case est grisee et la roue ne peut plus tomber dessus pour les prochains candidats. Remets du stock ou reactive le lot dans Lots & roue si tu veux le rendre disponible.",
      actions: [{ id: "open_wheel_studio_lots", label: "Ouvrir les lots" }],
      source: "command",
      intent: "explain_lot_unavailable"
    };
  }
  if (/\b(?:nombre de lancers|nombre de lancer|lancers de|participations de|tickets de|tentatives de)\b/.test(normalized)) {
    return {
      answer: "Le nombre de lancers d'un participant se regle dans Preparer, dans la liste de participants. Chaque pseudo a un compteur de lancers : augmente-le si le candidat a plusieurs tickets, puis charge ou recharge la file. A chaque vrai tirage, le compteur restant descend d'un cran.",
      actions: [{ id: "open_prepare", label: "Ouvrir Preparer" }],
      source: "command",
      intent: "explain_participant_draws"
    };
  }
  if (/\b(?:detacher la regie|detacher regie|pourquoi detacher|regie separee|autre fenetre)\b/.test(normalized)) {
    return {
      answer: "Detacher la regie sert a piloter dans une fenetre separee pendant que la fenetre principale reste propre pour Discord/OBS. C'est pratique en live : le public voit la scene, toi tu gardes Lancer, Stop, Suivant et les reglages hors capture.",
      actions: [{ id: "detach_control", label: "Detacher la regie" }],
      source: "command",
      intent: "explain_detach_control"
    };
  }
  if (/\b(?:ocean le plus grand|plus grand ocean)\b/.test(normalized)) {
    return {
      answer: "Le plus grand ocean du monde est l'ocean Pacifique.",
      actions: [],
      source: "command",
      intent: "general_largest_ocean"
    };
  }
  if (/^(?:t as quel age|tu as quel age|quel age as tu|age)\s*\??$/.test(normalized)) {
    return {
      answer: "Je n'ai pas vraiment d'âge, je suis l'assistant Keph de la roulette. Le plus utile à retenir : je suis là pour guider l'organisateur et éviter de chercher les boutons pendant le live.",
      actions: [],
      source: "conversation",
      intent: "assistant_identity"
    };
  }
  if (/\b(?:tu t appelles comment|tu t appels comment|comment tu t appelles|comment tu t appels|c est quoi ton nom|ton nom|qui es tu|t es qui)\b/.test(normalized)) {
    return {
      answer: "Je m'appelle Keph. Je suis l'assistant de régie de Charlie Roulette : je peux t'aider à comprendre un bouton, préparer le live, retrouver un menu ou proposer une action à confirmer.",
      actions: [],
      source: "conversation",
      intent: "assistant_identity"
    };
  }
  if (/\b(?:tu connais keph|c est qui keph|qui est keph|keph c est qui)\b/.test(normalized)) {
    return {
      answer: "Oui : Keph, c'est moi. Je suis l'assistant de régie intégré à Charlie Roulette. Mon but est de t'aider à comprendre le site, préparer ton live et proposer des actions à confirmer sans toucher à tout n'importe comment.",
      actions: [],
      source: "conversation",
      intent: "assistant_identity"
    };
  }
  if (/\b(?:quelle heure|quel heure|il est quel heure|il est quelle heure|heure actuelle)\b/.test(normalized)) {
    const now = new Date();
    return {
      answer: `Il est ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })} en France actuellement.`,
      actions: [],
      source: "conversation",
      intent: "time_now"
    };
  }
  if (/\b(?:qui a cree harry potter|qui a creer harry potter|qui est l auteur de harry potter|harry potter)\b/.test(normalized)) {
    return {
      answer: "Harry Potter a été créé par J. K. Rowling.",
      actions: [],
      source: "conversation",
      intent: "general_harry_potter"
    };
  }
  if (/\b(?:qui est victoria|c est qui victoria|victoria c est qui)\b/.test(normalized)) {
    return {
      answer: "Victoria est un personnage de mise en scène dans Charlie Roulette. Elle intervient surtout dans les dialogues pour annoncer, commenter ou accompagner le tirage avec un ton plus présentateur. Tu peux modifier ses répliques dans le Studio de scénarios.",
      actions: [
        { id: "open_scenario_studio", label: "Ouvrir le studio" }
      ],
      source: "conversation",
      intent: "character_victoria"
    };
  }
  if (/\b(?:qui est charlie|c est qui charlie|charlie c est qui)\b/.test(normalized)) {
    return {
      answer: "Charlie est le personnage principal de la roulette : il porte l'ambiance du show, réagit aux tirages et peut parler pendant les scènes. Ses répliques, emotes, sons et effets se règlent dans le Studio de scénarios.",
      actions: [
        { id: "open_scenario_studio", label: "Ouvrir le studio" }
      ],
      source: "conversation",
      intent: "character_charlie"
    };
  }
  if (/^(?:et\s+)?charlie\s*\??$/.test(normalized)) {
    return {
      answer: "Charlie, c'est le personnage principal du show. Il peut presenter les candidats, commenter la roue, reagir aux resultats et porter les blagues ou interventions pendant le live. Tu peux regler ses repliques, emotes, bruitages et effets dans le Studio de scenarios.",
      actions: [
        { id: "open_scenario_studio", label: "Ouvrir le studio" }
      ],
      source: "conversation",
      intent: "character_charlie"
    };
  }
  if (/\b(?:ocean le plus grand|plus grand ocean)\b/.test(normalized)) {
    return {
      answer: "Le plus grand océan du monde est l'océan Pacifique. Et si tu veux, je peux aussi revenir sur la roulette : lots, participants, sons, dialogues ou scène Discord.",
      actions: [],
      source: "conversation",
      intent: "general_answer"
    };
  }
  if (/\b(?:canne a sucre|canne sucre)\b/.test(normalized) && /\b(?:ou|pousse|pousser|cultive|vient)\b/.test(normalized)) {
    return {
      answer: "La canne a sucre pousse surtout dans les regions tropicales et subtropicales, par exemple au Bresil, en Inde, en Thailande, dans les Caraibes ou a La Reunion. Elle a besoin de chaleur, d'eau et de beaucoup de soleil.",
      actions: [],
      source: "conversation",
      intent: "general_answer"
    };
  }
  if (/\b(?:moi je suis qui|je suis qui|qui suis je|tu sais qui je suis)\b/.test(normalized)) {
    const current = String(context?.currentCandidate || "").trim();
    return {
      answer: current
        ? `Je ne peux pas savoir qui tu es personnellement depuis ce chat. Par contre, dans la roulette, le candidat actuellement affiche est ${current}.`
        : "Je ne peux pas savoir qui tu es personnellement depuis ce chat. Je peux seulement lire le contexte de la roulette, comme le candidat affiche, la file, les lots et l'etat du live.",
      actions: current ? [{ id: "open_prepare", label: "Ouvrir Preparer" }] : [],
      source: "conversation",
      intent: "user_identity"
    };
  }
  if (/\b(?:qui t a cree|qui ta cree|qui t a fait|qui ta fait|qui est ton createur)\b/.test(normalized)) {
    return {
      answer: "Je suis l'assistant intégré à Charlie Roulette, construit pour aider l'organisateur pendant les lives. Mon rôle n'est pas de remplacer la régie, mais de t'éviter de chercher partout quand tu prépares ou animes.",
      actions: [],
      source: "conversation",
      intent: "assistant_identity"
    };
  }
  if (/\b(?:merci|merci keph|ok merci|parfait merci)\b/.test(normalized) && normalized.split(" ").length <= 4) {
    return {
      answer: "Avec plaisir. Si tu bloques sur quelque chose, je suis là.",
      actions: [],
      source: "conversation",
      intent: "thanks"
    };
  }
  if (/\b(?:quelle heure|quel heure|il est quelle heure|il est quel heure|heure actuelle)\b/.test(normalized)) {
    const now = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date());
    return {
      answer: `Il est ${now} en France.`,
      actions: [],
      source: "conversation",
      intent: "current_time"
    };
  }
  if (/\b(?:comment|comment faire pour|je veux)\b/.test(normalized) && /\b(?:lancer|demarrer)\b/.test(normalized) && /\b(?:roue|roulette|tirage)\b/.test(normalized)) {
    return {
      answer: "Pour lancer la roue, verifie d'abord qu'un participant est charge et qu'au moins un lot est disponible, puis clique sur Lancer dans la regie. C'est un vrai tirage : il peut consommer un stock, ajouter une ligne a l'historique et retirer un lancer au participant. Pour tester sans risque, utilise Tirage test.",
      actions: [{ id: "open_prepare", label: "Ouvrir Preparer" }],
      source: "command",
      intent: "how_to_launch_wheel"
    };
  }
  const previewBlockedByProblem = /\b(?:pourquoi|probleme|problème|impossible|marche pas|peux pas|peut pas|bloque|bloqué|bloquee|bloquée|bug)\b/.test(normalized);
  const asksPreview = !previewBlockedByProblem && /\b(?:joue|jouer|lance|lancer|test|tester|previsualise|previsualiser|prévisualise|prévisualiser|montre|montrer|aperçu|apercu)\b/.test(normalized);
  if (asksPreview && /\b(?:tirage test|test roulette|test roue)\b/.test(normalized)) {
    return {
      answer: "Je peux lancer un tirage test sans toucher aux stocks, a l'historique ni aux lancers restants. Clique sur Appliquer pour confirmer.",
      actions: [
        { id: "apply_start_test_draw", type: "start_test_draw", label: "Lancer le tirage test", payload: {} },
        { id: "open_prepare", label: "Ouvrir Preparer" }
      ],
      source: "command",
      intent: "start_test_draw"
    };
  }
  if (asksPreview && /\b(?:tout l evenement|tout evenement|evenement complet|événement complet|tout le live|deroule complet|déroulé complet|show complet|simulation complete|simulation complète)\b/.test(normalized)) {
    return {
      answer: "Je peux lancer une simulation complète : présentation, jingle, annonce candidat, tirage test, annonce suivant et finale. Ça sert à voir le rythme sans toucher aux stocks ni à l'historique réel.",
      actions: [
        { id: "apply_play_event_rehearsal", type: "play_event_rehearsal", label: "Simuler tout l'événement", payload: {} }
      ],
      source: "command",
      intent: "play_event_rehearsal"
    };
  }
  if (asksPreview && /\b(?:effet|fx|confetti|confettis|feu|artifice|flash|fumee|fumée|glitch|etoiles|étoiles|projecteur|projecteurs|spotlight|blackout|coupure|lumiere|lumière|shake|alerte)\b/.test(normalized)) {
    const effectAliases = [
      ["confetti", /\bconfettis?\b/],
      ["fireworks", /\b(?:feu artifice|feu d artifice|artifice)\b/],
      ["flash", /\bflash\b/],
      ["blackout", /\b(?:blackout|coupure|coupure lumiere|coupure lumière)\b/],
      ["spotlights", /\b(?:projecteurs?|spotlights?)\b/],
      ["spotlight", /\bspotlight\b/],
      ["shake", /\bshake\b/],
      ["glitch", /\bglitch\b/],
      ["stars", /\b(?:etoiles|étoiles|stars?)\b/],
      ["smoke", /\b(?:fumee|fumée|smoke)\b/],
      ["goldwave", /\b(?:vague doree|vague dorée|goldwave)\b/],
      ["alert", /\b(?:alerte|rouge)\b/]
    ];
    const fx = effectAliases.find(([, regex]) => regex.test(normalized))?.[0] || "confetti";
    return {
      answer: `Je peux jouer l'effet ${fx} directement sur la scène pour voir le rendu.`,
      actions: [
        { id: `apply_preview_effect_${fx}`, type: "preview_effect", label: `Jouer l'effet`, payload: { fx } }
      ],
      source: "command",
      intent: "preview_effect"
    };
  }
  if (asksPreview && /\bjingle\b/.test(normalized) && !/\b(?:dialogue|replique|réplique|phrase)\b/.test(normalized)) {
    return {
      answer: "Je peux lancer le jingle de début pour tester le son et l'ambiance sans lancer la roue.",
      actions: [
        { id: "apply_play_jingle", type: "play_jingle", label: "Jouer le jingle", payload: {} }
      ],
      source: "command",
      intent: "play_jingle"
    };
  }
  if (asksPreview && /\b(?:dialogue|replique|réplique|scene|scène|presentation|présentation|jingle|roue|resultat|résultat|suivant|finale)\b/.test(normalized)) {
    const trigger = /\bfinale\b/.test(normalized) ? "finale"
      : /\b(?:suivant|prochain candidat|annonce candidat)\b/.test(normalized) ? "next"
      : /\b(?:resultat|résultat|gagnant)\b/.test(normalized) ? "result"
      : /\b(?:roue|tirage|rotation)\b/.test(normalized) ? "spin"
      : /\bjingle\b/.test(normalized) ? "jingle"
      : "presentation";
    const labels = { presentation: "Présentation", jingle: "Jingle", spin: "Pendant la roue", result: "Résultat", next: "Candidat suivant", finale: "Finale" };
    return {
      answer: `Je peux prévisualiser l'étape « ${labels[trigger]} » avec les dialogues configurés, pour voir le rendu avant le live.`,
      actions: [
        { id: `apply_preview_section_${trigger}`, type: "preview_cue_section", label: `Jouer ${labels[trigger]}`, payload: { trigger } }
      ],
      source: "command",
      intent: "preview_cue_section"
    };
  }
  const lots = Array.isArray(context.lots) ? context.lots : [];
  const asksLot = /\blot\b|\bpoid\b|\bpoids\b|\bprobabilit/.test(normalized);
  if (asksLot) {
    const rateMatch = normalized.match(/\b(?:poid|poids|ponderation|probabilite|proba|taux)\b.*?\b(?:a|de|sur)?\s*(\d{1,4})\b/) || normalized.match(/\b(\d{1,4})\b.*?\b(?:poid|poids|ponderation|probabilite|proba|taux)\b/);
    const renameMatch = raw.match(/\b(?:renomme|renommer|renomé|renome|ronomme|renommer|appelle|nomme)\b.*?\ben\s+(.+?)(?:[?.!]|$)/i);
    const lotNameMatch = raw.match(/lot\s+(.+?)(?:\s+(?:et|puis|avec|à|a|au|en|pour|met|mets|mettre|modifie|modifier|change|changer|renomme|renommer|renome|ronomme|appelle|nomme|poids|pondération|probabilité|proba|taux)\b|[?.!,]|$)/i)
      || raw.match(/(?:modifie|modifier|change|changer|mettre|mets|met|renomme|renommer|renome|ronomme)\s+(.+?)(?:\s+(?:et|puis|avec|à|a|au|en|pour|poids|pondération|probabilité|proba|taux)\b|[?.!,]|$)/i);
    const inferredName = lotNameMatch?.[1] || lots.map((lot) => lot.name).find((name) => normalized.includes(normalizeKephText(name)));
    const target = findKephLot(lots, inferredName);
    if (renameMatch && target) {
      const nextName = renameMatch[1].trim().slice(0, 80);
      if (nextName) {
        return {
          answer: `Je peux renommer le lot « ${target.name} » en « ${nextName} ». Cliquez sur Appliquer pour confirmer.`,
          actions: [
            { id: "apply_update_lot_name", type: "update_lot_name", label: "Appliquer le renommage", payload: { lotName: target.name, lotIndex: target.index, name: nextName } },
            { id: "open_wheel_studio_lots", label: "Ouvrir les lots" }
          ],
          source: "command",
          intent: "update_lot_name"
        };
      }
    }
    if (rateMatch && target) {
      const rate = Math.max(0, Math.min(9999, Number(rateMatch[1])));
      return {
        answer: `Je peux mettre le poids du lot « ${target.name} » à ${rate}. Je ne le fais pas tout seul : cliquez sur Appliquer pour confirmer.`,
        actions: [
          { id: "apply_update_lot_rate", type: "update_lot_rate", label: `Appliquer poids ${rate}`, payload: { lotName: target.name, lotIndex: target.index, rate } },
          { id: "open_wheel_studio_lots", label: "Ouvrir les lots" }
        ],
        source: "command",
        intent: "update_lot_rate"
      };
    }
  }
  const addParticipantMatch = raw.match(/\b(?:ajoute|ajouter|mets|mettre)\b\s+(?:le\s+)?(?:candidat|participant)?\s*([A-Za-z0-9À-ÿ _-]{2,40})\s+(?:(?:a|à)\s+la\s+fin\s+(?:de\s+)?(?:la\s+)?(?:liste|file|queue)|(?:dans|a|à)\s+(?:la\s+)?(?:file|liste|queue))\b/i);
  if (!controlledCommands.length && addParticipantMatch) {
    const name = addParticipantMatch[1].trim().replace(/\s+/g, " ").slice(0, 40);
    if (name) {
      return {
        answer: `Je peux ajouter « ${name} » à la fin de la file des participants. Clique sur Appliquer pour confirmer, comme ça je ne modifie pas la régie sans ton accord.`,
        actions: [
          { id: "apply_add_participant", type: "add_participant", label: "Ajouter à la file", payload: { name } },
          { id: "open_prepare", label: "Ouvrir Préparer" }
        ],
        source: "command",
        intent: "add_participant"
      };
    }
  }
  const asksDialogueAction = /\b(?:ajoute|ajouter|cree|creer|modifier|modifie)\b/.test(normalized) && /\b(?:dialogue|replique|plique|phrase)\b/.test(normalized);
  if (asksDialogueAction) {
    const quoted = raw.match(/[«"“](.+?)[»"”]/)?.[1];
    const afterColon = raw.match(/[:：]\s*(.+)$/)?.[1];
    const text = String(quoted || afterColon || "").trim().slice(0, 600);
    if (text) {
      const trigger = /\bfinale\b/.test(normalized) ? "finale"
        : /\b(?:resultat|gagnant|lot obtenu)\b/.test(normalized) ? "result"
        : /\b(?:roue|tirage|rotation)\b/.test(normalized) ? "spin"
        : /\b(?:suivant|prochain candidat)\b/.test(normalized) ? "next"
        : /\bjingle\b/.test(normalized) ? "jingle"
        : "presentation";
      const speaker = /\bvictoria\b/.test(normalized) ? "victoria" : "charlie";
      return {
        answer: `Je peux ajouter cette réplique dans l’étape « ${trigger} » pour ${speaker === "victoria" ? "Victoria" : "Charlie"}. Cliquez sur Appliquer pour confirmer.`,
        actions: [
          { id: "apply_add_dialogue", type: "add_dialogue", label: "Appliquer la réplique", payload: { trigger, speaker, text } },
          { id: "open_scenario_studio", label: "Ouvrir le studio" }
        ],
        source: "command",
        intent: "add_dialogue"
      };
    }
  }
  return null;
}

function directKephAnswer(message) {
  const text = normalizeKephText(message);
  const yesNo = /\b(?:est ce que|peut on|on peut|possible|je peux|peux)\b/.test(text);
  const wantsHow = /\b(?:comment|comment faire|ou|ou est|ou aller|je veux|pour)\b/.test(text);
  const wantsPurpose = /\b(?:a quoi sert|a quoi ca sert|ca sert a quoi|sert a quoi|pourquoi|c est quoi|c quoi|utilite)\b/.test(text);
  const stageLabel = /\bjingle\b/.test(text) ? "Jingle"
    : /\b(?:resultat|gagnant|lot obtenu)\b/.test(text) ? "Resultat"
      : /\b(?:roue|tirage|pendant)\b/.test(text) ? "Pendant la roue"
        : /\b(?:suivant|prochain candidat)\b/.test(text) ? "Candidat suivant"
          : /\bfinale\b/.test(text) ? "Finale"
            : "Presentation";
  const directAnswers = [
    {
      intent: "ambiguous_location",
      test: () => /\b(?:ca se trouve ou|ça se trouve ou|c est ou|c'est ou|ou ca|ou ça)\b/.test(text) && text.split(" ").length <= 6,
      answer: "Tu parles de quel bouton ou quelle option ? Precise le nom exact, par exemple « le bruitage », « le poids », « les raccourcis » ou « la sauvegarde », et je t'ouvre le bon endroit.",
      actions: []
    },
    {
      intent: "profile_transfer",
      test: () => /\b(?:changer|nouveau|autre|transfert|transferer|deplacer|deplacer)\b/.test(text) && /\b(?:ordinateur|pc|navigateur)\b/.test(text) && /\b(?:export|exporter|import|importer|profil|profile|sauvegarde|configuration)\b/.test(text),
      answer: "Oui. Pour changer d'ordinateur ou de navigateur, exporte d'abord le profil sur l'ancien poste, puis importe ce fichier sur le nouveau. Le profil contient la configuration de la roulette : participants, lots, poids, stocks, dialogues, sons, raccourcis et options. Fais toujours l'export avant l'import, parce que l'import remplace la configuration courante.",
      actions: ["open_data"]
    },
    {
      intent: "new_user_onboarding",
      test: () => !/\b(?:pc|ordinateur|export|importe|importer|import|profil|profile)\b/.test(text) && /\b(?:nouveau|premiere fois|première fois|jamais utilise|jamais utiliser|je suis perdu|utiliser le site|me guider|guide moi|commencer)\b/.test(text) && /\b(?:site|roulette|live|nouveau|commencer|perdu|utiliser)\b/.test(text),
      answer: "Oui. Pense le site en 3 moments : 1) Préparer : tu charges les participants et leurs lancers. 2) Lots & roue : tu règles les lots, poids et stocks. 3) Scènes/Sons : tu ajustes dialogues, jingles et effets. Avant un vrai live, lance une simulation avec Simuler un passage pour vérifier que le rythme, les sons et la scène Discord sont propres.",
      actions: ["open_prepare", "highlight_rehearsal"]
    },
    {
      intent: "participant_purpose",
      test: () => wantsPurpose && !/\b(?:dialogue|dialogues|replique|repliques|option|cochable|annoncer|automatiquement)\b/.test(text) && /\b(?:participant|participants|candidat|candidats|file|liste d attente|file d attente)\b/.test(text),
      answer: "Les participants servent à définir qui passe dans la roulette et dans quel ordre. Le participant actuel est affiché sur la scène, ses dialogues peuvent utiliser son nom, et son nombre de lancers indique combien de vrais tirages il peut faire avant de passer au suivant. Sans participants, tu peux tester la roue, mais tu n'as pas de vrai déroulé de live.",
      actions: ["open_prepare"]
    },
    {
      intent: "add_lot_howto",
      test: () => /\b(?:comment|comment faire|comment ajouter|ajouter|mettre|creer|créer)\b/.test(text) && /\b(?:lot|lots|case|roue|roulette)\b/.test(text) && !/\b(?:dialogue|replique|réplique)\b/.test(text),
      answer: "Pour ajouter un lot, ouvre Lots & roue puis le Studio de la roulette. Dans Lots & probabilités, ajoute une case, donne-lui un nom, un poids et éventuellement un stock. Ensuite passe dans Design & PNG si tu veux ajuster le texte, la couleur ou l'image de la case.",
      actions: ["open_wheel_studio_lots"]
    },
    {
      intent: "wheel_lot_limit",
      test: () => /\b(?:maximum|max|limite|combien)\b/.test(text) && /\b(?:lot|lots|case|cases|roue|roulette)\b/.test(text),
      answer: "Il n'y a pas vraiment un chiffre magique, mais en pratique je te conseille de rester autour de 8 à 12 lots pour garder une roue lisible en live. Au-delà, les textes deviennent petits et la scène est moins claire. Si tu veux beaucoup de récompenses, mieux vaut regrouper certains lots ou utiliser des catégories.",
      actions: ["open_wheel_studio_lots"]
    },
    {
      intent: "dialogue_tokens",
      test: () => /\b(?:bouton|boutons|candidat actuel|candidat suivant|dernier lot|lot|nombre de candidats|gagnants|variables?)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques|phrase)\b/.test(text),
      answer: "Ces boutons insèrent des variables dans le texte d'une réplique. Par exemple « Candidat actuel » mettra automatiquement le nom de la personne qui passe, et « Lot » peut reprendre le lot gagné. Ça évite d'écrire un dialogue différent pour chaque candidat : la phrase s'adapte au contexte du live.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "effect_howto",
      test: () => /\b(?:comment|comment faire|comment mettre|comment ajouter|ou|ou est|ou mettre|mettre|ajouter)\b/.test(text) && /\b(?:effet|effets|fx|speciaux|special|confetti|flash|fumee|glitch)\b/.test(text),
      answer: "Pour mettre un effet spécial, ouvre Réglages > Scènes > Studio de scénarios, sélectionne ou crée une réplique, puis règle le champ Effet spécial dans le panneau d'édition. L'effet se déclenchera quand cette réplique se joue. Utilise-les surtout sur les moments forts : intro, résultat, finale ou grosse blague.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "jingle_dialogue_ideas",
      test: () => /\b(?:idee|idees|idée|idées|tu ferais quoi|propose|suggestion|inspire)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques)\b/.test(text) && /\bjingle\b/.test(text),
      answer: "Oui. Pour un jingle drôle, je partirais sur des phrases courtes et très rythmées. Exemples : « Le jingle part, la dignité reste en coulisses. », « Victoria, vérifie que la roue n'a pas signé chez la concurrence. », « Le hasard entre sur scène, merci de ne pas le regarder directement. », « Si ça clignote, c'est normal. Si ça explose, c'était prévu. »",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "dialogue_capability",
      test: () => /\b(?:tu sais|tu peux|est ce que tu peux|possible)\b/.test(text) && /\b(?:creer|créer|faire|ecrire|écrire|rediger|rédiger)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques)\b/.test(text) && !/\b(?:maintenant|ajoute|ajouter|cree moi|crée moi|fais moi|ecris moi|écris moi)\b/.test(text),
      answer: "Oui, je peux t'aider à créer des dialogues. Si tu veux juste des idées, je te propose du texte sans rien modifier. Si tu veux que je les ajoute au site, dis-le clairement, par exemple : « ajoute 3 dialogues pour le jingle avec Charlie et Victoria ». Dans ce cas je prépare des commandes à confirmer.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "prepare_location",
      test: () => /\b(?:ou|où|ou est|où est|ou trouver|où trouver|c est ou|c'est où)\b/.test(text) && /\b(?:preparer|préparer|avant live)\b/.test(text),
      answer: "Préparer est dans la configuration/régie, côté Avant live. C'est l'endroit où tu règles le participant actuel, la file de candidats, les lancers, la checklist et les raccourcis. Je peux t'ouvrir directement ce panneau.",
      actions: ["open_prepare"]
    },
    {
      intent: "add_candidates_howto",
      test: () => !wantsPurpose && /\b(?:comment|comment faire|ou|où|je veux|j ajoute|ajouter|mettre)\b/.test(text) && /\b(?:candidat|candidats|participant|participants)\b/.test(text) && !/\b(?:dialogue|replique|réplique)\b/.test(text),
      answer: "Pour ajouter des candidats, ouvre Préparer. Dans la file de participants, écris un pseudo par ligne, puis clique sur Charger. Le premier devient le participant actuel, et Suivant passera au prochain. Tu peux aussi régler le nombre de lancers de chaque candidat dans la liste complète.",
      actions: ["open_prepare"]
    },
    {
      intent: "dialogue_sound_howto",
      test: () => /\b(?:comment|comment faire|ou|ou est|ajouter|mettre|associer|assigner)\b/.test(text) && /\b(?:son|audio|musique|mp3|wav|ogg|bruitage)\b/.test(text) && /\b(?:dialogue|replique|réplique)\b/.test(text),
      answer: "Pour mettre un son sur une réplique, ouvre Réglages > Scènes > Studio de scénarios, sélectionne ou crée la réplique, puis utilise le champ Bruitage dans le panneau d'édition. Si ton MP3/WAV/OGG n'est pas encore dans la bibliothèque, importe-le depuis ce champ, puis enregistre la réplique. Ce son se jouera avec ce dialogue, alors que la section Sons règle plutôt les volumes globaux et les jingles.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "create_dialogue",
      test: () => /\b(?:creer|cree|ajouter|ajoute|faire|mettre|met|mets|nouveau|nouvelle)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques|phrase)\b/.test(text) && !/\b(?:son|audio|musique|mp3|wav|ogg|bruitage|bouton|boutons|variable|variables|sert)\b/.test(text),
      answer: `Pour creer un dialogue, ouvre Reglages > Scenes > Studio de scenarios. A gauche, choisis l'etape ou la replique doit se jouer, par exemple ${stageLabel}. A droite, choisis Charlie ou Victoria, ecris le texte, regle si besoin le ciblage, l'emote, l'effet special ou le bruitage, puis clique sur Ajouter la replique. Si tu me donnes directement le texte entre guillemets, je peux aussi preparer l'action a confirmer.`,
      actions: ["open_scenario_studio"]
    },
    {
      intent: "jingle_purpose",
      test: () => wantsPurpose && /\bjingle\b/.test(text),
      answer: "Le jingle sert a marquer un moment de spectacle, surtout l'ouverture ou une transition. Il lance l'ambiance sonore sans lancer la roue et sans modifier les stocks, les lancers ou l'historique. Les repliques de l'etape Jingle se reglent dans le Studio de scenarios; le fichier son et les volumes se reglent dans Sons.",
      actions: ["open_scenario_studio", "open_audio"]
    },
    {
      intent: "dialogue_targeting",
      test: () => /\b(?:ciblage|cibler|candidat cible|participant cible|tous les candidats|candidat actuel)\b/.test(text) && /\b(?:dialogue|replique|candidat|participant)\b/.test(text) && !/\b(?:bouton|boutons|variable|variables|dernier lot|lot concerne|lot concerné|nombre de candidats|gagnants)\b/.test(text),
      answer: "Le ciblage decide pour qui une replique peut sortir. Tous les candidats = phrase generale. Candidat actuel = la phrase suit la personne qui passe maintenant. Candidat cible = la phrase ne sort que pour un pseudo precis. C'est utile pour preparer une blague ou une annonce speciale sans qu'elle apparaisse pour tout le monde.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "charlie_show_option",
      test: () => /\bcharlie show\b/.test(text) && wantsPurpose,
      answer: "Charlie Show active les interventions de Charlie et Victoria pendant le live. Si c'est actif, les scenes peuvent jouer des dialogues, emotes, effets et reactions; si c'est coupe, la roulette reste beaucoup plus sobre. C'est l'interrupteur principal du cote spectacle, pas un reglage de lots ou de probabilites.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "default_dialogues_option",
      test: () => /\b(?:dialogues inclus|dialogue inclus|dialogues par defaut|dialogue par defaut)\b/.test(text) && wantsPurpose,
      answer: "Dialogues inclus autorise les repliques fournies par defaut avec le site. Garde-le actif si tu veux que Charlie/Victoria parlent meme quand tu n'as pas encore tout personnalise. Coupe-le si tu veux que seules tes repliques du Studio de scenarios soient utilisees.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "auto_next_candidate_option",
      test: () => /\b(?:annoncer automatiquement|annonce automatique|candidat suivant automatique|automatiquement le candidat suivant|option cochable annoncer le candidat suivant|option annoncer le candidat suivant)\b/.test(text),
      answer: "Annoncer automatiquement le candidat suivant lance une annonce apres un tirage valide pour enchainer vers la personne suivante. C'est pratique si tu veux un rythme fluide sans cliquer une scene a chaque fois. Si tu preferes garder la main en live, laisse l'option coupee et utilise le bouton Suivant ou Annoncer le candidat quand tu es pret.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "edit_presentation_dialogues",
      test: () => /\b(?:modifier|modifie|changer|editer|edit|personnaliser)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques)\b/.test(text) && /\b(?:presenter|presentation|candidats)\b/.test(text),
      answer: "Oui. Les dialogues du bouton Presenter les candidats se modifient dans Reglages > Scenes > Studio de scenarios. Choisis l'etape Presentation a gauche, puis tu peux modifier les repliques existantes, en ajouter, changer Charlie/Victoria, l'emote, l'effet ou le bruitage. Ca change seulement l'intro spectacle : aucun stock ni historique n'est touche.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "site_purpose",
      test: () => !/\bstudio\b/.test(text) && /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi|but|objectif|utilite)\b/.test(text) && /\b(?:site|application|appli|charlie roulette|roulette)\b/.test(text),
      answer: "Charlie Roulette sert à animer un tirage en live comme une petite émission : tu prépares une file de candidats, des lots, des sons et des dialogues, puis tu pilotes la roue pendant que le public voit une scène propre pour Discord/OBS. La régie sert à contrôler le live, les réglages servent à préparer la roue, les scènes et les sauvegardes. En gros : c’est un outil d’animation, pas juste une roulette aléatoire.",
      actions: ["open_prepare"]
    },
    {
      intent: "assistant_capabilities",
      test: () => /\b(?:tu sers a quoi|tu peux faire quoi|aide moi|qu est ce que tu peux faire|tes capacites|fonctionnalites)\b/.test(text),
      answer: "Je peux t’aider à comprendre le site, retrouver un menu, préparer le live ou créer une action à confirmer. Par exemple : ajouter un participant, changer le poids d’un lot, renommer un lot, ajouter une réplique, expliquer un bouton, guider la scène Discord ou retrouver l’endroit où régler les sons.",
      actions: ["open_prepare"]
    },
    {
      intent: "first_steps",
      test: () => /\b(?:je suis perdu|par quoi commencer|commencer par quoi|premiere fois|jamais utilise|jamais utiliser|tu me guides|guide moi|debuter|avant le live|preparer live|nouveau sur le site|nouvelle sur le site|utiliser le site|faire quoi sur le site)\b/.test(text),
      answer: "Oui, je te guide. Pour comprendre Charlie Roulette, pense en 3 blocs : Préparer sert à charger les candidats et leurs lancers, Lots & roue sert à régler ce qui peut tomber, Scènes/Sons servent à donner l'ambiance avec Charlie, Victoria, dialogues, effets et jingles. Pour un premier live : charge une file, vérifie les lots/stocks, fais une simulation, puis utilise Lancer/Stop/Suivant dans la régie.",
      actions: ["open_prepare"]
    },
    {
      intent: "add_lot_howto",
      test: () => /\b(?:comment|comment faire|ou|ou est|ou aller|je peux|peux tu m aider|aide moi)\b/.test(text) && /\b(?:ajouter|creer|mettre|nouveau)\b/.test(text) && /\b(?:lot|case)\b/.test(text),
      answer: "Pour ajouter un lot, ouvre Réglages > Lots & roue, puis Ouvrir le studio de la roulette. Dans l'onglet Lots & probabilités, ajoute une nouvelle case, donne-lui un nom, un poids, et active un stock si le lot est limité. Ensuite vérifie dans Design & PNG que le texte tient bien sur la roue. Si tu veux que je le fasse, formule plutôt une action directe comme : ajoute un lot \"Cape du hasard\" poids 10 stock 2.",
      actions: ["open_wheel_studio_lots"]
    },
    {
      intent: "wheel_lot_limit",
      test: () => /\b(?:nombre|combien|maximum|max|limite|limiter|theorique|théorique)\b/.test(text) && /\b(?:lot|lots|case|cases)\b/.test(text) && /\b(?:roue|roulette)\b/.test(text),
      answer: "Il n'y a pas vraiment une limite pratique prévue comme “6 lots maximum”. Le vrai plafond, c'est la lisibilité : plus tu ajoutes de cases, plus le texte devient petit et serré. Pour un live propre, 6 à 10 lots restent confortables; au-delà, il faut raccourcir les noms et ajuster Design & PNG.",
      actions: ["open_wheel_studio_lots", "open_wheel_studio_design"]
    },
    {
      intent: "dialogue_variables_buttons",
      test: () => /\b(?:bouton|boutons|candidat actuel|candidat suivant|dernier lot|lot concerne|lot concerné|nombre de candidats|gagnants)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques|studio)\b/.test(text),
      answer: "Ces boutons insèrent des variables dans une réplique. Au lieu d'écrire un nom en dur, tu peux mettre par exemple {candidatactuel} ou {lot}. Pendant le live, le site remplace automatiquement par le candidat en train de passer ou le dernier lot obtenu. C'est pratique pour écrire une phrase réutilisable sans la modifier à chaque candidat.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "verify_lots_purpose",
      test: () => /\b(?:a quoi sert|sert a quoi|pourquoi|utilite|ca sert a quoi)\b/.test(text) && /\b(?:verifier|vérifier)\b/.test(text) && /\b(?:lot|lots|roue)\b/.test(text),
      answer: "Vérifier les lots sert à éviter une mauvaise surprise en live : un lot désactivé, un stock à zéro, un poids trop haut ou un nom illisible sur la roue. Avant de lancer, regarde surtout que les lots importants sont disponibles, que les stocks limités sont corrects et que les chances correspondent à ce que tu veux.",
      actions: ["open_wheel_studio_lots"]
    },
    {
      intent: "lot_colors_howto",
      test: () => /\b(?:couleur|couleurs|colorer|changer couleur)\b/.test(text) && /\b(?:case|cases|lot|lots|roue)\b/.test(text),
      answer: "Oui, tu peux changer les couleurs des cases. Ouvre Lots & roue > Studio de la roulette, puis va dans Design & PNG ou sélectionne le lot selon l'interface affichée. La couleur change seulement l'apparence de la case : elle ne modifie ni le poids, ni le stock, ni les chances de tirage.",
      actions: ["open_wheel_studio_design"]
    },
    {
      intent: "stop_button_purpose",
      test: () => /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi|explique|pourquoi utiliser|quand utiliser)\b/.test(text) && /\bstop\b/.test(text),
      answer: "Stop sert à arrêter la roue pendant un vrai tirage, au moment où tu veux figer le résultat pour le public. Il ne lance rien tout seul : Lancer démarre la roue, Stop l'arrête. S'il est grisé, c'est généralement qu'aucun tirage réel n'est en cours ou que l'arrêt n'est pas encore autorisé.",
      actions: ["open_prepare"]
    },
    {
      intent: "how_to_launch_wheel",
      test: () => !/\b(?:sans toucher|sans modifier|sans consommer)\b/.test(text) && /\b(?:comment|ou|où|je veux|pour)\b/.test(text) && /\b(?:lancer|demarrer|faire tourner|tourner)\b/.test(text) && /\b(?:roue|tirage)\b/.test(text),
      answer: "Pour lancer la roue : vérifie que le participant actuel est bon, puis clique sur Lancer dans la régie. La roue démarre un vrai tirage : elle peut consommer un stock, enregistrer l’historique et retirer un lancer au participant. Quand Stop devient disponible, tu peux arrêter la roue.",
      actions: ["open_prepare"]
    },
    {
      intent: "real_vs_test_draw",
      test: () => (/\b(?:difference|different|vrai|normal|reel)\b/.test(text) && /\b(?:tirage test|test|lancer)\b/.test(text)) || (/\b(?:sans toucher|sans modifier|sans consommer)\b/.test(text) && /\b(?:stock|stocks|historique|vrai tirage)\b/.test(text)),
      answer: "Lancer fait un vrai tirage : historique, stock et lancers participant peuvent être modifiés. Tirage test sert uniquement à répéter ou vérifier le rendu, sans toucher aux stocks ni à l’historique. Si tu es en live, utilise Lancer ; si tu règles le show, utilise Tirage test ou Simuler un passage.",
      actions: ["open_prepare"]
    },
    {
      intent: "current_participant",
      test: () => /\b(?:participant actuel|candidat actuel|pseudo affiche|changer candidat|changer participant)\b/.test(text),
      answer: "Le participant actuel est le nom affiché sur la scène et utilisé dans les dialogues. Tu peux le modifier dans Préparer, ou avancer dans la file avec Suivant. Si tu charges une file, le site prend le candidat courant et prépare le suivant automatiquement.",
      actions: ["open_prepare"]
    },
    {
      intent: "next_button",
      test: () => /\b(?:bouton suivant|suivant sert|a quoi sert suivant|passer au suivant|candidat suivant)\b/.test(text),
      answer: "Suivant sert à passer au prochain participant de la file. Utilise-le après un résultat validé, ou si tu veux sauter un candidat. Il met à jour le participant affiché sur la roue et le contexte utilisé par les dialogues.",
      actions: ["open_prepare"]
    },
    {
      intent: "participant_queue",
      test: () => /\b(?:file|fil|queue|liste)\b/.test(text) && /\b(?:attente|participant|participants|candidat|candidats)\b/.test(text) && !/\b(?:dialogue|dialogues|replique|repliques)\b/.test(text),
      answer: "La file d'attente sert à faire passer les candidats dans l'ordre. Dans Préparer, tu écris un pseudo par ligne, puis tu charges la file. Le participant actuel est celui qui passe maintenant, Suivant charge le prochain, et chaque ligne peut avoir son nombre de lancers. Tu peux aussi demander à Keph de réordonner la file, par exemple : mets Kinza en premier, Maz en deuxième et Capy en troisième.",
      actions: ["open_prepare"]
    },
    {
      intent: "detach_control",
      test: () => /\b(?:detacher la regie|detacher regie|regie separee|autre onglet|autre fenetre)\b/.test(text),
      answer: "Détacher la régie ouvre les contrôles dans une fenêtre séparée. C’est pratique pour OBS/Discord : la fenêtre capturée reste propre pour le public, pendant que toi tu gardes Lancer, Stop, Suivant et les réglages sous la main ailleurs.",
      actions: ["detach_control"]
    },
    {
      intent: "fullscreen",
      test: () => /\b(?:plein ecran|fullscreen|grand ecran)\b/.test(text),
      answer: "Plein écran sert surtout à présenter la scène publique plus proprement, sans bordures de navigateur visibles. Pour une capture OBS/Discord vraiment propre, combine-le avec le mode scène propre ou une régie détachée.",
      actions: ["highlight_discord"]
    },
    {
      intent: "password_access",
      test: () => /\b(?:mot de passe|password|acceder|connexion|entrer sur le site)\b/.test(text),
      answer: "L’accès Charlie Roulette est protégé par le mot de passe du site. Si tu es sur la page de connexion, entre le mot de passe prévu pour cette roulette, puis valide. Si ça ne marche plus, il faut vérifier que tu es sur la bonne URL et que le mot de passe n’a pas été changé.",
      actions: []
    },
    {
      intent: "save_behavior",
      test: () => /\b(?:sauvegarde automatique|c est sauvegarde|perdre mes reglages|localstorage|navigateur)\b/.test(text),
      answer: "Les réglages de la roulette sont sauvegardés dans le profil du navigateur, et tu peux aussi exporter un profil complet depuis Sauvegarde. Avant un gros live, je te conseille d’exporter le profil : c’est ta sécurité si tu changes de navigateur ou de machine.",
      actions: ["open_data"]
    },
    {
      intent: "control_room_purpose",
      test: () => /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi)\b/.test(text) && /\b(?:regie|régie|panneau live|pilotage)\b/.test(text),
      answer: "La régie, c’est ton poste de contrôle pendant le live. Elle garde les actions importantes sous la main : participant actuel, Lancer, Stop, Suivant, dernier tirage, dialogues, alertes et checklist. Les réglages plus lourds restent à part pour ne pas t’étouffer pendant l’animation.",
      actions: ["open_prepare"]
    },
    {
      intent: "configuration_purpose",
      test: () => /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi)\b/.test(text) && /\b(?:configuration|reglages|réglages|config)\b/.test(text),
      answer: "La configuration sert à préparer le live avant de lancer : participants, lots, stocks, apparence de la roue, dialogues, sons, raccourcis et sauvegardes. Pendant le direct, tu restes plutôt en Live simple ; quand tu dois régler quelque chose en profondeur, tu ouvres Configuration.",
      actions: ["open_prepare"]
    },
    {
      intent: "studios_purpose",
      test: () => /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi|explique)\b/.test(text) && /\bstudio\b/.test(text) && !/\b(?:scenario|scenarios|scénario|scénarios|roulette|roue)\b/.test(text),
      answer: "Quand tu dis le studio, il y en a surtout deux. Le Studio de la roulette sert a regler les lots, poids, stocks, textes et PNG de la roue. Le Studio de scenarios sert a regler les repliques de Charlie/Victoria, les emotes, effets speciaux, bruitages et etapes de scene. En live tu pilotes avec la regie ; hors live tu prepares dans les studios.",
      actions: ["open_wheel_studio_lots", "open_scenario_studio"]
    },
    {
      intent: "wheel_purpose",
      test: () => /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi)\b/.test(text) && /\b(?:roue|roulette)\b/.test(text) && !/\b(?:poid|poids|probabilite|proba|chance|taux)\b/.test(text),
      answer: "La roue est la scène centrale du tirage : elle affiche les lots, choisit le résultat et donne le moment fort du live. Ses chances viennent des poids des lots, et ses cases peuvent devenir indisponibles si les stocks sont épuisés.",
      actions: ["open_wheel_studio_lots"]
    },
    {
      intent: "result_purpose",
      test: () => /\b(?:resultat|résultat|gagnant|lot gagne|lot gagné)\b/.test(text) && /\b(?:sert|affiche|voir|apres|après|quoi)\b/.test(text),
      answer: "Le résultat sert à valider ce que le candidat vient de gagner et à donner un moment clair au public. Sur un vrai tirage, il peut alimenter l’historique, retirer du stock et faire avancer les lancers du participant. Si c’est une erreur, tu peux corriger le dernier tirage dans Sauvegarde.",
      actions: ["open_data"]
    },
    {
      intent: "alerts_meaning",
      test: () => /\b(?:alerte|alertes|pastille|point vert|point rouge|etat rouge|etat vert|status)\b/.test(text),
      answer: "Les alertes et pastilles servent à te dire si tu peux lancer sereinement. Vert indique que le point est OK, orange prévient qu’il faut vérifier, rouge signale un blocage ou un danger. Pour Keph, le voyant vert veut dire que l’assistance répond ; rouge veut dire qu’elle est hors ligne.",
      actions: ["open_prepare"]
    },
    {
      intent: "what_if_wrong_result",
      test: () => /\b(?:mauvais resultat|mauvais tirage|erreur tirage|tirage rate|tirage foire|trompe|annuler tirage|corriger tirage|tirage erreur)\b/.test(text),
      answer: "Si un tirage est parti par erreur, va dans Sauvegarde/Historique et utilise le bouton pour corriger le dernier tirage. Ça sert à revenir sur le dernier résultat, restaurer le contexte utile et éviter de laisser un historique faux.",
      actions: ["open_data"]
    },
    {
      intent: "explain_audio_library",
      test: () => /\b(?:bibliotheque|biblioteque|library|importer|ajouter)\b/.test(text) && /\b(?:mp3|audio|son|wav|ogg|bruitage)\b/.test(text),
      answer: "Pour ajouter un bruitage, ouvre Réglages > Scènes > Studio de scénarios. Dans le panneau de droite, le champ Bruitage a un bouton Importer : choisis ton MP3/WAV/OGG, il est ajouté à la bibliothèque et sélectionné pour la réplique en cours. Ensuite tu enregistres la réplique, et le son se jouera en même temps que ce dialogue.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "explain_stop_disabled",
      test: () => /\b(?:stop)\b/.test(text) && /\b(?:grise|gris|disabled|desactive|pourquoi|marche pas|impossible)\b/.test(text),
      answer: "Le bouton Stop est grisé quand la roue n'est pas dans une phase où elle peut être arrêtée. Il devient utile pendant un tirage réel, après le lancement, quand l'arrêt est autorisé. Si tu es en préparation, en résultat, en scène ou en tirage test non stoppable, c'est normal qu'il reste bloqué.",
      actions: ["open_prepare"]
    },
    {
      intent: "explain_profile_export",
      test: () => /\b(?:exporter|export|sauvegarder|backup|telecharger)\b/.test(text) && /\b(?:configuration|config|profil|tout|complete|complete)\b/.test(text),
      answer: "Pour exporter toute ta configuration, va dans Réglages > Sauvegarde puis utilise l’export de profil. Ça garde les participants, lots, stocks, dialogues, sons, raccourcis et réglages principaux dans un fichier que tu peux réimporter plus tard.",
      actions: ["open_data"]
    },
    {
      intent: "explain_lot_weight",
      test: () => /\b(?:poid|poids|probabilite|proba|chance|taux)\b/.test(text)
        && (/\b(?:case|lot|roue|roulette)\b/.test(text) || /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi|explique|comment marche|veut dire)\b/.test(text)),
      answer: `${yesNo ? "Oui, c'est exactement fait pour ca. " : ""}Dans Reglages > Lots & roue > Ouvrir le studio de la roulette, onglet Lots & probabilites, tu peux changer le poids de chaque case. Le poids, c'est sa chance relative : un lot a 20 sort environ deux fois plus souvent qu'un lot a 10. Tu peux aussi me demander "mets le poids du lot X a 10" et je te preparerai le bouton Appliquer.`,
      actions: ["open_wheel_studio_lots"]
    },
    {
      intent: "explain_present_candidates",
      test: () => /\b(?:a quoi sert|sert a quoi|pourquoi|c est quoi)\b/.test(text) && /\b(?:presenter|presentation)\b/.test(text) && /\b(?:candidat|candidats)\b/.test(text),
      answer: "Presenter les candidats sert a lancer une intro de spectacle avant la roue. Charlie/Victoria peuvent annoncer les participants, installer l'ambiance et donner un contexte au public. Ca ne lance pas la roue, ne consomme aucun stock et n'ajoute rien a l'historique : c'est uniquement de la mise en scene.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "explain_test_spin",
      test: () => /\b(?:tirage test|test)\b/.test(text) && /\b(?:sert|quoi|pourquoi|difference|vrai|normal)\b/.test(text),
      answer: "Le tirage test sert a verifier le rendu de la roue sans consequence. Il peut montrer un resultat fictif, tester le rythme et les sons, mais il ne consomme pas les stocks, ne change pas l'historique et ne retire pas de lancer au participant. Pour un vrai passage live, utilise Lancer.",
      actions: ["open_prepare"]
    },
    {
      intent: "explain_keyboard_shortcuts",
      test: () => /\b(?:raccourci|raccourcis|touche|clavier|espace|entree)\b/.test(text),
      answer: "Les raccourcis servent a piloter la regie sans viser les boutons a la souris pendant le live. Espace peut lancer, Entree peut stopper, et les touches affichees entre parentheses declenchent les actions comme Presenter, Jingle ou Finale. Tu peux les modifier dans Preparer > Raccourcis.",
      actions: ["open_shortcuts"]
    },
    {
      intent: "explain_effects_only",
      test: () => wantsPurpose && /\b(?:effet|effets|fx|speciaux|special|confetti|flash)\b/.test(text) && !/\bemote\b/.test(text),
      answer: "Les effets speciaux sont des animations de scene lancees par une replique ou une action : confettis, feu d'artifice, flash plateau, coupure lumiere, projecteurs, spotlight, shake leger, glitch, pluie d'etoiles, fumee, vague doree et alerte rouge. Ils servent a marquer les moments forts, pas a changer le resultat de la roue.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "explain_dialogue_audio",
      test: () => /\b(?:son|audio|mp3|wav|ogg|bruitage)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques|phrase)\b/.test(text),
      answer: "Oui, une réplique peut avoir son propre bruitage. Ouvre le Studio de scénarios, crée ou sélectionne la réplique, puis utilise le champ Bruitage dans le panneau de droite. Si ton son n'est pas encore dans la liste, clique Importer juste à côté du champ, choisis un MP3/WAV/OGG, puis enregistre la réplique.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "explain_jingle_dialogue",
      test: () => /\b(?:comment|creer|cree|ajouter|faire|modifier)\b/.test(text) && /\b(?:dialogue|replique|phrase)\b/.test(text) && /\bjingle\b/.test(text),
      answer: "Pour créer un dialogue de jingle, ouvre le Studio de scénarios, sélectionne l'étape Jingle dans la colonne de gauche, puis écris la réplique dans le panneau de droite. Choisis Charlie ou Victoria, ajoute éventuellement une emote, un effet spécial ou un bruitage, puis clique Ajouter la réplique. Elle sera jouée quand tu déclenches le jingle.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "explain_simulation",
      test: () => /\b(?:simulation|simuler|passage|repetition)\b/.test(text),
      answer: "Simuler un passage sert a repeter le deroule complet avant le live : candidat, presentation, tirage test et resultat fictif. C'est fait pour regler le rythme et verifier les dialogues sans toucher aux stocks, a l'historique ou aux vrais lancers.",
      actions: ["highlight_rehearsal"]
    },
    {
      intent: "explain_discord_scene",
      test: () => /\b(?:discord|obs|capture|scene propre|plein ecran|detacher)\b/.test(text),
      answer: "La scene Discord/OBS sert a montrer uniquement la partie publique : roue, candidat, resultat et dialogues. Pour garder les boutons hors capture, utilise le mode scene propre ou Detacher la regie : tu controles dans une fenetre separee pendant que la fenetre principale reste presentable.",
      actions: ["highlight_discord", "detach_control"]
    },
    {
      intent: "explain_stock",
      test: () => !/\b(?:sans toucher|sans modifier|sans consommer)\b/.test(text) && /\b(?:stock|stocks|indisponible|epuise|epuises|disponible)\b/.test(text),
      answer: "Les stocks servent a eviter qu'un lot deja epuise retombe pour les prochains candidats. Dans le Studio de la roulette, active le stock sur le lot, indique la quantite, puis la roue le grise et le rend indisponible quand il arrive a zero. C'est surtout utile pour les lots limites ou uniques.",
      actions: ["open_wheel_studio_lots"]
    },
    {
      intent: "explain_participant_attempts",
      test: () => /\b(?:lancer|lancers|ticket|tickets|participation|participations|tentative|tentatives)\b/.test(text) && /\b(?:participant|candidat|joueur|personne)\b/.test(text),
      answer: "Le nombre de lancers par participant sert a donner plusieurs chances a une personne sans la remettre plusieurs fois dans la file. Dans Preparer, ouvre la liste complete des participants puis ajuste le compteur de lancers. A chaque vrai tirage, il descend d'un cran ; quand il arrive a zero, tu peux passer au suivant.",
      actions: ["open_prepare"]
    },
    {
      intent: "explain_participant_queue",
      test: () => /\b(?:changer|modifier|charger|recharger|organiser)\b/.test(text) && /\b(?:file|liste|queue)\b/.test(text),
      answer: "Changer la file sert à définir l'ordre de passage des candidats pendant l'événement. Les candidats passeront dans cet ordre pour tourner la roue : le premier devient le participant actuel, puis Suivant charge le prochain. C'est utile pour préparer le live à l'avance, ajouter quelqu'un en fin de liste ou corriger l'ordre sans toucher aux lots.",
      actions: ["open_prepare"]
    },
    {
      intent: "explain_live_mode",
      test: () => /\b(?:live simple|regie complete|mode live)\b/.test(text) || (/\b(?:reglages)\b/.test(text) && /\b(?:live|regie)\b/.test(text)),
      answer: "Live simple garde seulement ce qui sert pendant l'animation : participant, Lancer, Stop, Suivant, dernier tirage et aides essentielles. Reglages ouvre la configuration complete quand tu dois preparer les lots, dialogues, sons ou sauvegardes. L'idee est de ne pas piloter le live au milieu de toutes les options.",
      actions: ["open_prepare"]
    },
    {
      intent: "explain_history",
      test: () => /\b(?:historique|dernier gagnant|corriger|annuler|export csv|csv)\b/.test(text),
      answer: "L'historique garde la trace des vrais tirages : dernier gagnant, total, gagnants par participant et export CSV. Le bouton corriger/annuler le dernier tirage sert si tu as lance par erreur ou si le live a eu un incident. Les tirages test et simulations ne doivent pas remplir cet historique.",
      actions: ["open_data"]
    },
    {
      intent: "explain_profile_export",
      test: () => /\b(?:profil|import|export|sauvegarde|backup|restaurer)\b/.test(text),
      answer: "L'export profil sert a garder une configuration complete : participants, lots, stocks, dialogues, sons, raccourcis et reglages utiles. C'est pratique avant un gros live ou pour reutiliser une roulette plus tard. L'import restaure ce profil sans devoir tout refaire a la main.",
      actions: ["open_data"]
    },
    {
      intent: "explain_presets",
      test: () => /\b(?:preset|presets|tirage normal|annonce candidat|pause|finale|scene finale)\b/.test(text),
      answer: "Les presets sont des raccourcis de mise en scene. Tirage remet la roue au centre, Annonce candidat prepare l'intro du participant, Pause nettoie la scene, Resultat remet l'accent sur le lot obtenu, et Finale lance la cloture. Ils evitent de regler plusieurs options une par une pendant le live.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "explain_emotes_effects",
      test: () => /\b(?:emote|emotes|emoji|effet|effets|confetti|flash|feu artifice|lumiere)\b/.test(text),
      answer: "Les effets spéciaux sont des animations visuelles déclenchées par une réplique : confettis, flash, coupure de lumière, fumée, glitch, projecteur, etc. Ils ne changent pas le tirage ; ils servent seulement à donner de l'impact à un moment du show. Dans le Studio de scénarios, choisis une réplique puis règle Effet spécial.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "explain_me_cues",
      test: () => /\b(?:slash me|indication scenique|indication scénique|commande me)\b/.test(text) || (/\bme\b/.test(text) && /\b(?:c est quoi|sert|signifie|veut dire|commande)\b/.test(text)),
      answer: "Un /me est une indication scénique. Au lieu de faire parler Charlie ou Victoria dans une grosse bulle, ça affiche une petite action près du personnage, par exemple « Charlie regarde la roue » ou « Victoria applaudit ». C'est pratique pour donner de la vie sans couper le dialogue principal.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "explain_dialogue_queue",
      test: () => /\b(?:file de dialogue|file de dialogues|file dialogues|dialogue suivant|passer|rejouer|auto|manuel|manual)\b/.test(text),
      answer: "La file de dialogues sert a controler ce que Charlie/Victoria vont dire ensuite. Suivant joue la prochaine replique, Passer la saute, Rejouer relance la replique actuelle, Vider nettoie la file. En auto, le site enchaine selon la scene ; en manuel, tu gardes la main.",
      actions: ["open_scenario_studio"]
    },
    {
      intent: "explain_audio_panel",
      test: () => !/\b(?:dialogue|dialogues|replique|repliques|phrase)\b/.test(text) && /\b(?:mute|couper|volume|jingle|jingles|roulette|son actif)\b/.test(text),
      answer: "La section Sons sert a controler l'ambiance sans fouiller partout : couper tous les sons, regler le volume des jingles, regler le volume de la roulette et tester les sons de scene. Avant un live Discord, c'est l'endroit a verifier pour eviter un jingle trop fort ou une roulette muette.",
      actions: ["open_audio"]
    },
    {
      intent: "edit_lot_text_size",
      test: () => /\b(?:taille|grossir|retrecir|agrandir|reduire|police|texte)\b/.test(text) && /\b(?:lot|lots|case|cases|roue)\b/.test(text),
      answer: "Pour modifier la taille du texte d'un lot, ouvre Lots & roue puis Ouvrir le studio de la roulette. Va dans Design & PNG, sélectionne la case concernée, puis ajuste la taille du texte et sa position jusqu'à ce qu'il tienne bien dans la case. Ça change seulement l'affichage : les probabilités et stocks restent dans Lots & probabilités.",
      actions: ["open_wheel_studio_design"]
    },
    {
      intent: "explain_visual_studio",
      test: () => /\b(?:design|png|image|images|apparence|texte|taille|police|couleur|visuel)\b/.test(text) && /\b(?:roue|lot|case)\b/.test(text),
      answer: "Le studio visuel de la roue sert a regler l'affichage des cases sans changer les chances de tirage : textes, images PNG, tailles, positions, couleurs et lisibilite. Si tu veux changer les probabilites ou les stocks, reste dans Lots & probabilites ; si tu veux que la case soit plus propre a l'ecran, va dans Design & PNG.",
      actions: ["open_wheel_studio_design", "open_wheel_studio_lots"]
    },
    {
      intent: "explain_checklist_alerts",
      test: () => /\b(?:checklist|alerte|alertes|pre live|pret|roue en cours|stop possible|etat)\b/.test(text),
      answer: "La checklist et les alertes sont la securite avant live. Elles te signalent les participants charges, les lots disponibles, les stocks OK, le son actif, la scene propre et les raccourcis. Les etats comme Pret, Roue en cours, Stop possible ou Resultat servent a savoir quoi faire d'un coup d'oeil.",
      actions: ["open_prepare"]
    }
  ];
  const picked = directAnswers.find((entry) => entry.test());
  if (!picked) return null;
  const knowledge = charlieKephKnowledge();
  return {
    answer: picked.answer,
    actions: normalizedKephActions(picked.actions, knowledge),
    source: "direct",
    matched: true,
    intent: picked.intent
  };
}

function fallbackKephAnswer(message, context = {}) {
  const knowledge = charlieKephKnowledge();
  const diagnostic = kephDiagnostics(message, context);
  if (diagnostic) return diagnostic;
  const text = normalizeKephText(message);
  const direct = directKephAnswer(message);
  const uiMap = kephUiMapAnswer(message);
  if (direct) return direct;
  if (uiMap) return uiMap;
  const siteQuestion = isKephSiteQuestion(message);
  const keywordScore = (keyword) => {
    const parts = normalizeKephText(keyword).split(" ").filter(Boolean);
    if (!parts.length) return 0;
    return parts.every((part) => text.includes(part)) ? parts.length : 0;
  };
  const scored = (knowledge.features || [])
    .map((feature) => ({
      feature,
      score: (feature.keywords || []).reduce((sum, keyword) => sum + keywordScore(keyword), 0)
    }))
    .sort((a, b) => b.score - a.score);
  const best = scored.find((item) => item.score > 0);
  const picked = best?.feature || null;
  const docs = siteQuestion ? kephDocumentationSearch(message, context) : [];
  const instantDoc = docs.find((doc) => doc.instant && Number(doc.score || 0) >= 8);
  if (instantDoc && !kephRemoteConfig()) {
    return {
      answer: instantDoc.answer || instantDoc.content || "",
      actions: normalizedKephActions(instantDoc.actions || [], knowledge),
      source: "doc",
      matched: true,
      intent: instantDoc.id,
      docs: [instantDoc],
      expectedAnswer: instantDoc.answer || instantDoc.content || ""
    };
  }
  const docActions = docs.flatMap((doc) => doc.id !== "context" ? (doc.actions || []) : []);
  const guideActions = direct?.actions?.length ? direct.actions
    : uiMap?.actions?.length ? uiMap.actions
      : siteQuestion ? normalizedKephActions(docActions.length ? docActions : (picked?.actions || []), knowledge) : [];
  const firstDoc = docs.find((doc) => doc.id !== "context");
  const expectedAnswer = direct?.answer || firstDoc?.content || "";
  return {
    answer: direct?.answer || firstDoc?.content || uiMap?.answer || picked?.answer || "Je peux t'aider, mais il me manque un peu de contexte. Dis-moi si tu veux comprendre une fonction, retrouver un menu ou preparer une action a confirmer.",
    actions: guideActions,
    source: "retrieval",
    matched: !!(direct || uiMap || best || docs.length),
    intent: direct?.intent || uiMap?.intent || firstDoc?.id || picked?.id || "retrieval",
    docs,
    expectedAnswer
  };
}

function recentKephLearningExamples(question = "") {
  try {
    const rows = db.prepare(`
      SELECT vote, reason, question, answer, intent, source
      FROM keph_feedback
      WHERE vote = 'dislike'
      ORDER BY id DESC
      LIMIT 12
    `).all();
    const asked = normalizeKephText(question);
    return rows
      .map((row) => ({
        reason: String(row.reason || "").slice(0, 180),
        question: String(row.question || "").slice(0, 220),
        erreur_a_eviter: String(row.reason || "").slice(0, 120),
        intent: String(row.intent || row.source || "").slice(0, 80),
        score: normalizeKephText(`${row.question} ${row.reason} ${row.answer}`).split(" ").filter((part) => part.length > 2 && asked.includes(part)).length
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(({ score, ...entry }) => entry);
  } catch {
    return [];
  }
}

function recentKephPositiveExamples(question = "") {
  try {
    const rows = db.prepare(`
      SELECT question, answer, intent, source
      FROM keph_feedback
      WHERE vote = 'like'
      ORDER BY id DESC
      LIMIT 8
    `).all();
    const asked = normalizeKephText(question);
    return rows
      .map((row) => ({
        question: String(row.question || "").slice(0, 220),
        good_answer: String(row.answer || "").slice(0, 150),
        intent: String(row.intent || row.source || "").slice(0, 80),
        score: normalizeKephText(`${row.question} ${row.answer}`).split(" ").filter((part) => part.length > 2 && asked.includes(part)).length
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(({ score, ...entry }) => entry);
  } catch {
    return [];
  }
}

function kephAiContext(message, context = {}) {
  const text = normalizeKephText(message);
  const wantsDialogues = /\b(?:dialogue|dialogues|replique|repliques|scenario|presentation|jingle|resultat|finale)\b/.test(text);
  const wantsLots = /\b(?:lot|lots|poids|stock|roue|case|probabilite)\b/.test(text);
  const wantsAudio = /\b(?:son|audio|mp3|wav|ogg|bruitage|jingle)\b/.test(text);
  return {
    currentCandidate: context?.currentCandidate || "",
    nextParticipant: context?.nextParticipant || "",
    queueRemaining: context?.queueRemaining || 0,
    activeSection: context?.activeSection || "",
    activePanel: context?.activePanel || context?.activeTab || context?.screen || "",
    activeControl: context?.activeControl || context?.currentControl || context?.focusedField || context?.selectedField || "",
    configOpen: !!context?.configOpen,
    stage: context?.stage || "",
    soundMuted: !!context?.soundMuted,
    availableLots: context?.availableLots || 0,
    unavailableLots: Array.isArray(context?.unavailableLots) ? context.unavailableLots.slice(0, 5) : [],
    lots: wantsLots && Array.isArray(context?.lots) ? context.lots.slice(0, 10) : undefined,
    dialogues: wantsDialogues && Array.isArray(context?.dialogues) ? context.dialogues.slice(0, 12).map((cue) => ({
      index: cue.index,
      trigger: cue.trigger,
      speaker: cue.speaker,
      kind: cue.kind,
      text: String(cue.text || "").slice(0, 120),
      emote: cue.emote || "",
      fx: cue.fx || "",
      audioId: cue.audioId || ""
    })) : undefined,
    audioAssets: wantsAudio && Array.isArray(context?.audioAssets) ? context.audioAssets.slice(0, 10) : undefined,
    participantDraws: context?.participantDraws || undefined,
    settingsSnapshot: context?.settingsSnapshot || undefined
  };
}

function kephSystemPrompt() {
  const knowledge = charlieKephKnowledge();
  return [
    "Tu es Keph, assistant de regie de Charlie Roulette.",
    "Tu aides l'organisateur pendant un live. Reponds en francais naturel, precis, humain, et tutoie l'utilisateur.",
    "Ta reponse doit d'abord repondre exactement a la question posee. Si la question est simple, reponds simplement. Si elle demande une procedure, donne des etapes courtes. Si elle demande a quoi ca sert, explique l'usage live et la consequence.",
    "Ne declenche pas une fiche generique parce qu'un mot ressemble a un sujet. Par exemple, si on demande 'qui est Victoria ?', parle de Victoria, pas de la creation de dialogues.",
    "Utilise la documentation fournie comme source de verite, mais reformule et cible la demande. Ne copie-colle pas automatiquement la documentation.",
    "Si aide_ciblee.reponse_attendue existe, utilise-la comme intention verifiee: reponds dans ce sens, en l'adaptant a la question.",
    "Les exemples dislike sont des contre-exemples: evite de reproduire ces erreurs. Les exemples like montrent le style et le niveau de precision a viser.",
    "Le champ currentCandidate designe le candidat affiche sur la roue, pas la personne qui te parle. Ne salue jamais l'organisateur avec le nom du candidat.",
    "Pour Charlie Roulette, utilise seulement les fonctions presentes dans la documentation, la base de connaissance et l'aide ciblee si elle est fournie.",
    "Tu peux repondre aux petites questions generales simples, mais ramene doucement vers la roulette si c'est utile.",
    "Quand c'est utile, propose des actions dans un tableau actions. N'invente jamais d'id d'action.",
    "Tu ne modifies jamais les donnees a la place de l'utilisateur.",
    "Reponds uniquement en JSON valide: {\"answer\":\"...\",\"actions\":[{\"id\":\"...\",\"label\":\"...\"}]}",
    "Actions autorisees:",
    JSON.stringify((knowledge.actions || []).map((action) => ({ id: action.id, label: action.label })))
  ].join("\n");
}

function safeParseKephAiJson(content) {
  const text = String(content || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function kephRemoteConfig() {
  const forced = normalizeKephText(process.env.KEPH_REMOTE_PROVIDER || "");
  if ((forced === "groq" || (!forced && process.env.GROQ_API_KEY)) && process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      model: process.env.GROQ_MODEL || process.env.KEPH_REMOTE_MODEL || "llama-3.1-8b-instant",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY
    };
  }
  if ((forced === "gemini" || (!forced && process.env.GEMINI_API_KEY)) && process.env.GEMINI_API_KEY) {
    return {
      provider: "gemini",
      model: process.env.GEMINI_MODEL || process.env.KEPH_REMOTE_MODEL || "gemini-2.5-flash-lite",
      key: process.env.GEMINI_API_KEY
    };
  }
  if ((forced === "openrouter" || (!forced && process.env.OPENROUTER_API_KEY)) && process.env.OPENROUTER_API_KEY) {
    return {
      provider: "openrouter",
      model: process.env.OPENROUTER_MODEL || process.env.KEPH_REMOTE_MODEL || "openrouter/free",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY
    };
  }
  return null;
}

function kephRemotePrompt() {
  return [
    "Tu es Keph, assistant de regie de Charlie Roulette.",
    "Reponds en francais naturel, precis, court et directement a la question.",
    "Mode reponse verifiee: pour les questions sur Charlie Roulette, utilise uniquement les fiches documentation fournies comme source de verite.",
    "Si question_site=true et documentation_suffisante=false, reponds exactement que tu ne vois pas cette fonction dans la documentation du site, puis demande une precision courte.",
    "N'invente jamais de bouton, menu, effet, option ou chemin qui n'apparait pas dans les fiches.",
    "Si la question vise une option precise, reponds sur cette option precise avant de parler de la rubrique. Exemple: 'a quoi sert importer' doit expliquer l'import, pas toute la page Sauvegarde.",
    "Dans une reponse d'aide normale, ne montre jamais de commandes internes comme /add_lot, /setpoids ou /add_dialogue. Explique l'interface utilisateur. Les commandes sont reservees au mode action controlee gere par le serveur.",
    "Si l'utilisateur demande simplement si tu sais faire quelque chose, reponds oui/non et explique la difference entre donner des idees et preparer une action a confirmer. Ne lance pas l'action.",
    "Pour les questions vagues comme 'ca se trouve ou ?', demande une precision courte au lieu de deviner.",
    "Si la question demande comment faire, donne des etapes courtes.",
    "Si elle demande a quoi ca sert, explique l'usage live et les consequences.",
    "Quand une fiche contient location, purpose, live_use, modifies ou does_not_modify, utilise ces champs pour cibler la reponse.",
    "Si une fiche contient actions, renvoie les actions utiles dans le tableau actions avec les memes id et labels autorises.",
    "Le candidat actuel n'est pas la personne qui te parle.",
    "Reponds uniquement en JSON valide: {\"answer\":\"...\",\"actions\":[{\"id\":\"...\",\"label\":\"...\"}]}"
  ].join("\n");
}

function kephRemotePayload(message, context, guidance) {
  const siteQuestion = isKephSiteQuestion(message);
  const docs = guidance?.docs || kephDocumentationSearch(message, context);
  const verifiedDocs = docs.filter((doc) => doc.id !== "context" && Number(doc.score || 0) >= 8);
  return {
    question: String(message || "").slice(0, 800),
    question_site: siteQuestion,
    documentation_suffisante: !siteQuestion || verifiedDocs.length > 0 || !!guidance?.matched,
    contexte: kephAiContext(message, context),
    documentation: docs.slice(0, 3).map(kephDocCard),
    reponse_attendue: String(guidance?.expectedAnswer || guidance?.answer || "").slice(0, 900),
    actions_autorisees: (charlieKephKnowledge().actions || []).map((action) => ({ id: action.id, label: action.label }))
  };
}

async function askRemoteKeph(message, context, guidance = null, timeoutMs = KEPH_REMOTE_TIMEOUT_MS) {
  const config = kephRemoteConfig();
  if (!config) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const prompt = kephRemotePrompt();
    const payload = kephRemotePayload(message, context, guidance);
    if (config.provider === "gemini") {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.key)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${prompt}\n\n${JSON.stringify(payload)}` }] }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 260, responseMimeType: "application/json" }
        })
      });
      if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
      const json = await response.json();
      const content = json?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
      const parsed = safeParseKephAiJson(content);
      if (!parsed) throw new Error("Gemini JSON invalide");
      return { ...parsed, provider: config.provider, model: config.model };
    }
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${config.key}`
    };
    if (config.provider === "openrouter") {
      headers["HTTP-Referer"] = APP_PUBLIC_URL;
      headers["X-Title"] = "Charlie Roulette Keph";
    }
    const response = await fetch(config.url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: JSON.stringify(payload) }
        ],
        temperature: 0.25,
        max_tokens: 260,
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) throw new Error(`${config.provider} HTTP ${response.status}`);
    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content || "";
    const parsed = safeParseKephAiJson(content);
    if (!parsed) throw new Error(`${config.provider} JSON invalide`);
    return { ...parsed, provider: config.provider, model: config.model };
  } finally {
    clearTimeout(timer);
  }
}

const KEPH_EDIT_COMMANDS = [
  { name: "setlance", syntax: 'setlance "participant" nombre', purpose: "Changer le nombre de lancers/tickets d'un participant." },
  { name: "add_player", syntax: 'add_player "participant" [lancers]', purpose: "Ajouter un participant a la fin de la file." },
  { name: "clear_queue", syntax: "clear_queue", purpose: "Vider la file d'attente des participants apres confirmation." },
  { name: "set_queue", syntax: 'set_queue "participant 1" "participant 2" ...', purpose: "Charger ou reorganiser la file d'attente dans un ordre precis." },
  { name: "setstock", syntax: 'setstock "lot" nombre', purpose: "Changer le stock d'un lot et activer son suivi de stock." },
  { name: "setpoids", syntax: 'setpoids "lot" nombre', purpose: "Changer le poids/probabilite relative d'un lot." },
  { name: "clear_lots", syntax: "clear_lots", purpose: "Vider la roue avant de creer une nouvelle liste de lots." },
  { name: "rename_lot", syntax: 'rename_lot "ancien lot" "nouveau nom"', purpose: "Renommer un lot existant." },
  { name: "set_lot_color", syntax: 'set_lot_color "lot" "#hex"', purpose: "Changer la couleur d'une case de roue." },
  { name: "enable_lot", syntax: 'enable_lot "lot"', purpose: "Activer un lot." },
  { name: "disable_lot", syntax: 'disable_lot "lot"', purpose: "Desactiver un lot." },
  { name: "add_lot", syntax: 'add_lot "nom" poids [stock]', purpose: "Creer un nouveau lot simple." },
  { name: "add_dialogue", syntax: 'add_dialogue "etape" "personnage" "texte" [--kind "dialogue|me"] [--emote "..."] [--fx "..."]', purpose: "Ajouter une replique ou un /me au Studio de scenarios." },
  { name: "delete_dialogue", syntax: 'delete_dialogue "id"', purpose: "Supprimer une replique par id." },
  { name: "set_setting", syntax: 'set_setting "cle" "valeur"', purpose: "Modifier un reglage autorise du profil." },
  { name: "testeffect", syntax: 'testeffect "effet"', purpose: "Jouer un effet special en apercu sans modifier la sauvegarde." },
  { name: "testemote", syntax: 'testemote "emote"', purpose: "Afficher une emote de test dans une bulle de dialogue." },
  { name: "startjingle", syntax: "startjingle", purpose: "Lancer le jingle de debut." },
  { name: "startpresentation", syntax: "startpresentation", purpose: "Lancer la presentation des candidats." },
  { name: "startnext", syntax: "startnext", purpose: "Lancer l'annonce du candidat actuel/suivant." },
  { name: "startfinale", syntax: "startfinale", purpose: "Lancer la scene finale." },
  { name: "starttestdraw", syntax: "starttestdraw", purpose: "Lancer un tirage test sans stock ni historique." },
  { name: "startrehearsal", syntax: "startrehearsal", purpose: "Lancer la simulation live complete sans toucher aux stocks." },
  { name: "startdraw", syntax: "startdraw", purpose: "Lancer un vrai tirage, avec stocks et historique, apres confirmation." },
  { name: "stopdraw", syntax: "stopdraw", purpose: "Appuyer sur STOP si la roue tourne." },
  { name: "nextparticipant", syntax: "nextparticipant", purpose: "Passer au participant suivant dans la file." },
  { name: "discordmode", syntax: "discordmode", purpose: "Basculer en mode scene Discord propre." },
  { name: "fullscreen", syntax: "fullscreen", purpose: "Basculer l'affichage du navigateur en plein ecran." },
  { name: "config_fullscreen", syntax: "config_fullscreen", purpose: "Ouvrir la configuration en plein ecran." },
  { name: "detach_control", syntax: "detach_control", purpose: "Detacher la regie dans une autre fenetre." },
  { name: "open", syntax: 'open "preparer|roulette|scenarios|sons|donnees"', purpose: "Ouvrir un espace de reglage sans modifier la sauvegarde." }
];

function isKephEditRequest(message = "") {
  const text = normalizeKephText(message);
  if (/\b(?:ne cree rien|ne creer rien|ne cree pas|ne creer pas|sans creer|sans modifier|juste des idees|juste des idées|donne moi des idees|donne moi des idées|tu ferais quoi|tu sais creer|tu sais créer|tu sais faire|tu peux m aider|peux tu m aider|aide moi|explique moi)\b/.test(text)) return false;
  if (/\b(?:liste|lister|affiche|afficher|montre|montrer|donne moi)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques)\b/.test(text)) return false;
  const learningQuestion = /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi|explique|pourquoi|comment fonctionne|comment je peux|comment faire|comment ajouter|comment creer|comment modifier|comment utiliser|comment mettre|ou est|ou se trouve|ou trouver|ou mettre|que fait|ca sert a quoi)\b/.test(text);
  const yesNoQuestion = /\b(?:on peut|peut on|est ce que|possible|je peux)\b/.test(text);
  const explicitDoNow = /\b(?:tu peux|peux tu|peux-tu|stp|s il te plait|maintenant)\b/.test(text)
    && /\b(?:ajoute|ajouter|cree|creer|mets|mettre|met|modifie|modifier|change|changer|renomme|renommer|supprime|supprimer|vide|vider|active|activer|desactive|desactiver|lance|lancer|joue|jouer|ouvre|ouvrir)\b/.test(text)
    && !/\b(?:m aider|m expliquer|me guider|comment)\b/.test(text);
  if (learningQuestion && !explicitDoNow) return false;
  if (yesNoQuestion && !explicitDoNow) return false;
  if (/\?$/.test(String(message || "").trim()) && !explicitDoNow) return false;
  if (/\b(?:renomme|renommer|renome|renomer|appelle|nomme)\b/.test(text)) return true;
  if (/\b(?:supprime|supprimer|vide|vider|efface|effacer|retire|retirer|charge|charger|reorganise|reorganiser|ordre|tete de liste)\b/.test(text) && /\b(?:file|liste|queue|attente|candidats|participants|premier|deux|trois)\b/.test(text)) return true;
  if (/\b(?:relance|relances|lancer|lancers|participation|participations)\b/.test(text) && /\b\d{1,2}\b/.test(text)) return true;
  if (/\b(?:testeffect|testemote|startjingle|startpresentation|startnext|startfinale|starttestdraw|startrehearsal|startdraw|stopdraw)\b/.test(text)) return true;
  if (/\b(?:detache|detacher|separe|separer)\b/.test(text) && /\b(?:regie|controle|panneau)\b/.test(text)) return true;
  if (/\b(?:dialogue|dialogues|replique|repliques)\b/.test(text) && /\b(?:ecris|ecrire|redige|rediger|fais|faire|prepare|preparer|genere|generer|cree|creer)\b/.test(text)) return true;
  if (/\b(?:roue|roulette|lots?)\b/.test(text) && /\b(?:complete|6|six|cree|creer|genere|generer|vide|vider)\b/.test(text)) return true;
  if (/\b(?:profil|regle|reglage|show|dynamique|anti repetition|humeur)\b/.test(text) && /\b(?:regle|regler|configure|configurer|active|desactive)\b/.test(text)) return true;
  return /\b(?:mets|met|mettre|donne|change|changer|modifie|modifier|ajoute|ajouter|cree|creer|supprime|supprimer|desactive|desactiver|active|activer|renomme|renommer|renome|prepare|preparer|fais moi|faire|ecris|ecrire|redige|rediger|genere|generer|test|teste|tester|testeffect|testemote|lance|lancer|startjingle|startpresentation|startnext|startfinale|startdraw|joue|jouer|demarre|demarrer|passe|passer|stop|arrete|arret|ouvre|ouvrir|mode|detache|detacher)\b/.test(text)
    && /\b(?:relance|relances|lancer|lance|participant|candidat|joueur|lot|stock|poids|poid|roue|dialogue|replique|jingle|presentation|startpresentation|startjingle|scenario|scene finale|finale|emote|testemote|effet|effets|fx|testeffect|tirage test|suivant|repetition|simulation|discord|obs|regie|studio|configuration|plein ecran|pleine ecran|fullscreen|detache|detacher)\b/.test(text);
}

function cleanKephName(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(?:le|la|les|l'|roue|roulette|candidat|participant|joueur|nombre de relances?|nombre de lancers?|relances?|lancers?)\s+(?:de|du|d'|pour)?\s*/i, "")
    .replace(/^(?:de|du|d'|pour|a|à)\s+/i, "")
    .replace(/\s+(?:a|à|sur|avec)\s*$/i, "")
    .replace(/[.,!?;:]+$/g, "")
    .slice(0, 80);
}

function quoteCommandArg(value = "") {
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function kephTokenScore(needle = "", candidate = "") {
  const wanted = normalizeKephText(needle).split(" ").filter((part) => part.length > 1);
  const hay = normalizeKephText(candidate);
  if (!wanted.length || !hay) return 0;
  if (hay === normalizeKephText(needle)) return 100;
  if (hay.includes(normalizeKephText(needle))) return 80 + wanted.length;
  const hits = wanted.filter((part) => hay.includes(part)).length;
  const tokenScore = hits ? hits / wanted.length * 60 + hits : 0;
  const needleNorm = normalizeKephText(needle);
  const fuzzyScore = wanted.length === 1 ? Math.max(0, 70 - kephEditDistance(needleNorm, hay) * 18) : 0;
  return Math.max(tokenScore, fuzzyScore);
}

function kephEditDistance(a = "", b = "") {
  a = String(a || "");
  b = String(b || "");
  if (!a) return b.length;
  if (!b) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, row[j - 1], row[j]) + 1;
      prev = temp;
    }
  }
  return row[b.length];
}

function findKephBestName(candidates = [], requested = "") {
  const scored = candidates
    .map((name) => ({ name, score: kephTokenScore(requested, name) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.score >= 35 ? scored[0].name : "";
}

function kephNamesFromListText(value = "") {
  return String(value || "")
    .replace(/\b(?:charge|charger|mets|mettre)\s+(?:la\s+)?(?:file|liste|queue|liste d'attente|file d'attente).*$/i, "")
    .split(/,|\bet\b|\bpuis\b|\n|\r|;/i)
    .map((name) => cleanKephName(name
      .replace(/^\s*(?:mets|met|mettre|place|placer|charge|charger)\s+/i, "")
      .replace(/\b(?:en|a|à)\s+(?:tete|tête|premier|premiere|première|deux|deuxieme|deuxième|trois|troisieme|troisième|position\s*\d+)\b/gi, "")
      .replace(/\b(?:de\s+)?(?:liste|file|queue|attente)\b/gi, "")))
    .filter((name) => /^[A-Za-z0-9À-ÿ _-]{2,40}$/.test(name))
    .slice(0, 30);
}

function kephScenarioDialogueCommands(trigger = "presentation", candidates = []) {
  const list = candidates.length ? candidates.join(", ") : "les candidats";
  const first = candidates[0] || "{candidatactuel}";
  const templates = {
    presentation: [
      ["charlie", `Bonsoir public, ce soir ${list} entrent dans la roulette la moins assurée juridiquement du serveur.`, "laugh", "spotlights", "dialogue"],
      ["victoria", `Je rappelle que sourire avant un tirage augmente les chances de 0%, mais ça rend mieux sur Discord.`, "smile", "goldwave", "dialogue"],
      ["charlie", `Charlie ajuste trois fiches candidats et fait semblant de savoir lire les petites lignes.`, "question", "smoke", "me"],
      ["victoria", `${first} ouvre le bal. Les autres peuvent encore négocier avec la roue, mais elle répond rarement.`, "star", "flash", "dialogue"]
    ],
    jingle: [
      ["charlie", "Jingle lancé, dignité rangée, on passe officiellement en mode spectacle.", "star", "spotlights", "dialogue"],
      ["victoria", "Les lumières montent, la roue brille, et Charlie vient de perdre le bouton mute.", "laugh", "goldwave", "dialogue"],
      ["charlie", "Charlie pointe la roue comme si elle lui devait de l'argent.", "angry", "smoke", "me"],
      ["victoria", `Bienvenue ${first}, installe-toi. Le hasard a mis une cravate pour l'occasion.`, "smile", "confetti", "dialogue"]
    ],
    spin: [
      ["charlie", "{candidatactuel}, le bouton STOP existe. Je précise parce que la roue commence à prendre confiance.", "question", "alert", "dialogue"],
      ["victoria", "Regardez bien la vitesse : c'est le moment où tout le monde devient expert en probabilités.", "star", "spotlight", "dialogue"],
      ["charlie", "Charlie fixe le pointeur avec l'intensité d'un comptable devant une facture mystère.", "sweat", "shake", "me"],
      ["victoria", "Si ça tombe sur rien, on dira que c'était une décision artistique.", "laugh", "glitch", "dialogue"]
    ],
    result: [
      ["victoria", "{candidatactuel} remporte {lot}. Le destin a parlé, et cette fois il avait un micro.", "star", "confetti", "dialogue"],
      ["charlie", "Charlie verifie le lot, le public, puis son plan de fuite.", "sweat", "flash", "me"],
      ["charlie", "Je confirme : {lot}, c'est officiel. Mon avocat dit que je dois dire bravo.", "laugh", "goldwave", "dialogue"],
      ["victoria", "Applaudissements pour {candidatactuel}. Meme la roue a l'air surprise.", "love", "stars", "dialogue"]
    ],
    next: [
      ["charlie", "On respire, on range les confettis imaginaires, et on appelle le prochain courageux.", "smile", "spotlight", "dialogue"],
      ["victoria", "{candidatsuivant}, prépare-toi. La roue vient de finir son échauffement dramatique.", "star", "flash", "dialogue"],
      ["charlie", "Charlie tourne la page du conducteur avec beaucoup trop de gravité.", "question", "smoke", "me"]
    ],
    finale: [
      ["victoria", "Merci à tous les candidats : {participants}. La roue retourne dans sa loge.", "love", "goldwave", "dialogue"],
      ["charlie", "Charlie salue le public, puis demande discrètement si les lots étaient bien remboursés.", "laugh", "confetti", "me"],
      ["charlie", "Fin du show. Si quelqu'un demande, tout était parfaitement prévu.", "star", "fireworks", "dialogue"]
    ],
    idle: [
      ["charlie", "Petit temps mort. La roue attend, Victoria sourit, moi je soupçonne un piège.", "question", "smoke", "dialogue"],
      ["victoria", "On peut prendre dix secondes. Le suspense aussi a besoin de s'hydrater.", "smile", "spotlight", "dialogue"]
    ]
  };
  return (templates[trigger] || templates.presentation).map(([speaker, text, emote, fx, kind]) =>
    `add_dialogue ${quoteCommandArg(trigger)} ${quoteCommandArg(speaker)} ${quoteCommandArg(text)} --kind ${quoteCommandArg(kind)} --emote ${quoteCommandArg(emote)} --fx ${quoteCommandArg(fx)}`
  );
}

function kephRequestedCount(text = "", fallback = 5) {
  const match = normalizeKephText(text).match(/\b(\d{1,2})\s+(?:candidats?|participants?|dialogues?|repliques?)\b/);
  if (match) return Math.max(1, Math.min(12, Number(match[1])));
  if (/\bcinq\b/.test(normalizeKephText(text))) return 5;
  if (/\bquatre\b/.test(normalizeKephText(text))) return 4;
  if (/\btrois\b/.test(normalizeKephText(text))) return 3;
  return fallback;
}

function kephCandidatePresentationDialogueCommands(candidates = [], count = 5) {
  const picked = candidates.slice(0, count);
  while (picked.length < count) picked.push(`Candidat ${picked.length + 1}`);
  const lines = [
    ["charlie", (name, index) => `${name}, premier controle technique : sourire au public et ne pas negocier avec la roue avant le depart.`, "laugh", "spotlights"],
    ["victoria", (name, index) => `${name} entre en scene. On applaudit fort : plus c'est bruyant, moins on entend Charlie lire les petites lignes.`, "smile", "goldwave"],
    ["charlie", (name, index) => `${name}, dossier valide. La roulette promet du suspense, pas forcement de la justice.`, "question", "flash"],
    ["victoria", (name, index) => `${name} rejoint la liste des courageux. La roue fait semblant d'etre neutre, c'est deja beaucoup.`, "star", "confetti"],
    ["charlie", (name, index) => `${name}, bienvenue. Si le destin te regarde bizarrement, regarde Victoria, elle sourit mieux que moi.`, "wink", "spotlight"]
  ];
  return picked.map((name, index) => {
    const [speaker, textFactory, emote, fx] = lines[index % lines.length];
    return `add_dialogue "presentation" ${quoteCommandArg(speaker)} ${quoteCommandArg(textFactory(name, index))} --kind "dialogue" --emote ${quoteCommandArg(emote)} --fx ${quoteCommandArg(fx)}`;
  });
}

function kephCommandAllowed(command = "") {
  const name = String(command).split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "") || "";
  return KEPH_EDIT_COMMANDS.some((entry) => entry.name === name);
}

function kephCommandPlanFromRules(message, context = {}) {
  const raw = String(message || "");
  const text = normalizeKephText(raw);
  if (/\b(?:ne cree rien|ne creer rien|ne cree pas|ne creer pas|sans creer|sans modifier|juste des idees|juste des idées|donne moi des idees|donne moi des idées|tu ferais quoi|tu sais creer|tu sais créer)\b/.test(text)) return null;
  if (/\b(?:liste|lister|affiche|afficher|montre|montrer|donne moi)\b/.test(text) && /\b(?:dialogue|dialogues|replique|repliques)\b/.test(text)) return null;
  const helpOnly = /\b(?:a quoi sert|sert a quoi|c est quoi|c quoi|explique|pourquoi|comment je peux|comment faire|comment ajouter|comment creer|comment modifier|comment utiliser|comment mettre|ou est|ou trouver|ou mettre|ca sert a quoi)\b/.test(text);
  const explicitDoNow = /\b(?:tu peux|peux tu|peux-tu|stp|s il te plait|maintenant)\b/.test(text)
    && /\b(?:ajoute|ajouter|cree|creer|mets|mettre|met|modifie|modifier|change|changer|renomme|renommer|supprime|supprimer|vide|vider|active|activer|desactive|desactiver|lance|lancer|joue|jouer|ouvre|ouvrir)\b/.test(text)
    && !/\b(?:m aider|m expliquer|me guider|comment)\b/.test(text);
  if (helpOnly && !explicitDoNow) return null;
  const commands = [];
  const add = (command) => { if (command && kephCommandAllowed(command) && !commands.includes(command)) commands.push(command); };
  const wantsTestDraw = /\b(?:tirage test|test roue|test roulette)\b/.test(text)
    && /\b(?:tu peux|peux tu|peux-tu|fais|faire|lance|lancer|demarre|demarrer|start|test)\b/.test(text);
  const creativeWriting = /\b(?:ecris|ecrire|redige|rediger|fais|faire|prepare|preparer|genere|generer|cree|creer)\b/.test(text)
    && /\b(?:dialogue|dialogues|replique|repliques|presentation|jingle|finale|scene finale|resultat|roue|tirage|candidat suivant|suivant|idle|temps mort)\b/.test(text)
    && !wantsTestDraw;
  const participantNames = [...new Set([
    ...(Array.isArray(context.queue) ? context.queue : []),
    context.currentCandidate,
    context.nextParticipant
  ].map(cleanKephName).filter(Boolean))];
  const frontQueueMatch = raw.match(/\b(?:mets|met|mettre|place|placer|deplace|déplace)\s+(?:le\s+)?(?:candidat|participant|joueur)?\s*([A-Za-z0-9À-ÿ _-]{2,40})\s+(?:en|a|à)\s+(?:premiere|première|premier|1ere|1er|tete|tête)\b/i);
  if (frontQueueMatch && /\b(?:file|liste|queue|position|ordre|premiere|premiere|tete|tête)\b/.test(text)) {
    const target = findKephBestName(participantNames, cleanKephName(frontQueueMatch[1])) || cleanKephName(frontQueueMatch[1]);
    const rest = participantNames.filter((name) => normalizeKephText(name) !== normalizeKephText(target));
    add(`set_queue ${[target, ...rest].map(quoteCommandArg).join(" ")}`);
  }
  if (creativeWriting
    && /\b(?:presenter|presentation|présenter|présentation)\b/.test(text)
    && /\b(?:candidat|candidats|participant|participants)\b/.test(text)) {
    const count = kephRequestedCount(raw, Math.min(5, Math.max(1, participantNames.length || 5)));
    kephCandidatePresentationDialogueCommands(participantNames, count).forEach(add);
  }
  const clearQueueRequested = /\b(?:supprime|supprimer|vide|vider|efface|effacer|retire|retirer)\b/.test(text)
    && /\b(?:file|liste|queue|attente|candidats|participants)\b/.test(text);
  if (!commands.length && clearQueueRequested) add("clear_queue");
  const explicitQueueMatch = raw.match(/\b(?:charge|charger|remplace|remplacer|mets|mettre)\s+(?:la\s+)?(?:file|liste|queue|liste d'attente|file d'attente)\s*(?:avec|par|:)?\s*(.+)$/i);
  const candidateListMatch = raw.match(/\b(?:candidats?|participants?)\b[^:]*:\s*([^.!?]+)/i);
  const orderQueueRequested = /\b(?:tete de liste|tête de liste|en tete|en tête|premier|deux|deuxieme|deuxième|trois|troisieme|troisième)\b/.test(text)
    && /\b(?:liste|file|queue|ordre|candidats|participants)\b/.test(text);
  const queueNames = creativeWriting ? [] : candidateListMatch ? kephNamesFromListText(candidateListMatch[1]) : explicitQueueMatch ? kephNamesFromListText(explicitQueueMatch[1]) : orderQueueRequested ? kephNamesFromListText(raw) : [];
  if (!commands.length && queueNames.length >= 1 && !creativeWriting) {
    const normalizedQueueNames = [...new Set(queueNames.map((name) => findKephBestName(participantNames, name) || name))];
    const rest = explicitQueueMatch ? [] : participantNames.filter((name) => !normalizedQueueNames.some((item) => normalizeKephText(item) === normalizeKephText(name)));
    add(`set_queue ${[...normalizedQueueNames, ...rest].map(quoteCommandArg).join(" ")}`);
  }
  const allLanceMatch = raw.match(/\b(?:mets|met|mettre|donne|change|modifie|modifier|regle|règle)\s+(?:tous|toutes)\s+(?:les\s+)?(?:candidats|participants|joueurs)\s+(?:a|à|sur|avec)\s*(\d{1,2})\s+(?:relance|relances|lancer|lance|lancers|lances|ticket|tickets|participation|participations)\b/i)
    || raw.match(/\b(?:mets|met|mettre|donne|change|modifie|modifier|regle|règle)\s+(?:a|à|sur|avec)\s*(\d{1,2})\s+(?:relance|relances|lancer|lance|lancers|lances|ticket|tickets|participation|participations)\s+(?:pour\s+)?(?:tous|toutes)\s+(?:les\s+)?(?:candidats|participants|joueurs)\b/i)
    || raw.match(/\b(?:tous|toutes)\s+(?:les\s+)?(?:candidats|participants|joueurs)\s+(?:a|à|sur|avec)\s*(\d{1,2})\s+(?:relance|relances|lancer|lance|lancers|lances|ticket|tickets|participation|participations)\b/i);
  if (allLanceMatch) {
    const amount = Math.max(1, Math.min(20, Number(allLanceMatch[1])));
    [...new Set(participantNames)].forEach((name) => add(`setlance ${quoteCommandArg(name)} ${amount}`));
  }
  const lanceMatch = raw.match(/\b(?:nombre\s+de\s+)?(?:relance|relances|lancer|lance|lancers|lances|ticket|tickets|participation|participations)(?:\s+de\s+la\s+roue)?\s+(?:de|du|d'|pour)?\s*([A-Za-z0-9À-ÿ _-]{2,40}?)\s+(?:a|à|sur|avec)\s*(\d{1,2})\b/i)
    || raw.match(/\b(?:mets|met|mettre|donne|change|modifie|modifier|regle|règle)\s+(?:le\s+)?(?:nombre\s+de\s+)?(?:relance|relances|lancer|lance|lancers|lances|ticket|tickets|participation|participations)(?:\s+de\s+la\s+roue)?\s+(?:de|du|d'|pour)?\s*([A-Za-z0-9À-ÿ _-]{2,40}?)\s+(?:a|à|sur|avec)\s*(\d{1,2})\b/i)
    || raw.match(/\b(?:mets|met|mettre|donne|change|modifie|modifier|regle|règle)\s+(\d{1,2})\s+(?:relance|relances|lancer|lance|lancers|lances|ticket|tickets|participation|participations)\s+(?:a|à|pour|de)?\s*([A-Za-z0-9À-ÿ _-]{2,40})\b/i)
    || raw.match(/\b(?:mets|met|mettre|change|modifie|modifier|regle|règle)\s+([A-Za-z0-9À-ÿ _-]{2,40})\s+(?:a|à|sur|avec)?\s*(\d{1,2})\s+(?:relance|relances|lancer|lance|lancers|lances|ticket|tickets|participation|participations)\b/i)
    || raw.match(/\b(?:relance|relances|lancer|lance|lancers|lances|ticket|tickets|participation|participations)\s+(?:de|pour)\s+([A-Za-z0-9À-ÿ _-]{2,40})\s+(?:a|à|sur|avec)?\s*(\d{1,2})\b/i);
  if (!allLanceMatch && lanceMatch) {
    const firstIsNumber = /^\d+$/.test(lanceMatch[1]);
    const requestedName = cleanKephName(firstIsNumber ? lanceMatch[2] : lanceMatch[1]);
    const amount = Number(firstIsNumber ? lanceMatch[1] : lanceMatch[2]);
    const targetName = findKephBestName(participantNames, requestedName) || requestedName;
    add(`setlance ${quoteCommandArg(targetName)} ${Math.max(1, Math.min(20, amount))}`);
  }
  const addPlayerMatch = raw.match(/\b(?:ajoute|ajouter)\s+(?:le\s+)?(?:candidat|participant|joueur)?\s*([A-Za-z0-9À-ÿ_-][A-Za-z0-9À-ÿ _-]{1,38}?)(?:\s+(?:a|à)\s+la\s+fin(?:\s+de\s+la\s+liste|\s+de\s+la\s+file|\s+de\s+la\s+queue)?|\s+(?:dans|a|à)\s+(?:la\s+)?(?:file|liste|queue)|\s+(?:avec|a|à)\s+(\d{1,2})\s+(?:lancer|lancers|tickets?)|[?.!]|$)/i);
  if (!commands.length && addPlayerMatch && /\b(?:file|liste|participant|candidat|joueur)\b/.test(text)) {
    add(`add_player ${quoteCommandArg(cleanKephName(addPlayerMatch[1]))} ${Math.max(1, Math.min(20, Number(addPlayerMatch[2] || 1)))}`);
  }
  const addSingleLotMatch = raw.match(/\b(?:ajoute|ajouter|cree|creer)\s+(?:un\s+|une\s+)?(?:lot|case)\s+(.+?)\s+(?:poids|poid|chance|proba)\s+(\d{1,4})(?:\s+(?:stock|stocks)\s+(\d{1,4}))?/i);
  if (addSingleLotMatch) {
    const lotName = cleanKephName(addSingleLotMatch[1]);
    const weight = Math.max(0, Math.min(9999, Number(addSingleLotMatch[2]) || 1));
    const stock = addSingleLotMatch[3] != null ? Math.max(0, Math.min(9999, Number(addSingleLotMatch[3]) || 0)) : null;
    if (lotName) add(`add_lot ${quoteCommandArg(lotName)} ${weight}${stock != null ? ` ${stock}` : ""}`);
  }
  if (!commands.length && !creativeWriting && /\b(?:file|liste|queue|candidats|participants)\b/.test(text) && /\b(?:cree|creer|charge|charger|genere|generer|profil demo|3 candidats|trois candidats)\b/.test(text)) {
    const names = candidateListMatch ? kephNamesFromListText(candidateListMatch[1]) : kephNamesFromListText(raw.split(/:|avec|pour/i).pop() || raw);
    const picked = names.length >= 2 ? names : ["Mira", "Grobid", "Tofu-Royal"];
    add(`set_queue ${picked.slice(0, 6).map(quoteCommandArg).join(" ")}`);
  }
  const wantsFullWheel = /\b(?:roue|roulette)\s+(?:complete|entiere|entière|de\s+(?:6|six|10|dix)\s+lots|avec\s+(?:6|six|10|dix)\s+lots)\b/.test(text)
    || /\b(?:cree|creer|genere|generer|prepare|preparer|fais|faire)\b/.test(text) && /\b(?:roue|roulette)\b/.test(text) && /\b(?:complete|entiere|entière|6 lots|six lots|10 lots|dix lots)\b/.test(text);
  if (!commands.length && wantsFullWheel) {
    const tenLots = /\b(?:10|dix)\b/.test(text);
    const lots = tenLots ? [
      ["Couronne Surprise", 18, 3, "#c1121f"],
      ["Bourse Astrale", 16, 3, "#023e8a"],
      ["Relance Éclair", 14, 2, "#ffd60a"],
      ["Coffre Mimique", 12, 2, "#2dc653"],
      ["Potion Panique", 10, 4, "#6f2dbd"],
      ["Contrat Destin", 9, 2, "#f77f00"],
      ["Ticket Frisson", 8, 2, "#00b4d8"],
      ["Éloge Charlie", 7, 5, "#7f0000"],
      ["Bénédiction", 5, 1, "#ff70a6"],
      ["Jackpot Néon", 3, 1, "#80ffdb"]
    ] : [
      ["Ticket VIP du Chaos", 26, 4, "#c1121f"],
      ["Bourse qui clignote 200.000k", 18, 3, "#023e8a"],
      ["Relance du Destin", 16, 2, "#ffd60a"],
      ["Cadeau mystère suspect", 14, 2, "#2dc653"],
      ["Malus: compliment a Charlie", 12, 5, "#6f2dbd"],
      ["Jackpot des Kamavores", 6, 1, "#f77f00"]
    ];
    add("clear_lots");
    lots.forEach(([name, weight, stock, color]) => {
      add(`add_lot ${quoteCommandArg(name)} ${weight} ${stock}`);
      add(`set_lot_color ${quoteCommandArg(name)} ${quoteCommandArg(color)}`);
    });
  }
  if (/\b(?:regle|regler|configure|configurer)\b/.test(text) && /\b(?:spectacle|show|profil|dynamique|anti repetition|humeur|dialogues|live fluide)\b/.test(text)) {
    add('set_setting "antiRepeatEnabled" "true"');
    add('set_setting "antiRepeatMode" "session"');
    add('set_setting "defaultDialoguesEnabled" "false"');
    add('set_setting "showFrequency" "normal"');
    add('set_setting "dialogueMode" "timed"');
    add('set_setting "dialogueDuration" "7"');
    add('set_setting "charlieMood" "taquin"');
    add('set_setting "launchTrollChance" "12"');
  }
  const lotNames = Array.isArray(context.lots) ? context.lots.map((lot) => String(lot.name || "")).filter(Boolean) : [];
  const findMentionedLot = (hint = "") => {
    const exact = lotNames.find((name) => text.includes(normalizeKephText(name)));
    if (exact) return exact;
    const fromHint = findKephBestName(lotNames, hint);
    if (fromHint) return fromHint;
    const rawTokens = normalizeKephText(raw).split(/\s+/).filter((token) => token.length > 2);
    let best = "";
    let bestScore = 0;
    for (const name of lotNames) {
      const nameTokens = normalizeKephText(name).split(/\s+/).filter((token) => token.length > 2);
      const score = nameTokens.filter((token) => rawTokens.includes(token)).length;
      if (score > bestScore) {
        best = name;
        bestScore = score;
      }
    }
    return bestScore >= 2 ? best : "";
  };
  const directRenameMatch = raw.match(/\b(?:renomme|renommer|renome|renomer|appelle|nomme)\s+(?:le\s+)?(?:lot\s+)?(.+?)\s+(?:en|vers)\s+(.+?)(?:[?.!]|$)/i);
  if (directRenameMatch) {
    const targetName = findMentionedLot(cleanKephName(directRenameMatch[1])) || cleanKephName(directRenameMatch[1]);
    add(`rename_lot ${quoteCommandArg(targetName)} ${quoteCommandArg(cleanKephName(directRenameMatch[2]))}`);
  }
  const requestedLotHint = raw.match(/\b(?:renomme|renommer|renome|renomer|appelle|nomme)\s+(?:le\s+)?(?:lot\s+)?(.+?)\s+\b(?:en|vers)\b/i)?.[1]
    || raw.match(/\b(?:stock|poids|poid|probabilite|proba|chance)\s+(?:du|de la|de l'|de|pour le|pour la|pour)\s+(.+?)(?:\s+(?:a|à|sur|en)\s+\d|\s*$)/i)?.[1]
    || raw.match(/\b(?:active|activer|desactive|desactiver|coupe|retire)\s+(?:le\s+)?(?:lot\s+)?(.+?)\s*$/i)?.[1]
    || "";
  const mentionedLot = findMentionedLot(requestedLotHint) || findKephBestName(lotNames, raw);
  const numberMatch = raw.match(/\b(\d{1,4})\b/);
  const effectAliases = [
    ["confetti", /\bconfettis?\b/],
    ["fireworks", /\b(?:feu artifice|feu d artifice|artifice)\b/],
    ["flash", /\bflash\b/],
    ["blackout", /\b(?:blackout|coupure|coupure lumiere)\b/],
    ["spotlights", /\b(?:projecteurs?|spotlights?)\b/],
    ["spotlight", /\bspotlight\b/],
    ["shake", /\bshake\b/],
    ["glitch", /\bglitch\b/],
    ["stars", /\b(?:etoiles?|stars?)\b/],
    ["smoke", /\b(?:fumee|smoke)\b/],
    ["goldwave", /\b(?:vague doree|goldwave)\b/],
    ["alert", /\b(?:alerte|rouge)\b/]
  ];
  const fx = effectAliases.find(([, regex]) => regex.test(text))?.[0];
  if (/\btesteffect\b/.test(text) || (/\b(?:test|teste|tester|joue|jouer|montre|lance|lancer)\b/.test(text) && /\b(?:effet|effets|fx|confetti|flash|etoile|star|fumee|glitch|projecteur|spotlight|shake|alerte)\b/.test(text))) {
    add(`testeffect ${quoteCommandArg(fx || "stars")}`);
  }
  const emoteMatch = raw.match(/\b(?:emote|émote)\s+([A-Za-z0-9À-ÿ _-]{2,30})/i) || raw.match(/\b(?:rire|sourire|coeur|surpris|choque|triste|question)\b/i);
  if (/\btestemote\b/.test(text) || (/\b(?:test|teste|tester|montre|affiche|joue|jouer)\b/.test(text) && /\b(?:emote|rire|sourire|coeur|surpris|choque|triste|question)\b/.test(text))) {
    add(`testemote ${quoteCommandArg(cleanKephName(emoteMatch?.[1] || emoteMatch?.[0] || "rire"))}`);
  }
  if (!creativeWriting && /\bstartjingle\b/.test(text)) add("startjingle");
  if (!creativeWriting && /\bstartpresentation\b/.test(text)) add("startpresentation");
  if (!creativeWriting && /\bstartnext\b/.test(text)) add("startnext");
  if (!creativeWriting && /\bstartfinale\b/.test(text)) add("startfinale");
  if (!creativeWriting && /\bstarttestdraw\b/.test(text)) add("starttestdraw");
  if (!creativeWriting && /\bstartrehearsal\b/.test(text)) add("startrehearsal");
  if (!creativeWriting && /\bstartdraw\b/.test(text)) add("startdraw");
  if (!creativeWriting && /\bstopdraw\b/.test(text)) add("stopdraw");
  if (!creativeWriting && /\b(?:lance|lancer|joue|jouer|demarre|demarrer|start)\b/.test(text) && /\bjingle\b/.test(text)) add("startjingle");
  if (!creativeWriting && /\b(?:lance|lancer|joue|jouer|demarre|demarrer|start)\b/.test(text) && /\b(?:presentation|presenter les candidats|presente les candidats|la totale)\b/.test(text)) add("startpresentation");
  if (!creativeWriting && /\b(?:lance|lancer|joue|jouer|demarre|demarrer|annonce|annoncer|start)\b/.test(text) && /\b(?:candidat suivant|suivant|prochain candidat|la totale)\b/.test(text)) add("startnext");
  if (!creativeWriting && /\b(?:lance|lancer|joue|jouer|demarre|demarrer|start)\b/.test(text) && /\bfinale\b/.test(text)) add("startfinale");
  if (wantsTestDraw || (!creativeWriting && /\b(?:lance|lancer|joue|jouer|demarre|demarrer|start|test)\b/.test(text) && /\b(?:tirage test|test roue|test roulette)\b/.test(text))) add("starttestdraw");
  if (!creativeWriting && /\b(?:lance|lancer|joue|jouer|demarre|demarrer|start)\b/.test(text) && /\b(?:simulation|repetition|passage complet|la totale)\b/.test(text)) add("startrehearsal");
  if (!creativeWriting && /\b(?:lance|lancer|demarre|demarrer|start)\b/.test(text) && /\b(?:vrai tirage|tirage reel|la roue)\b/.test(text) && !/\btest\b/.test(text)) add("startdraw");
  if (!creativeWriting && /\b(?:stop|arrete|arreter|arret)\b/.test(text) && /\b(?:roue|tirage)\b/.test(text)) add("stopdraw");
  if (!creativeWriting && /\b(?:passe|passer|charge|charger)\b/.test(text) && /\b(?:participant suivant|candidat suivant|suivant)\b/.test(text)) add("nextparticipant");
  if (/\b(?:discord|obs|scene propre|mode capture)\b/.test(text) && /\b(?:active|activer|mets|mode|passe|passer)\b/.test(text)) add("discordmode");
  if (/\b(?:detache|detacher|separe|separer)\b/.test(text) && /\b(?:regie|controle|panneau)\b/.test(text)) add("detach_control");
  if (/\b(?:plein ecran|pleine ecran|fullscreen)\b/.test(text) && /\b(?:active|activer|mets|passe|passer|ouvre|ouvrir)\b/.test(text) && !/\b(?:configuration|reglages|reglage|config)\b/.test(text)) add("fullscreen");
  if (/\b(?:configuration|reglages|reglage)\b/.test(text) && /\b(?:plein ecran|pleine ecran|grand|grande)\b/.test(text) && /\b(?:ouvre|ouvrir|active|activer|mets|passe|passer)\b/.test(text)) add("config_fullscreen");
  if (/\b(?:detache|detacher|separe|separer|ouvre)\b/.test(text) && /\b(?:regie|panneau de controle|controle)\b/.test(text)) add("detach_control");
  if (/\b(?:ouvre|ouvrir)\b/.test(text) && /\b(?:preparer|avant live)\b/.test(text)) add('open "preparer"');
  if (/\b(?:ouvre|ouvrir)\b/.test(text) && /\b(?:roulette|roue|lots?)\b/.test(text)) add('open "roulette"');
  if (/\b(?:ouvre|ouvrir)\b/.test(text) && /\b(?:scenario|scenarios|dialogue|dialogues|replique|repliques)\b/.test(text)) add('open "scenarios"');
  if (/\b(?:ouvre|ouvrir)\b/.test(text) && /\b(?:son|sons|audio)\b/.test(text)) add('open "sons"');
  if (/\b(?:ouvre|ouvrir)\b/.test(text) && /\b(?:donnees|historique|sauvegarde)\b/.test(text)) add('open "donnees"');
  if (mentionedLot && numberMatch && /\b(?:stock)\b/.test(text)) add(`setstock ${quoteCommandArg(mentionedLot)} ${Math.max(0, Math.min(9999, Number(numberMatch[1])))}`);
  if (mentionedLot && numberMatch && /\b(?:poids|poid|probabilite|proba|chance)\b/.test(text)) add(`setpoids ${quoteCommandArg(mentionedLot)} ${Math.max(0, Math.min(9999, Number(numberMatch[1])))}`);
  const renameMatch = raw.match(/\b(?:renomme|renommer|renome|renomer|appelle|nomme)\b.*?\b(?:en|vers)\s+(.+?)(?:[?.!]|$)/i);
  if (mentionedLot && renameMatch) add(`rename_lot ${quoteCommandArg(mentionedLot)} ${quoteCommandArg(cleanKephName(renameMatch[1]))}`);
  if (mentionedLot && /\b(?:desactive|desactiver|coupe|retire)\b/.test(text)) add(`disable_lot ${quoteCommandArg(mentionedLot)}`);
  if (mentionedLot && /\b(?:active|activer|reactive|reactiver)\b/.test(text)) add(`enable_lot ${quoteCommandArg(mentionedLot)}`);
  if (!commands.length && creativeWriting) {
    const trigger = /\b(?:idle|temps mort|attend trop)\b/.test(text) ? "idle" : /\bjingle\b/.test(text) ? "jingle" : /\bfinale\b/.test(text) ? "finale" : /\bresultat\b/.test(text) ? "result" : /\b(?:roue|tirage)\b/.test(text) ? "spin" : /\b(?:suivant|candidat suivant)\b/.test(text) ? "next" : "presentation";
    const names = candidateListMatch ? kephNamesFromListText(candidateListMatch[1]) : [];
    const candidates = names.length ? names : (Array.isArray(context.queue) ? context.queue.slice(0, 4) : []);
    kephScenarioDialogueCommands(trigger, candidates).forEach(add);
  }
  if (!commands.length) return null;
  if (/\b(?:la totale|passage complet|tout l evenement|toute l animation)\b/.test(text)) {
    add("startpresentation");
    add("startjingle");
    add("startnext");
    add("startrehearsal");
  }
  return {
    answer: `Je peux preparer ${commands.length} commande${commands.length > 1 ? "s" : ""} controlee${commands.length > 1 ? "s" : ""}. Verifie l'aperçu, puis applique seulement si tout est bon.`,
    commands
  };
}

async function askRemoteKephCommandPlan(message, context = {}, timeoutMs = 7000) {
  const config = kephRemoteConfig();
  if (!config) return null;
  if (!isKephEditRequest(message)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const payload = {
    demande: String(message || "").slice(0, 800),
    contexte: {
      participant_actuel: context.currentCandidate || "",
      file: Array.isArray(context.queue) ? context.queue.slice(0, 20) : [],
      lots: Array.isArray(context.lots) ? context.lots.slice(0, 20) : [],
      dialogues: Array.isArray(context.dialogues) ? context.dialogues.slice(0, 30) : []
    },
    commandes_autorisees: KEPH_EDIT_COMMANDS
  };
  const prompt = [
    "Tu traduis une demande de l'organisateur Charlie Roulette en commandes internes strictes.",
    "Tu ne dois jamais inventer une commande hors catalogue.",
    "Si la demande est creative, genere plusieurs commandes add_dialogue pertinentes. Utilise aussi --kind \"me\" pour des indications sceniques.",
    "Etapes valides add_dialogue: presentation, jingle, idle, spin, result, next, finale.",
    "Personnages valides: charlie, victoria.",
    "Effets valides: confetti, fireworks, flash, blackout, spotlights, spotlight, shake, glitch, stars, smoke, goldwave, alert.",
    "Pour creer une roue complete, commence par clear_lots puis ajoute les lots avec add_lot, setpoids et set_lot_color.",
    "Reglages autorises set_setting: antiRepeatEnabled, antiRepeatMode, defaultDialoguesEnabled, showFrequency, dialogueMode, dialogueDuration, charlieMood, launchTrollChance.",
    "Pour tester un effet, utilise testeffect. Pour tester une emote, utilise testemote.",
    "Pour gerer la file, utilise add_player, clear_queue ou set_queue.",
    "Pour piloter le spectacle, utilise startjingle, startpresentation, startnext, startfinale, starttestdraw, startrehearsal, startdraw, stopdraw, nextparticipant, discordmode, fullscreen, config_fullscreen, detach_control.",
    "Reponds uniquement en JSON: {\"answer\":\"resume court\",\"commands\":[\"commande 1\",\"commande 2\"]}.",
    JSON.stringify(payload)
  ].join("\n");
  try {
    const body = config.provider === "gemini"
      ? { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.55, maxOutputTokens: 900, responseMimeType: "application/json" } }
      : { model: config.model, temperature: 0.45, max_tokens: 900, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] };
    const url = config.provider === "gemini"
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.key)}`
      : config.url;
    const headers = config.provider === "gemini"
      ? { "content-type": "application/json" }
      : { "content-type": "application/json", authorization: `Bearer ${config.key}` };
    const response = await fetch(url, { method: "POST", headers, signal: controller.signal, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Command API HTTP ${response.status}`);
    const json = await response.json();
    const content = config.provider === "gemini"
      ? json?.candidates?.[0]?.content?.parts?.[0]?.text
      : json?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || "{}");
    const commands = (Array.isArray(parsed.commands) ? parsed.commands : [])
      .map((command) => String(command || "").trim())
      .filter((command) => command.length <= 900 && kephCommandAllowed(command))
      .slice(0, 40);
    if (!commands.length) return null;
    return { answer: String(parsed.answer || "Je peux preparer ces commandes controlees.").slice(0, 500), commands };
  } catch (error) {
    console.warn("[keph] Plan commandes distant indisponible.", error.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function kephCommandPlan(message, context = {}) {
  if (!isKephEditRequest(message)) return null;
  const local = kephCommandPlanFromRules(message, context);
  if (local) return local;
  return askRemoteKephCommandPlan(message, context);
}

async function askOllamaKeph(message, context, guidance = null, timeoutMs = 35000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const prompt = kephRemotePrompt();
    const requestPayload = kephRemotePayload(message, context, guidance);
    const response = await fetch(`${OLLAMA_URL.replace(/\/+$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: KEPH_MODEL,
        stream: false,
        format: "json",
        keep_alive: "30m",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: JSON.stringify({
            ...requestPayload,
            retours_negatifs_recents: recentKephLearningExamples(message),
            bonnes_reponses_likees: recentKephPositiveExamples(message)
          }) }
        ],
        options: { temperature: 0.25, num_ctx: 2048, num_predict: 140 }
      })
    });
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const responsePayload = await response.json();
    const content = responsePayload?.message?.content || responsePayload?.response || "";
    const parsed = safeParseKephAiJson(content);
    if (!parsed) throw new Error("Ollama JSON invalide");
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

async function ollamaKephStatus() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${OLLAMA_URL.replace(/\/+$/, "")}/api/tags`, { signal: controller.signal });
    if (!response.ok) return false;
    const payload = await response.json();
    return Array.isArray(payload?.models) && payload.models.some((model) => model.name === KEPH_MODEL);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
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
  res.json({ ok: true, service: "pykur-tracker", version: "1.6.0" });
});

app.get("/api/charlie-keph/avatar", (req, res) => {
  res.json({ avatarUrl: kephPublicAvatar() });
});

app.get("/api/charlie-keph/status", asyncRoute(async (req, res) => {
  const ollamaReady = await ollamaKephStatus();
  const remote = kephRemoteConfig();
  res.json({
    ok: !!remote || ollamaReady,
    api: true,
    remote: remote ? { provider: remote.provider, model: remote.model, configured: true } : null,
    ollama: ollamaReady,
    model: KEPH_MODEL,
    mode: remote ? remote.provider : ollamaReady ? "ollama" : "guide",
    avatarUrl: kephPublicAvatar()
  });
}));

async function resolveKephReply(message, context = {}) {
  const commandPlan = await kephCommandPlan(message, context);
  if (commandPlan?.commands?.length) {
    const commands = commandPlan.commands.slice(0, 40);
    return {
      answer: `${commandPlan.answer}\n\n${commands.map((command) => `/${command}`).join("\n")}`,
      actions: [
        {
          id: "apply_keph_command_batch",
          type: "command_batch",
          label: `Prévisualiser ${commands.length} commande${commands.length > 1 ? "s" : ""}`,
          payload: { commands, question: message }
        }
      ],
      source: "command",
      intent: "command_batch",
      grounded: true,
      avatarUrl: kephPublicAvatar()
    };
  }
  const knowledge = charlieKephKnowledge();
  const command = parseKephCommand(message, context);
  const commandNeedsConfirmation = command?.source === "command" && Array.isArray(command.actions) && command.actions.some((action) => action?.type);
  if (commandNeedsConfirmation) return { ...command, avatarUrl: kephPublicAvatar() };
  const guide = command
    ? { ...command, matched: true, expectedAnswer: command.answer || "", docs: kephDocumentationSearch(message, context) }
    : fallbackKephAnswer(message, context);
  const siteQuestion = isKephSiteQuestion(message);
  const verifiedDocs = kephVerifiedDocs(message, context);
  if (guide.intent === "unverified_site_question") {
    return { ...guide, source: "verified", grounded: false, avatarUrl: kephPublicAvatar() };
  }
  if (!siteQuestion && guide.matched && ["command", "conversation"].includes(guide.source)) {
    return { ...guide, source: "guide", grounded: false, avatarUrl: kephPublicAvatar() };
  }
  if (siteQuestion && !command && guide.intent === "retrieval" && !verifiedDocs.length) {
    return {
      answer: "Je ne vois pas cette fonction dans la documentation du site. Donne-moi le nom exact du bouton, du menu ou de l'option, et je te dirai si elle existe dans Charlie Roulette.",
      actions: normalizedKephActions(["open_prepare"], knowledge),
      source: "verified",
      intent: "unverified_site_question",
      grounded: false,
      avatarUrl: kephPublicAvatar()
    };
  }
  try {
    const remote = await askRemoteKeph(message, context, guide.matched ? guide : null, KEPH_REMOTE_TIMEOUT_MS);
    if (remote) {
      const answer = String(remote?.answer || "").trim();
      if (!answer) throw new Error("Reponse distante vide");
      const actions = guide.matched ? guide.actions : isKephSiteQuestion(message) ? normalizedKephActions(remote?.actions, knowledge) : [];
      return {
        answer: answer.slice(0, 1400),
        actions: actions.length ? actions : (guide.matched ? guide.actions : []),
        source: remote.provider || "remote",
        intent: guide.intent || String(remote?.intent || "").slice(0, 80) || null,
        grounded: !!guide.matched,
        model: remote.model || null,
        avatarUrl: kephPublicAvatar()
      };
    }
  } catch (error) {
    console.warn("[keph] API distante indisponible.", error.message);
  }
  try {
    const ai = await askOllamaKeph(message, context, guide.matched ? guide : null, KEPH_AI_TIMEOUT_MS);
    const answer = String(ai?.answer || "").trim();
    if (!answer) throw new Error("Reponse vide");
    const actions = guide.matched ? guide.actions : normalizedKephActions(ai?.actions, knowledge);
    return {
      answer: answer.slice(0, 1400),
      actions: actions.length ? actions : (guide.matched ? guide.actions : []),
      source: "ollama",
      intent: guide.intent || String(ai?.intent || "").slice(0, 80) || null,
      grounded: !!guide.matched,
      model: KEPH_MODEL,
      avatarUrl: kephPublicAvatar()
    };
  } catch (error) {
    console.warn("[keph] Ollama indisponible.", error.message);
    return { ...guide, source: guide.matched ? "guide" : "fallback", avatarUrl: kephPublicAvatar(), warning: "ollama_unavailable" };
  }
}

function kephStreamChunks(text) {
  const value = String(text || "");
  const chunks = [];
  let buffer = "";
  for (const part of value.split(/(\s+)/)) {
    buffer += part;
    if (buffer.length >= 18 || /[.!?]\s*$/.test(buffer)) {
      chunks.push(buffer);
      buffer = "";
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.length ? chunks : [value];
}

function writeKephSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

app.post("/api/charlie-keph/ask", kephLimiter, asyncRoute(async (req, res) => {
  const message = String(req.body?.message || "").trim().slice(0, 800);
  const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  if (!message) return res.status(400).json({ error: "Question vide.", code: "KEPH_EMPTY_MESSAGE" });
  res.json(await resolveKephReply(message, context));
}));

app.post("/api/charlie-keph/ask-stream", kephLimiter, asyncRoute(async (req, res) => {
  const message = String(req.body?.message || "").trim().slice(0, 800);
  const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  if (!message) return res.status(400).json({ error: "Question vide.", code: "KEPH_EMPTY_MESSAGE" });
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const payload = await resolveKephReply(message, context);
  const answer = String(payload.answer || "Je ne suis pas sur, mais je peux ouvrir la configuration pour verifier.");
  writeKephSse(res, "meta", { ...payload, answer: "" });
  for (const chunk of kephStreamChunks(answer)) {
    writeKephSse(res, "chunk", { text: chunk });
    await new Promise((resolve) => setTimeout(resolve, 28));
  }
  writeKephSse(res, "done", payload);
  res.end();
}));

app.post("/api/charlie-keph/feedback", kephLimiter, asyncRoute(async (req, res) => {
  const vote = String(req.body?.vote || "").trim();
  if (!["like", "dislike"].includes(vote)) return res.status(400).json({ error: "Vote invalide.", code: "KEPH_BAD_VOTE" });
  const reason = String(req.body?.reason || "").trim().slice(0, 800);
  if (vote === "dislike" && reason.length < 2) return res.status(400).json({ error: "Raison requise.", code: "KEPH_REASON_REQUIRED" });
  const messageId = String(req.body?.messageId || "").trim().slice(0, 80);
  const question = String(req.body?.question || "").trim().slice(0, 1000);
  const answer = String(req.body?.answer || "").trim().slice(0, 2000);
  const source = String(req.body?.source || "").trim().slice(0, 40);
  const intent = String(req.body?.intent || "").trim().slice(0, 80);
  const actions = Array.isArray(req.body?.actions) ? req.body.actions.slice(0, 8) : [];
  const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  const feedbackRow = { vote, reason, question, answer, source, intent };
  const category = vote === "dislike" ? classifyKephFeedback(feedbackRow) : null;
  const trainingCase = vote === "dislike" ? kephFeedbackTrainingCase({ ...feedbackRow, category }) : null;
  const docSuggestion = vote === "dislike" ? kephFeedbackDocSuggestion({ ...feedbackRow, category }) : null;
  db.prepare(`
    INSERT INTO keph_feedback(message_id,vote,reason,question,answer,source,intent,actions_json,context_json,category,training_case_json,doc_suggestion_json,ip_address,user_agent)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    messageId || null,
    vote,
    reason || null,
    question || null,
    answer || null,
    source || null,
    intent || null,
    JSON.stringify(actions),
    JSON.stringify(context).slice(0, 4000),
    category,
    trainingCase ? JSON.stringify(trainingCase) : null,
    docSuggestion ? JSON.stringify(docSuggestion) : null,
    req.ip || null,
    String(req.get("user-agent") || "").slice(0, 300)
  );
  res.json({ ok: true, category, trainingCase, docSuggestion });
}));

app.post("/api/charlie-keph/command-rejections", kephLimiter, asyncRoute(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 40) : [];
  const question = String(req.body?.question || "").trim().slice(0, 1000);
  const context = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  const stmt = db.prepare(`
    INSERT INTO keph_command_rejections(command, reason, question, context_json, ip_address, user_agent)
    VALUES(?,?,?,?,?,?)
  `);
  const insertMany = db.transaction((rows) => {
    rows.forEach((item) => {
      const command = String(item?.command || "").trim().slice(0, 1000);
      if (!command) return;
      stmt.run(
        command,
        String(item?.reason || "").trim().slice(0, 500) || null,
        question || null,
        JSON.stringify(context).slice(0, 4000),
        req.ip || null,
        String(req.get("user-agent") || "").slice(0, 300)
      );
    });
  });
  insertMany(items);
  res.json({ ok: true, logged: items.length });
}));

function classifyKephFeedback(row = {}) {
  const text = normalizeKephText(`${row.reason || ""} ${row.question || ""} ${row.answer || ""}`);
  if (/\b(?:rien fait|pas fait|action|modifier|modifie|ajouter|supprimer|changer|appliquer|effectue)\b/.test(text)) return "action manquante";
  if (/\b(?:hors sujet|a cote|cot[eé]|rapport|pas la question|pas repondu|repond pas)\b/.test(text)) return "hors sujet";
  if (/\b(?:faux|incorrect|existe pas|mensonge|hallucine|invente)\b/.test(text)) return "faux";
  if (/\b(?:vague|general|generique|robot|pas cible|trop large)\b/.test(text)) return "trop vague";
  if (/\b(?:mauvais candidat|mauvais lot|mauvaise cible|kinza|candidat actuel)\b/.test(text)) return "mauvaise cible";
  return "a verifier";
}

function kephFeedbackTrainingCase(row = {}) {
  const category = row.category || classifyKephFeedback(row);
  const question = String(row.question || "").trim();
  const reason = String(row.reason || "").trim();
  const answer = String(row.answer || "").trim();
  const expected = [];
  const forbidden = [];
  const actions = [];
  if (category === "hors sujet") forbidden.push("réponse générique", "sujet différent");
  if (category === "trop vague") expected.push("réponse précise", "étapes concrètes");
  if (category === "faux") forbidden.push("fonction inventée", "information non vérifiée");
  if (category === "action manquante") {
    expected.push("proposer une action à confirmer ou expliquer pourquoi impossible");
    actions.push("action_required");
  }
  if (category === "mauvaise cible") forbidden.push("confondre candidat actuel et organisateur");
  return {
    question,
    category,
    reason,
    expected,
    forbidden,
    actions,
    bad_answer_excerpt: answer.slice(0, 260)
  };
}

function kephFeedbackDocSuggestion(row = {}) {
  const category = row.category || classifyKephFeedback(row);
  return {
    category,
    source_question: String(row.question || "").trim(),
    problem: String(row.reason || "").trim(),
    suggested_fix: category === "action manquante"
      ? "Ajouter ou corriger une action Keph pour cette demande."
      : category === "faux"
        ? "Ajouter une fiche doc vérifiée ou empêcher Keph d'inventer cette fonction."
        : "Ajouter une fiche ou un exemple pour mieux cibler cette intention."
  };
}

function parseKephJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

app.get("/api/charlie-keph/feedback/summary", kephLimiter, asyncRoute(async (req, res) => {
  const rows = db.prepare(`
    SELECT id, vote, reason, question, answer, source, intent, category, training_case_json, doc_suggestion_json, task_status, task_note, created_at
    FROM keph_feedback
    WHERE vote = 'dislike'
    ORDER BY id DESC
    LIMIT 40
  `).all();
  const recent = rows.slice(0, 12).map((row) => ({
    id: row.id,
    category: row.category || classifyKephFeedback(row),
    reason: row.reason || "",
    question: row.question || "",
    answer: row.answer || "",
    source: row.source || "",
    intent: row.intent || "",
    trainingCase: parseKephJsonField(row.training_case_json, kephFeedbackTrainingCase(row)),
    docSuggestion: parseKephJsonField(row.doc_suggestion_json, kephFeedbackDocSuggestion(row)),
    status: row.task_status || "open",
    note: row.task_note || "",
    at: row.created_at || ""
  }));
  const counts = recent.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  const training = recent
    .filter((item) => ["hors sujet", "trop vague", "faux", "action manquante", "mauvaise cible"].includes(item.category))
    .slice(0, 8)
    .map((item) => ({
      category: item.category,
      question: item.question,
      reason: item.reason
    }));
  res.json({ ok: true, counts, recent, training, avatarUrl: kephPublicAvatar() });
}));

app.patch("/api/charlie-keph/feedback/:id/task", kephLimiter, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Feedback invalide.", code: "KEPH_BAD_FEEDBACK_ID" });
  const status = String(req.body?.status || "").trim();
  if (!["open", "doc_added", "fixed"].includes(status)) return res.status(400).json({ error: "Statut invalide.", code: "KEPH_BAD_TASK_STATUS" });
  const note = String(req.body?.note || "").trim().slice(0, 600);
  const row = db.prepare("SELECT id FROM keph_feedback WHERE id = ? AND vote = 'dislike'").get(id);
  if (!row) return res.status(404).json({ error: "Feedback introuvable.", code: "KEPH_FEEDBACK_NOT_FOUND" });
  db.prepare("UPDATE keph_feedback SET task_status = ?, task_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, note || null, id);
  res.json({ ok: true, id, status, note });
}));

app.get("/api/events/living", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(publicLivingEventSchedule());
});

app.post("/api/auth/register", registrationLimiter, asyncRoute(async (req, res) => {
  const block = securityLoginBlock(req);
  if (block.blocked) {
    return res.status(403).json({ error: block.type === "ip" ? "Connexion refusee depuis cette adresse IP." : "Connexion refusee depuis ce navigateur.", code: "SECURITY_BLOCKED" });
  }
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
      await sendEmailVerificationEmail(user, verificationLink(token, req.body.client));
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
  updateUserSecurityFootprint(row.user_id, req);
  const user = getUserById(row.user_id);
  announceFirstLogin(user);
  res.json({ token: signUser(user), user: publicUser(user) });
});

app.post("/api/auth/login", loginLimiter, asyncRoute(async (req, res) => {
  const block = securityLoginBlock(req);
  if (block.blocked) {
    return res.status(403).json({ error: block.type === "ip" ? "Connexion refusee depuis cette adresse IP." : "Connexion refusee depuis ce navigateur.", code: "SECURITY_BLOCKED" });
  }
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
  updateUserSecurityFootprint(user.id, req);
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
      await sendPasswordResetEmail(user, resetLink(token, req.body.client));
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
  updateUserSecurityFootprint(row.user_id, req);
  const user = getUserById(row.user_id);
  res.json({ token: signUser(user), user: publicUser(user) });
}));

app.get("/api/auth/me", requireAuth, (req, res) => {
  db.prepare("UPDATE users SET presence_seen_at = CURRENT_TIMESTAMP, deletion_requested_at = NULL WHERE id = ?").run(req.user.id);
  updateUserSecurityFootprint(req.user.id, req);
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

app.put("/api/cloud/v2/save", requireAuth, (req, res) => {
  const incomingPayload = req.body.payload;
  const expectedRevision = req.body.expectedRevision === null || req.body.expectedRevision === undefined
    ? null
    : Number(req.body.expectedRevision);
  if (!incomingPayload || typeof incomingPayload !== "object" || Array.isArray(incomingPayload)) {
    return res.status(400).json({ error: "Sauvegarde cloud V2 invalide." });
  }
  if (expectedRevision !== null && (!Number.isInteger(expectedRevision) || expectedRevision < 0)) {
    return res.status(400).json({ error: "Révision cloud V2 invalide." });
  }

  const nextPayload = Object.assign({}, incomingPayload, { savedAt: new Date().toISOString() });
  const serializedPayload = JSON.stringify(nextPayload);
  if (Buffer.byteLength(serializedPayload, "utf8") > 1_750_000) {
    return res.status(413).json({ error: "Sauvegarde cloud V2 trop volumineuse." });
  }

  const result = db.transaction(() => {
    const current = db.prepare("SELECT payload,revision,updated_at FROM cloud_saves_v2 WHERE user_id = ?").get(req.user.id);
    const currentRevision = Number(current?.revision || 0);
    if (expectedRevision !== null && expectedRevision !== currentRevision) {
      return { conflict: true, current, currentRevision };
    }
    const revision = currentRevision + 1;
    db.prepare(`
      INSERT INTO cloud_saves_v2(user_id,payload,revision,updated_at)
      VALUES(?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        payload = excluded.payload,
        revision = excluded.revision,
        updated_at = CURRENT_TIMESTAMP
    `).run(req.user.id, serializedPayload, revision);
    return { conflict: false, revision };
  })();

  if (result.conflict) {
    return res.status(409).json({
      error: "La sauvegarde cloud a été modifiée depuis un autre appareil.",
      code: "CLOUD_REVISION_CONFLICT",
      payload: result.current ? safeParseJson(result.current.payload, null) : null,
      revision: result.currentRevision,
      updatedAt: result.current?.updated_at || null
    });
  }
  res.json({ ok: true, payload: nextPayload, revision: result.revision });
});

app.get("/api/cloud/v2/save", requireAuth, (req, res) => {
  const row = db.prepare("SELECT payload,revision,updated_at FROM cloud_saves_v2 WHERE user_id = ?").get(req.user.id);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    payload: row ? safeParseJson(row.payload, null) : null,
    revision: Number(row?.revision || 0),
    updatedAt: row?.updated_at || null
  });
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
  const profiles = Object.entries(payload?.store?.profiles || {}).map(([id, profile]) => cloudProfileAdminSummary(id, profile, payload?.store?.active));
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
      const familiarId = String(item?.familiarId || "pykur");
      const familiar = publicFamiliarMeta(familiarId);
      const familiarLabel = String(item?.familiarLabel || familiar.label || "Pykur");
      const progressLabel = String(item?.progressLabel || familiar.progressShort || "PP");
      if (item?.id) galleryPykurs.set(String(item.id), {
        id: String(item.id),
        number: Number(item.number) || 0,
        familiarId,
        familiarLabel,
        profileName: String(item.profileName || "Profil"),
        pp: Number(item.pp) || 0,
        progressLabel,
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
  if (type === "remove-gallery-pykur" && !String(payload.pykurId || "")) return res.status(400).json({ error: "Familier archive cible requis." });
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

app.get("/api/moderation/security-bans", requireAuth, requireRole("moderator"), requirePermission("users.security_bans.view"), (req, res) => {
  const ips = db.prepare(`
    SELECT b.*, actor.pseudo AS actor_pseudo, target.pseudo AS target_pseudo
    FROM blocked_ip_addresses b
    LEFT JOIN users actor ON actor.id = b.actor_user_id
    LEFT JOIN users target ON target.id = b.target_user_id
    ORDER BY b.created_at DESC
    LIMIT 200
  `).all().map((row) => ({
    id: row.id,
    ipAddress: row.ip_address,
    reason: row.reason || "",
    createdAt: row.created_at,
    actorPseudo: row.actor_pseudo || "Equipe",
    targetPseudo: row.target_pseudo || ""
  }));
  const browsers = db.prepare(`
    SELECT b.*, actor.pseudo AS actor_pseudo, target.pseudo AS target_pseudo
    FROM blocked_browsers b
    LEFT JOIN users actor ON actor.id = b.actor_user_id
    LEFT JOIN users target ON target.id = b.target_user_id
    ORDER BY b.created_at DESC
    LIMIT 200
  `).all().map((row) => ({
    id: row.id,
    browserId: row.browser_id,
    reason: row.reason || "",
    createdAt: row.created_at,
    actorPseudo: row.actor_pseudo || "Equipe",
    targetPseudo: row.target_pseudo || ""
  }));
  res.json({ ips, browsers });
});

app.post("/api/moderation/users/:id/ip-ban", requireAuth, requireRole("moderator"), requirePermission("users.ip.ban"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Vous ne pouvez pas modérer ce rôle." });
  const ip = normalizeIpAddress(req.body.ipAddress || target.last_ip_address);
  if (!ip) return res.status(400).json({ error: "Aucune IP connue pour ce membre." });
  const reason = String(req.body.reason || "").trim().slice(0, 300);
  db.prepare(`
    INSERT INTO blocked_ip_addresses(ip_address, reason, actor_user_id, target_user_id)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(ip_address) DO UPDATE SET
      reason = excluded.reason,
      actor_user_id = excluded.actor_user_id,
      target_user_id = excluded.target_user_id,
      created_at = CURRENT_TIMESTAMP
  `).run(ip, reason || null, req.user.id, target.id);
  auditLog({ actorId: req.user.id, targetId: target.id, action: "security.ip.ban", entityType: "ip", entityId: ip, details: { reason }, req });
  res.json({ ok: true, ipAddress: ip });
});

app.post("/api/moderation/users/:id/browser-ban", requireAuth, requireRole("moderator"), requirePermission("users.browser.ban"), (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (!canModerateTarget(req.user, target)) return res.status(403).json({ error: "Vous ne pouvez pas modérer ce rôle." });
  const browserId = normalizeBrowserId(req.body.browserId || target.last_browser_id);
  if (!browserId) return res.status(400).json({ error: "Aucun navigateur connu pour ce membre." });
  const reason = String(req.body.reason || "").trim().slice(0, 300);
  db.prepare(`
    INSERT INTO blocked_browsers(browser_id, reason, actor_user_id, target_user_id)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(browser_id) DO UPDATE SET
      reason = excluded.reason,
      actor_user_id = excluded.actor_user_id,
      target_user_id = excluded.target_user_id,
      created_at = CURRENT_TIMESTAMP
  `).run(browserId, reason || null, req.user.id, target.id);
  auditLog({ actorId: req.user.id, targetId: target.id, action: "security.browser.ban", entityType: "browser", entityId: browserId, details: { reason }, req });
  res.json({ ok: true, browserId });
});

app.delete("/api/moderation/security-bans/:kind/:id", requireAuth, requireRole("moderator"), requirePermission("users.security_bans.view"), (req, res) => {
  const kind = String(req.params.kind || "");
  const id = Number(req.params.id);
  if (!id || !["ip", "browser"].includes(kind)) return res.status(400).json({ error: "Ban technique invalide." });
  if (kind === "ip") {
    const row = db.prepare("SELECT * FROM blocked_ip_addresses WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "IP bannie introuvable." });
    db.prepare("DELETE FROM blocked_ip_addresses WHERE id = ?").run(id);
    auditLog({ actorId: req.user.id, action: "security.ip.unban", entityType: "ip", entityId: row.ip_address, details: {}, req });
  } else {
    const row = db.prepare("SELECT * FROM blocked_browsers WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "Navigateur banni introuvable." });
    db.prepare("DELETE FROM blocked_browsers WHERE id = ?").run(id);
    auditLog({ actorId: req.user.id, action: "security.browser.unban", entityType: "browser", entityId: row.browser_id, details: {}, req });
  }
  res.json({ ok: true });
});

app.post("/api/admin/users/:id/role", requireAuth, requireRole("admin"), requirePermission("roles.manage"), (req, res) => {
  const target = getUserById(req.params.id);
  const role = String(req.body.role || "");
  const reason = requiredModerationReason(req.body.reason) || "Changement de role depuis le centre de controle.";
  if (!target) return res.status(404).json({ error: "Utilisateur introuvable." });
  if (Number(target.id) === Number(req.user.id)) return res.status(400).json({ error: "Vous ne pouvez pas modifier votre propre role." });
  if (!["user", "moderator", "admin"].includes(role)) return res.status(400).json({ error: "Role invalide." });
  if (target.role === role) return res.json({ user: publicUser(target) });
  if (target.role === "admin" && role !== "admin") {
    const adminCount = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count || 0;
    if (adminCount <= 1) return res.status(400).json({ error: "Impossible de retirer le dernier admin." });
  }
  db.prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(role, target.id);
  if (role !== "moderator") db.prepare("DELETE FROM staff_permission_overrides WHERE user_id = ?").run(target.id);
  moderationLog({ targetId: target.id, actorId: req.user.id, type: ROLE_ORDER[role] > ROLE_ORDER[target.role] ? "promote" : "demote", reason, req });
  auditLog({ actorId: req.user.id, targetId: target.id, action: "user.role.update", entityType: "user", entityId: target.id, details: { from: target.role, to: role, reason }, req });
  res.json({ user: publicUser(getUserById(target.id)) });
});

app.post("/api/admin/users/:id/role-legacy", requireAuth, requireRole("admin"), requirePermission("roles.manage"), (req, res) => {
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
