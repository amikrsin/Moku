# Cloudflare Pages Deployment Guide for MOKU

This project is configured and compiled for instant deployment on **Cloudflare Pages**.

---

## 🚀 Quick Deployment Methods

### Option 1: Direct Folder Upload (Easiest - 1 Minute)
1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Upload assets**.
3. Set your Project Name (e.g. `moku-tracker`).
4. Drag and drop the compiled **`dist`** folder directly into the upload box.
5. Click **Deploy site**. Your app is immediately live with HTTPS and global CDN caching.

---

### Option 2: Connect Git Repository (GitHub / GitLab)
1. Push your repository to GitHub or GitLab.
2. In Cloudflare Dashboard, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository.
4. Set the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version** (Environment variable): `NODE_VERSION = 20`
5. Click **Save and Deploy**. Cloudflare will automatically build and deploy new updates on every push.

---

### Option 3: Deploy via Wrangler CLI
Run the following commands in your terminal:
```bash
# 1. Install Wrangler CLI (if not installed)
npm install -g wrangler

# 2. Build the latest distribution assets
npm run build

# 3. Deploy the dist directory to Cloudflare Pages
wrangler pages deploy dist --project-name=moku-mindful-expense-tracker
```

---

## 📁 Included Cloudflare Configuration Files

- **`wrangler.toml`**: Cloudflare configuration specifying project name, compatibility date, and build output directory (`dist`).
- **`public/_redirects`**: Configured with `/*  /index.html  200` to support client-side Single Page Application (SPA) routing.
- **`public/_headers`**: Configured with security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) and asset cache policies.
