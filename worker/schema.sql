-- MOKU D1 Database Schema for Cloud Sync
-- Run with: npx wrangler d1 execute DB --file=./worker/schema.sql

CREATE TABLE IF NOT EXISTS plans (
  user_id TEXT NOT NULL,
  month_key TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, month_key)
);

CREATE TABLE IF NOT EXISTS expenses (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  month_key TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS savings_entries (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  month_key TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_user ON savings_entries(user_id);
