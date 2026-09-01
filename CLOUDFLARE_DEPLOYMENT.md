# Cloudflare Deployment Guide for Moku

## 🛠️ Root Cause of the Deploy Error in the Logs

In your deploy logs:
```text
✘ [ERROR] A request to the Cloudflare API (/workers/scripts/moku/versions) failed.
  Invalid _redirects configuration:
  Line 2: Infinite loop detected in this rule. This would cause a redirect to strip `.html` or `/index` and end up triggering this rule again. [code: 100324]
```

### Why It Happened:
1. **Redirect Loop on Static Assets**:
   Cloudflare Workers Static Assets uses `wrangler.toml` with:
   ```toml
   [assets]
   directory = "./dist"
   not_found_handling = "single-page-application"
   ```
   Having an additional `_redirects` file with `/* /index.html 200` caused Cloudflare API to detect a circular redirect loop on SPA routes and reject the upload with code **100324**.
2. **Duplicate Dependency & Pages Tag**:
   - `wrangler.toml` contained `pages_build_output_dir = "dist"`, which prompted a warning when using `wrangler deploy`.
   - `package.json` had a duplicate `"vite"` entry in `devDependencies`.

---

## 🚀 Fixes Applied in the Repository

1. **Removed `_redirects`**: Deleted the conflicting `public/_redirects` file. Cloudflare Workers natively handles single-page routing via `not_found_handling = "single-page-application"` in `wrangler.toml`.
2. **Cleaned `wrangler.toml`**: Removed `pages_build_output_dir` so `wrangler deploy` executes as a clean Workers Static Assets deployment.
3. **Cleaned `package.json`**: Removed duplicate `vite` dependency.

---

## ⚙️ Recommended Cloudflare Build Configuration

In your Cloudflare Dashboard (**Workers & Pages** > **Moku** > **Settings** > **Build & deployments**):

| Field | Setting |
| :--- | :--- |
| **Build command** | `npm run build` |
| **Deploy command** | `npx wrangler deploy` |
| **Version command** | `npx wrangler versions upload` |
| **Root directory** | `/` |

---

## 🔁 Ready to Deploy

1. Push the latest commit to your GitHub repository.
2. In Cloudflare Dashboard, go to **Deployments** > click **Retry** (or trigger a new build).
3. The build and deploy will now complete with green checkmarks!


