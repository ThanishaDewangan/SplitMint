# SplitMint — Your Gateway to Karbon

Expense splitting with groups, balances, and optional AI (MintSense via Groq).

## Features

- **Auth**: Register and log in with email
- **Groups**: Create (max 4: you + 3 participants), edit name, delete with cascade
- **Participants**: Add, edit name/color, remove (when no linked expenses)
- **Expenses**: Add/edit/delete; equal, custom amount, or percentage split; consistent rounding
- **Balance engine**: Who owes whom, net balance per person, minimal settlement suggestions
- **Visualizations**: Summary cards, balance table, transaction history, color-coded ledger
- **Search & filters**: By text, participant, date range, amount
- **MintSense (optional)**: Natural language → expense, group summary, settlement order (Groq API)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` — PostgreSQL connection string (e.g. [Neon](https://neon.tech) free tier)
   - `NEXTAUTH_SECRET` — e.g. run `openssl rand -base64 32`
   - `NEXTAUTH_URL` — e.g. `http://localhost:3000`
   - `GROQ_API_KEY` — optional; get a free key at [console.groq.com](https://console.groq.com) to enable MintSense

3. **Database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

Vercel is serverless, so the app needs a **hosted PostgreSQL** database (SQLite file won’t work). Use [Neon](https://neon.tech) (free tier) or any Postgres host.

### 1. Create a database (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up.
2. Create a new project and copy the **connection string** (e.g. `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).

### 2. Push schema to the database

Using the same connection string in `.env` (or one-off):

```bash
DATABASE_URL="postgresql://..." npx prisma db push
```

### 3. Deploy on Vercel

1. Push your code to GitHub (if you haven’t already).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repo.
3. In **Environment Variables** add:

   | Name             | Value                                                                 |
   |------------------|-----------------------------------------------------------------------|
   | `DATABASE_URL`   | Your Neon (or Postgres) connection string                             |
   | `NEXTAUTH_SECRET`| Generate one: `openssl rand -base64 32`                               |
   | `NEXTAUTH_URL`   | Your Vercel URL, e.g. `https://your-app.vercel.app` (set after first deploy, then redeploy) |
   | `GROQ_API_KEY`  | Optional; from [console.groq.com](https://console.groq.com) for MintSense |

4. Deploy. After the first deploy, set `NEXTAUTH_URL` to the real URL (e.g. `https://splitmint-xxx.vercel.app`) and redeploy so login works.

### 4. Optional: run migrations from your machine

To apply schema changes to production:

```bash
DATABASE_URL="your-production-neon-url" npx prisma db push
```

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm run start` — production
- `npm run db:generate` — generate Prisma client
- `npm run db:push` — push schema (no migrations)
- `npm run db:migrate` — run migrations
- `npm run db:studio` — open Prisma Studio

## MintSense (Groq)

If `GROQ_API_KEY` is set:

- **Parse**: Type a sentence like “Alice paid $60 for dinner, split with Bob and me” → get structured expense (description, amount, payer, split).
- **Summarize**: Generate a short readable summary of the group’s expenses.
- **Settle**: Get a suggested order in which to settle up (who to pay first, etc.).

Uses the free-tier model `llama-3.1-8b-instant`.
