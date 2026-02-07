# SplitMint — Implementation Plan (Preview)

**Your Gateway to Karbon** — Expense splitting with groups, balances, and optional AI (MintSense).

---

## Tech Stack (Proposed)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 14 (App Router) | Full-stack, API routes, SSR, file-based routing |
| **Database** | SQLite + Prisma | Simple setup, easy migration to PostgreSQL later |
| **Auth** | NextAuth.js (Credentials + Email) | Register + login with email, sessions |
| **Styling** | Tailwind CSS | Fast UI, color-coded ledger, responsive |
| **Validation** | Zod | API + form validation |
| **AI (Optional)** | Groq API (MintSense) | Free tier; natural language → expenses, summaries, suggestions |

---

## Data Model (Prisma Schema)

```
User
  id, email, passwordHash, name, createdAt

Group
  id, name, primaryUserId (FK → User), createdAt, updatedAt
  → max 3 participants + primary = 4 people total

Participant
  id, groupId (FK), name, color, avatarUrl (optional), createdAt

Expense
  id, groupId, description, amount (Decimal), date, payerId (FK → Participant), createdAt
  splitMode: EQUAL | CUSTOM_AMOUNT | PERCENTAGE

ExpenseShare
  id, expenseId, participantId, amount (share), percentage (if applicable)
```

- **Cascade**: On Group delete → Participants, Expenses, ExpenseShares deleted.
- **Participant remove**: Expenses that reference removed participant handled (reassign or block delete until settled).

---

## API Design (REST-style under `/api`)

| Area | Endpoints |
|------|-----------|
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login` (NextAuth credentials provider) |
| **Groups** | `GET/POST /api/groups`, `GET/PATCH/DELETE /api/groups/[id]` |
| **Participants** | `GET/POST /api/groups/[id]/participants`, `PATCH/DELETE /api/groups/[id]/participants/[pid]` |
| **Expenses** | `GET/POST /api/groups/[id]/expenses`, `GET/PATCH/DELETE /api/groups/[id]/expenses/[eid]` |
| **Balances** | `GET /api/groups/[id]/balances` (who owes whom + net + settlement suggestions) |
| **Search** | `GET /api/groups/[id]/expenses?search=&participant=&dateFrom=&dateTo=&amountMin=&amountMax=` |
| **MintSense** | `POST /api/mintsense/parse` (NL → expense), `POST /api/mintsense/summarize`, `POST /api/mintsense/suggest-settlements` (Groq API) |

---

## Feature Checklist (Point-by-Point)

### 1. Basic Authentication
- [ ] Register: email, password, name → store hashed password, create User
- [ ] Login: email + password → session (NextAuth)
- [ ] Protected routes: redirect unauthenticated users to login
- [ ] Logout

### 2. Groups
- [ ] Create group (name, primary user = current user; add up to 3 participants)
- [ ] Edit group name and participants (stay within 3 + primary)
- [ ] Delete group with cascade (participants, expenses, shares)
- [ ] Participant details: name, optional color/avatar
- [ ] Group-level totals and balance summaries on group dashboard

### 3. Participants
- [ ] Add participant to group (name, optional color/avatar)
- [ ] Edit participant name (and color/avatar)
- [ ] Remove participant: if linked expenses exist, either block or reassign (e.g. “Unknown”) and recalc balances

### 4. Expenses
- [ ] Add expense: amount, description, date, payer (participant), group, participants involved
- [ ] Split modes: equal, custom amount per participant, percentage
- [ ] Edit expense (same fields + recalc shares)
- [ ] Delete expense (recalc balances)
- [ ] Automatic balance recalculation on add/edit/delete
- [ ] Consistent rounding for uneven splits (e.g. remainder to payer or largest share)

### 5. Balance Engine
- [ ] Compute who owes whom (directional: A owes B $X)
- [ ] Net balance per participant (positive = owed to them, negative = they owe)
- [ ] Minimal settlement suggestions (greedy or graph-based to minimize transactions)

### 6. Visualizations
- [ ] Summary cards: total spent, total owed by user, total owed to user
- [ ] Balance table: directional owed amounts (who owes whom)
- [ ] Transaction history with filters (participant, date, amount, search)
- [ ] Group dashboard: contributions and shares per participant
- [ ] Color-coded ledger (e.g. green = you’re owed, red = you owe, neutral for others)

### 7. Search & Filters
- [ ] Search expenses by text (description)
- [ ] Filter by participant (payer or involved)
- [ ] Filter by date range and amount range

### 8. AI — MintSense (Optional)
- [ ] Parse natural language → structured expense (amount, description, payer, split)
- [ ] Auto-categorize expense type (food, transport, etc.)
- [ ] Generate readable group summaries
- [ ] Suggest settlement paths (who should pay whom first)

---

## App Structure (Pages & Key Components)

```
app/
  layout.tsx              # Root layout, auth provider
  page.tsx                # Landing / redirect to dashboard or login
  (auth)/
    login/page.tsx
    register/page.tsx
  (dashboard)/
    layout.tsx            # Sidebar/nav, only when logged in
    page.tsx              # List of user’s groups + quick stats
    groups/
      [id]/
        page.tsx          # Group dashboard (totals, balance table, recent expenses)
        participants/     # Manage participants (or inline on group page)
        expenses/
          page.tsx        # Expense list + filters + search
          new/page.tsx    # Add expense form (split mode selector)
          [eid]/edit/     # Edit expense
    balances/             # Or under groups/[id]/balances
  api/
    auth/[...nextauth]/
    groups/...
    mintsense/...
