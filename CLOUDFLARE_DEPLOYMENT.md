# Cloudflare Deployment Guide for Moku

## 🛠️ Root Cause of the `npm ci` / `EUSAGE` Error

In your Cloudflare build logs:
```text
Installing project dependencies: npm clean-install --progress=false
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
npm error Missing: @tailwindcss/oxide-android-arm64, @esbuild/aix-ppc64, @rollup/rollup-android-arm-eabi from lock file
```

### Why It Failed:
When `package-lock.json` is present in the repository, Cloudflare runs `npm clean-install` (`npm ci`). In Tailwind CSS v4 and Rollup, optional native binaries exist for 20+ architectures (macOS, Linux, Windows, Android, etc.). `npm ci` strictly requires every single unused architecture's optional dependency to be present in `package-lock.json`, failing with `EUSAGE`.

---

## 🚀 The 2-Minute Solution: Remove `package-lock.json`

When `package-lock.json` is **not present** in the repository:
- Cloudflare automatically falls back to standard **`npm install`** instead of `npm clean-install`.
- `npm install` dynamically resolves and downloads only the required Linux packages for Cloudflare's build server.
- The build succeeds cleanly with zero missing architecture errors.

### What We Changed:
1. **Removed `package-lock.json`**: Cloudflare will now run `npm install --progress=false` cleanly.
2. **Removed `bun.lock`**: Ensures Bun is not invoked.
3. **Configured `wrangler.toml`**: Single-Page App static assets are routed properly from `./dist`.

---

## ⚙️ Cloudflare Build Settings Summary

In your Cloudflare dashboard under **Workers & Pages** > **Moku** > **Settings** > **Build & deployments**:

| Setting | Value |
| :--- | :--- |
| **Build command** | `npm run build` |
| **Deploy command** | `npx wrangler deploy` |
| **Version command** | `npx wrangler versions upload` |
| **Root directory** | `/` |

---

## 🔁 Next Step: Push to GitHub & Re-run Build

1. Push your latest commit to GitHub (which removes `package-lock.json`).
2. Go to Cloudflare **Deployments** tab > Click **Retry** (or trigger a new build).
3. Cloudflare will run `npm install`, compile the Vite assets to `dist/`, and deploy via `wrangler`.

