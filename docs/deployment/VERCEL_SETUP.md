# Vercel Setup — HandySales Frontend

## Prerequisites

- [Vercel account](https://vercel.com) (Free tier)
- GitHub repository

## Step 1: Import Project

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install --legacy-peer-deps --production=false`

## Step 2: Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXTAUTH_URL` | `https://app.handycrm.com` | Production |
| `NEXTAUTH_SECRET` | `<openssl rand -base64 32>` | Production |
| `NEXT_PUBLIC_API_URL` | `https://api.handycrm.com` | Production |
| `NODE_ENV` | `production` | Production |
| `API_URL` | `https://api.handycrm.com` | Production |

For Preview (staging):

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXTAUTH_URL` | `https://staging.handycrm.com` | Preview |
| `NEXTAUTH_SECRET` | `<different secret>` | Preview |
| `NEXT_PUBLIC_API_URL` | `https://api-staging.handycrm.com` | Preview |

## Step 3: Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add `app.handycrm.com`
3. Configure DNS:
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com`
4. SSL certificate is provisioned automatically

## Step 4: Deploy

Deployments are automatic:
- Push to `main` → Production deploy
- Push to other branches → Preview deploy (disabled by default, enable in `vercel.json`)

Manual deploy:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from apps/web/
cd apps/web
vercel --prod
```

## Step 5: Verify

1. Visit https://app.handycrm.com
2. Login with `admin@jeyma.com` / `test123`
3. Check DevTools → Network:
   - API calls should go to `api.handycrm.com`
   - No CORS errors
   - No `/api/auth/session` flooding (token cache fix)

## Configuration Files

### `vercel.json`
```json
{
  "framework": "nextjs",
  "installCommand": "npm install --legacy-peer-deps --production=false",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "git": {
    "deploymentEnabled": {
      "develop": false,
      "main": true
    }
  }
}
```

### `next.config.js`
Key production settings:
- `output: "standalone"` — Optimized for Vercel
- `compress: true`
- `poweredByHeader: false`
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

## Free Tier Limits

| Resource | Limit |
|----------|-------|
| Bandwidth | 100 GB/month |
| Build minutes | 6,000/month |
| Serverless function duration | 10 seconds |
| Team members | 1 (Hobby) |

Upgrade to Pro ($20/month) when you need:
- Team collaboration
- More bandwidth (1 TB)
- Longer function duration (60s)
- Password protection for previews

## Troubleshooting

### Build fails with peer dependency errors
- Ensure `installCommand` uses `--legacy-peer-deps`
- Check that React 19 compatibility packages are correct

### CORS errors on API calls
- Verify `NEXT_PUBLIC_API_URL` points to correct Railway URL
- Backend APIs must allow the Vercel domain in CORS headers

### NextAuth session issues
- Ensure `NEXTAUTH_URL` matches your custom domain exactly
- `NEXTAUTH_SECRET` must be set (Vercel doesn't auto-generate it)
- `API_URL` (server-side) should point to Railway API directly