components/
  auth/                   # LoginForm, RegisterForm
  groups/                 # GroupCard, GroupForm, ParticipantForm, ParticipantList
  expenses/               # ExpenseForm, ExpenseList, ExpenseFilters, SplitModeInput
  balances/               # BalanceTable, SettlementSuggestions, SummaryCards
  ledger/                 # TransactionHistory, ColorCodedLedger
  layout/                 # Sidebar, Header
lib/
  auth.ts                 # NextAuth config
  db.ts                   # Prisma client
  balance-engine.ts       # Who owes whom, net, minimal settlements
  rounding.ts             # Consistent split rounding
prisma/
  schema.prisma
  migrations/
```

---

## UI/UX Notes

- **Color-coded ledger**: Green for “owed to you”, red for “you owe”, gray/neutral for others.
- **Summary cards**: Total spent in group, “You are owed”, “You owe”.
- **Balance table**: Rows/columns or list: “Alice owes Bob $20”.
- **Settlement suggestions**: “Pay Bob $30” to minimize number of transactions.
- **MintSense**: Optional section; if no API key, hide or show “Connect API key in settings”.

---

## Implementation Order (After Your Approval)

1. **Scaffold**: Next.js, Prisma, Tailwind, NextAuth, env template.
2. **Auth**: Register + login + protected layout.
3. **Groups CRUD**: Create, edit, delete (cascade), participant details, max 3 + primary.
4. **Participants CRUD**: Add, edit, remove (with expense handling).
5. **Expenses CRUD**: Add/edit/delete, split modes, rounding, balance recalculation.
6. **Balance engine**: Net balances, who owes whom, minimal settlements.
7. **Visualizations**: Summary cards, balance table, transaction history, group dashboard, ledger colors.
8. **Search & filters**: API + UI for text, participant, date, amount.
9. **MintSense (optional)**: Parse NL, categorize, summarize, suggest settlements.

---

## What I Need From You

1. **Approval**: Confirm this plan (or note changes: stack, max participants, or which features to drop).
2. **AI key**: For MintSense, use Groq (free tier); env var `GROQ_API_KEY` — get it at https://console.groq.com
3. **Database**: OK to start with SQLite? (We can add a `DATABASE_URL` for PostgreSQL later.)

Once you approve, I’ll implement point-by-point as described above.
