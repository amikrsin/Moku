# Cloudflare Deployment Guide for MOKU

MOKU is configured as a full-stack **Cloudflare Workers + D1 Database + Static Assets** application with PWA offline support.

---

## 🏗️ Architecture

- **Frontend**: React 19 + Tailwind CSS + Vite PWA (Service Worker precaching and offline support).
- **Backend**: Cloudflare Worker (`worker/index.ts`) handling `/api/health`, `/api/state`, and `/api/sync`.
- **Database**: Cloudflare D1 SQL database (`moku_db`) storing encrypted user plans, expenses, and savings logs.
- **Authentication**: Strict Firebase ID token verification with live Google public key validation.

---

## 🚀 Setup & Deployment Steps

### Option A: Create via Cloudflare Web Dashboard (No CLI Required)

You **can** create and set up `moku_db` directly in your browser without running any command-line tools:

1. Log into your **[Cloudflare Dashboard](https://dash.cloudflare.com/)**.
2. In the left-hand sidebar, navigate to **Storage & Databases** > **D1 SQL Database**.
3. Click the blue **Create database** button.
4. Enter the database name: `moku_db` (or any name you prefer) and click **Create**.
5. Once created, Cloudflare displays your database overview. Copy the **Database ID** (a UUID string like `3f412345-6789-abcd-ef01-23456789abcd`).
6. Click the **Console** tab inside your `moku_db` page on the dashboard.
7. Paste the following SQL statements into the console and click **Execute**:

```sql
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
```

8. In your project's `wrangler.toml` (or your GitHub repo before deployment), update:
```toml
[[d1_databases]]
binding = "DB"
database_name = "moku_db"
database_id = "<PASTE_YOUR_DATABASE_ID_FROM_DASHBOARD_HERE>"
```

---

### Option B: Create via Wrangler CLI

If you prefer using the terminal:

```bash
# 1. Create the D1 database
npx wrangler d1 create moku_db
```

Copy the output `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "moku_db"
database_id = "YOUR_ACTUAL_D1_DATABASE_ID_HERE"
```

```bash
# 2. Run Database Schema Migrations
npx wrangler d1 execute moku_db --remote --file=./worker/schema.sql
```

### 3. Set Environment Variables in Cloudflare

In Cloudflare Dashboard (**Workers & Pages** > **moku** > **Settings** > **Variables & Secrets**), set:

- `FIREBASE_PROJECT_ID`: Your Firebase project ID (e.g. `kakeibo-ledger`)

And in your build settings, configure the client environment variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

---

## ⚙️ Cloudflare Build Configuration

| Setting | Value |
| :--- | :--- |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Deploy command** | `npx wrangler deploy` |
| **Root directory** | `/` |

> **Note on Bun vs. NPM in Cloudflare Pages:**
> The project includes a standard `package-lock.json` so Cloudflare Pages builds reliably using `npm ci` (`nodejs@24`).
> If you prefer using Bun in Cloudflare Pages, add the environment variable `BUN_VERSION=1.4.0` in your Cloudflare Pages dashboard under **Settings** > **Environment variables**.

---

## 📱 PWA Verification

- **Service Worker**: Auto-registered via `vite-plugin-pwa` with precached app shell.
- **Offline Mode**: Works 100% offline out-of-the-box using local indexed cache and localStorage.
- **In-App Install**: Install banner prompts users on Android Chrome / Desktop Safari / Edge.
