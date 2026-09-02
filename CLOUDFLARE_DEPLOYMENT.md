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

### 1. Create Cloudflare D1 Database

In your terminal or Cloudflare Dashboard:

```bash
# Create the D1 database
npx wrangler d1 create moku_db
```

Copy the output `database_id` and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "moku_db"
database_id = "YOUR_ACTUAL_D1_DATABASE_ID_HERE"
```

### 2. Run Database Schema Migrations

Apply the table schema to your D1 database:

```bash
# Local development
npx wrangler d1 execute moku_db --local --file=./worker/schema.sql

# Production remote database
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
| **Build command** | `npm run build` |
| **Deploy command** | `npx wrangler deploy` |
| **Root directory** | `/` |

---

## 📱 PWA Verification

- **Service Worker**: Auto-registered via `vite-plugin-pwa` with precached app shell.
- **Offline Mode**: Works 100% offline out-of-the-box using local indexed cache and localStorage.
- **In-App Install**: Install banner prompts users on Android Chrome / Desktop Safari / Edge.
