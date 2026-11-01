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

-- Commercial License Management & Anti-Piracy Tables
CREATE TABLE IF NOT EXISTS licenses (
  license_key TEXT PRIMARY KEY,
  order_id TEXT,
  payment_id TEXT UNIQUE, -- Enforces strict database-level webhook idempotency
  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'INR',
  max_devices INTEGER DEFAULT 2,
  status TEXT DEFAULT 'active', -- 'active', 'revoked', 'refunded'
  source TEXT DEFAULT 'razorpay', -- 'razorpay' (paid commercial) vs 'manual_admin'
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS license_activations (
  id TEXT PRIMARY KEY,
  license_key TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  activated_at INTEGER NOT NULL,
  UNIQUE(license_key, device_id),
  FOREIGN KEY (license_key) REFERENCES licenses(license_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(buyer_email);
CREATE INDEX IF NOT EXISTS idx_licenses_source ON licenses(source);
CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_payment_unique ON licenses(payment_id) WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_order_unique ON licenses(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activations_key ON license_activations(license_key);


