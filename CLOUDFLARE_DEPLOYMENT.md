# Cloudflare Deployment Guide for Moku

## 🛠️ Root Cause of the Cloudflare Build Failure in the Screenshot

In your build screenshot:
- **Build command**: `bun run build`
- **Failure point**: **Installing (3s - Red ❌)**

### Why It Failed:
1. **Missing / Incompatible Bun in Cloudflare CI**: The Cloudflare build container was attempting to run `bun install` because of a `bun.lock` file, but standard Cloudflare build environments run **Node.js + NPM** by default (or Bun was not installed/in PATH).
2. **Workers Build vs Pages**: You are deploying via **Cloudflare Workers Builds** which executes `npx wrangler deploy`.

---

## 🚀 How to Fix the Build in Cloudflare Dashboard (2 Easy Steps)

### Step 1: Update the Build Settings in Cloudflare
In your Cloudflare dashboard for project `Moku`:
1. Go to **Settings** > **Build & Deployments** (or edit your build configuration).
2. Change the settings to:
   - **Build command**: `npm run build` (instead of `bun run build`)
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory**: `/`
   - **Node.js version / Environment Variable**: `NODE_VERSION = 20`

---

### Step 2: What We Updated in the Repository
1. **Added `package-lock.json`**: Generated official npm lockfile so Cloudflare's `npm install` runs smoothly without errors.
2. **Removed `bun.lock`**: Ensures Cloudflare uses the standard, fully supported `npm` package manager.
3. **Updated `wrangler.toml`**: Added support for Cloudflare Workers Static Assets (`[assets] directory = "./dist"` with `not_found_handling = "single-page-application"`) so `npx wrangler deploy` publishes your SPA directly to Cloudflare's global edge network.

---

## 🌐 Alternative: Cloudflare Pages (Direct Upload / Git)

If you prefer Cloudflare Pages instead of Workers:
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/`
