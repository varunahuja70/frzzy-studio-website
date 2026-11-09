# FRZZY Studio Website — Firebase Hosting Deployment Guide
**Architecture**: Framework-Aware Next.js App Router on Google Cloud Run + Firebase Hosting CDN  
**Prerequisites**: Firebase CLI (`firebase-tools`), Google Cloud Project on the Blaze (Pay-as-you-go) Plan

---

## 1. Prerequisites & Blaze Plan Note
Next.js App Router utilizes dynamic server-side rendering (`await connection()`, dynamic API routes, cryptographic operations, and cookie handling). 
- **Blaze Plan Required**: Firebase Web Frameworks compiles dynamic Next.js routes into a Google Cloud Run service managed seamlessly by Firebase. A Blaze plan is mandatory for cloud execution (generous free tier: 2M requests/month, 360,000 GB-seconds memory).

---

## 2. Install & Authenticate Firebase CLI
1. Verify `firebase-tools` is installed (bundled in devDependencies):
   ```bash
   npx firebase --version
   ```
2. Log in with your Google Cloud account:
   ```bash
   npx firebase login
   ```
   *(For headless/remote environments, use `npx firebase login --no-localhost`)*.

---

## 3. Link Project ID
Update `.firebaserc` with your real Firebase Project ID:
```json
{
  "projects": {
    "default": "your-real-firebase-project-id"
  }
}
```
Or run:
```bash
npx firebase use --add
```

---

## 4. Environment Variables for Production
Firebase Web Frameworks reads your environment during build and deployment. Set your secrets using Google Cloud Secret Manager or Firebase Functions config, or in `.env.production`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
ADMIN_ENCRYPTION_KEY=64_character_hex_key_here
ADMIN_PEPPER=high_entropy_server_pepper_here
ADMIN_SESSION_SECRET=high_entropy_session_secret_here
MEDIA_SIGNING_SECRET=high_entropy_signing_secret_here
```

---

## 5. Build, Preview & Deploy Commands

### Production Build & Typecheck Verification
```bash
npm run build:firebase
```

### Preview Channel Deployment (Safe Staging)
To test a build in a temporary preview URL before updating production:
```bash
npm run preview:firebase
```

### Production Deployment
Deploy live to Firebase Hosting:
```bash
npm run deploy:firebase
```

---

## 6. Custom Domain & SSL
1. Go to the **Firebase Console** → **Hosting** → **Add Custom Domain**.
2. Enter your domain (e.g. `frzzy.studio`).
3. Add the A records provided by Firebase to your DNS registrar (e.g. Cloudflare, Namecheap, GoDaddy).
4. Firebase automatically provisions an SSL certificate from Let's Encrypt within 1–2 hours.

---

## 7. Security Headers & CDN Caching
The project's `firebase.json` automatically enforces:
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options`: `SAMEORIGIN`
- `X-Content-Type-Options`: `nosniff`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- Cache-Control on static assets (`/_next/static/**`): 1 year immutable.
- Cache-Control on video assets (`/media/**`): 24 hours with stale-while-revalidate.
