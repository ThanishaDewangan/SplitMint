# Deploy SplitMint to Vercel

Vercel is serverless and doesn’t support SQLite files, so you use **PostgreSQL** (e.g. Neon’s free tier) for deployment.

---

## Step 1: Create a PostgreSQL database (Neon)

1. Go to **[neon.tech](https://neon.tech)** and sign up (free).
2. Click **New Project** and create a project (e.g. "splitmint").
3. Open the project → **Connection Details** (or Dashboard).
4. Copy the **connection string**. It looks like:
   ```text
   postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
   Use the one that includes the password (not the “pooled” one unless you prefer it).

---

## Step 2: Use PostgreSQL in your project

The repo is set up for PostgreSQL on Vercel. Do this once:

1. **Schema**  
   In `prisma/schema.prisma` the datasource should be:
   - `provider = "postgresql"`
   - `url      = env("DATABASE_URL")`  
   (If you had SQLite for local, switch to this so Vercel build works.)

2. **Create tables in Neon**  
   From your project folder, run (paste your real URL):
   ```bash
   set DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   npx prisma db push
   ```
   On macOS/Linux use `export DATABASE_URL="..."` instead of `set`.

3. **Local `.env`**  
   Put the same URL in `.env` so local dev uses Neon too:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
   NEXTAUTH_SECRET="your-secret-from-step-3"
   NEXTAUTH_URL="http://localhost:3000"
   ```

---

## Step 3: Generate a secret for NextAuth

Run in a terminal:

```bash
openssl rand -base64 32
```

Use this as `NEXTAUTH_SECRET` (locally and on Vercel).

---

## Step 4: Deploy on Vercel

1. Push your code to **GitHub** (if it isn’t already).

2. Go to **[vercel.com](https://vercel.com)** → **Add New** → **Project** and import your GitHub repo.

3. **Environment Variables** (Settings → Environment Variables or during import):

   | Name              | Value                    | Notes |
   |-------------------|--------------------------|--------|
   | `DATABASE_URL`    | Your Neon connection string | Same as in Step 1. |
   | `NEXTAUTH_SECRET` | Output of `openssl rand -base64 32` | Keep secret. |
   | `NEXTAUTH_URL`    | `https://your-app.vercel.app` | Use your real Vercel URL (see below). |
   | `GROQ_API_KEY`   | (optional) From [console.groq.com](https://console.groq.com) | Only if you use MintSense. |

4. **First deploy**  
   Leave `NEXTAUTH_URL` empty or set a placeholder, then click **Deploy**.  
   After the first deploy, Vercel will show your URL (e.g. `https://splitmint-xyz.vercel.app`).

5. **Set `NEXTAUTH_URL` and redeploy**  
   In the same project: **Settings** → **Environment Variables** → add or edit:
   - `NEXTAUTH_URL` = `https://your-actual-app.vercel.app`  
   Then trigger a **Redeploy** (Deployments → ⋮ → Redeploy) so login works.

---

## Step 5: Test the app

- Open your Vercel URL.
- Register a new user and log in.
- Create a group and add an expense to confirm the database works.

---

## Summary checklist

- [ ] Neon project created and connection string copied.
- [ ] `prisma/schema.prisma` uses `provider = "postgresql"`.
- [ ] `npx prisma db push` run with `DATABASE_URL` set to Neon URL.
- [ ] `.env` has `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- [ ] Repo pushed to GitHub and imported in Vercel.
- [ ] Vercel env vars set: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (and optional `GROQ_API_KEY`).
- [ ] After first deploy, `NEXTAUTH_URL` set to real Vercel URL and redeployed.

---

## Later: schema changes

After you change `prisma/schema.prisma`, run:

```bash
set DATABASE_URL=your-neon-url
npx prisma db push
```

Then commit, push, and Vercel will redeploy with the new schema.
