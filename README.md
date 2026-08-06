# VROS 2.1 — Usable Research Workspace

## What changed

- A clearer research-headquarters dashboard
- Quick task capture
- Search across projects, manuscripts, and grants
- Project workspace pages
- Project-linked tasks, manuscripts, grants, notes, and resources
- A grant pipeline
- Better prioritization and reduced dashboard clutter

## Upgrade from VROS 2.0

### 1. Run the database migration

In Supabase:

1. Open **SQL Editor**
2. Create a new query
3. Paste `supabase/migration_2_1.sql`
4. Run it

This adds:
- grants
- project_notes
- resources
- project priority

It does not delete your current projects, tasks, manuscripts, or user account.

### 2. Replace the GitHub repository files

Extract this package and replace the corresponding VROS repository files.

You may delete the old repository contents except `.git` if working locally, then copy in this package. Do not upload `.env.local`.

Commit with a message such as:

```text
Upgrade VROS to 2.1 project workspaces
```

Push or upload to the `main` branch. Vercel will redeploy automatically.

### 3. Keep the same Vercel environment variables

No new environment variables are required:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

### 4. Verify after deployment

- Sign in
- Create or open a project
- Add a task from the dashboard
- Open a project workspace
- Add a project note

## Important limitation

VROS 2.1 organizes links and metadata. Do not upload confidential research files directly. A later version can connect institutional OneDrive or Google Drive after an IT review.
