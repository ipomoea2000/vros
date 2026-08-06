# VROS 2.0

Cloud-synced Villordon Research Operating System built with Next.js and Supabase.

## 1. Set up the database

In Supabase:

1. Open **SQL Editor**.
2. Click **New query**.
3. Paste the contents of `supabase/schema.sql`.
4. Click **Run**.

The script creates:
- projects
- tasks
- manuscripts
- indexes
- Row Level Security policies

Each signed-in user can access only their own records.

## 2. Configure environment variables

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

The project URL and publishable key are already included in `.env.example`.

Never add database passwords, service-role keys, or secret keys to this application.

## 3. Run locally

Install Node.js 20 or later, then:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Authentication

The app supports email and password.

In Supabase, the default email-confirmation behavior may require clicking a confirmation link before first sign-in. For a private test deployment, you may leave the default setting unchanged.

## 5. Deploy to GitHub and Vercel

1. Create a new GitHub repository, such as `vros-2`.
2. Upload all project files except `.env.local`.
3. Import the GitHub repository into Vercel.
4. Add these Vercel environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

5. Deploy.

## Important security notes

- The publishable key is designed for browser use.
- Row Level Security is what protects user records.
- Never use the Supabase secret key or service-role key in browser code.
- Do not store regulated or confidential research data until LSU IT has reviewed the architecture.

## VROS 2.0 capabilities

- Email/password sign-in
- Cloud-synced projects
- Cloud-synced tasks
- Cloud-synced manuscripts
- Portfolio search
- Project-linked tasks and manuscripts
- User-specific data isolation through RLS

## Recommended v0.3 additions

- Project editing and deletion
- Collaborators and grant tables
- Deadlines calendar
- Document and conversation links
- Seed-data import
- Morning brief
- GitHub/Vercel integration
- Project-aware AI search
