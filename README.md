# IRON LOG

Personal workout tracker. React frontend + Supabase as the data layer, deployed on Vercel.

---

## Stack

- **Frontend** — Vite + React
- **Backend** — Vercel serverless functions (`/api`)
- **Data** — Supabase (Postgres)
- **Deployment** — Vercel

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free, no credit card).
2. Click **New Project** — give it a name, set a database password, pick a region close to you.
3. Wait ~1 minute for it to provision.

---

### 2. Create the tables

In your Supabase project, go to **SQL Editor** and run this:

```sql
-- Sessions table
create table sessions (
  id           text primary key,
  date         text not null,
  name         text not null,
  muscle_groups text default '',
  notes        text default '',
  created_at   timestamptz default now()
);

-- Sets table
create table sets (
  id         bigserial primary key,
  session_id text references sessions(id) on delete cascade,
  exercise   text not null,
  set_number integer not null,
  reps       text default '',
  weight     text default '',
  unit       text default 'lbs'
);
```

Click **Run**. Both tables will appear in the Table Editor.

---

### 3. Get your API keys

In your Supabase project go to **Project Settings → API**. You need:

- **Project URL** → `SUPABASE_URL`
- **service_role** key (under "Project API keys") → `SUPABASE_SERVICE_KEY`

> The `service_role` key bypasses row-level security and is used server-side only.
> It never touches the browser — it lives in Vercel env vars.

---

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

---

### 5. Run locally

```bash
npm install
vercel dev   # starts frontend + API routes together at localhost:3000
```

Or with just Vite (frontend only, API calls won't work without the Vercel runtime):

```bash
npm run dev
```

---

### 6. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

When prompted:
- Framework: **Vite**
- Build command: `npm run build`
- Output dir: `dist`

Then add env vars in the Vercel dashboard:
**Project → Settings → Environment Variables**

Add both `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`, then redeploy:

```bash
vercel --prod
```

---

## Data model

### sessions

| Column        | Type        | Notes                              |
|---------------|-------------|------------------------------------|
| id            | text (PK)   | Generated client-side              |
| date          | text        | YYYY-MM-DD                         |
| name          | text        | e.g. "Push Day"                    |
| muscle_groups | text        | Comma-separated, e.g. "Chest,Back" |
| notes         | text        | Free text                          |
| created_at    | timestamptz | Set automatically by Supabase      |

### sets

| Column     | Type     | Notes                                    |
|------------|----------|------------------------------------------|
| id         | bigserial| Auto-increment PK                        |
| session_id | text (FK)| References sessions.id                   |
| exercise   | text     | e.g. "Bench Press"                       |
| set_number | integer  | 1-indexed within exercise                |
| reps       | text     | Empty if not applicable                  |
| weight     | text     | Numeric string or empty                  |
| unit       | text     | lbs / kg / bodyweight / minutes / meters |

---

## Project structure

```
iron-log/
├── api/
│   └── sessions.js       ← Vercel serverless: GET + POST workouts
├── src/
│   ├── App.jsx           ← Full IRON LOG React app
│   ├── api.js            ← Client fetch helpers
│   ├── index.css         ← Dark industrial styles
│   └── main.jsx          ← React entry point
├── index.html
├── vite.config.js
├── vercel.json
├── .env.example
└── package.json
```

---

## Adding the AI Coach later

The AI Coach view is parked for now. When you're ready:
- Add a `/api/coach.js` route that calls the Anthropic API server-side
- Pass workout history from Supabase as system prompt context
- Add a third nav tab in `App.jsx`
