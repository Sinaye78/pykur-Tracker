CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pseudo TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','moderator','admin')),
  avatar_url TEXT,
  first_login_announcement_at TEXT,
  deletion_requested_at TEXT,
  session_version INTEGER NOT NULL DEFAULT 0,
  password_reset_required INTEGER NOT NULL DEFAULT 0,
  social_restrictions TEXT NOT NULL DEFAULT '{}',
  profile_locked INTEGER NOT NULL DEFAULT 0,
  avatar_locked INTEGER NOT NULL DEFAULT 0,
  staff_note TEXT,
  preferences TEXT NOT NULL DEFAULT '{}',
  email_verified_at TEXT,
  is_banned INTEGER NOT NULL DEFAULT 0,
  ban_until TEXT,
  mute_until TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  presence_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_user_id INTEGER NOT NULL,
  actor_user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('ban','timeban','unban','mute','unmute','promote','demote')),
  reason TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cloud_saves (
  user_id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_moderation_target ON moderation_actions(target_user_id);

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
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);

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

CREATE TRIGGER IF NOT EXISTS moderation_audit_no_update
BEFORE UPDATE ON moderation_audit_log
BEGIN
  SELECT RAISE(ABORT, 'moderation audit log is immutable');
END;

CREATE TRIGGER IF NOT EXISTS moderation_audit_no_delete
BEFORE DELETE ON moderation_audit_log
BEGIN
  SELECT RAISE(ABORT, 'moderation audit log is immutable');
END;

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
INSERT OR IGNORE INTO living_event_settings(id) VALUES(1);
