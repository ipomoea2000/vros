# VROS 4 — Calm Resume Interface

VROS 4 changes the interface without replacing the database or deleting prior records.

## Your existing data is preserved

The two ChatGPT links and all projects, tasks, manuscripts, grants, notes, project sessions, project memory, and imported portfolio records remain in Supabase. Replacing the application files does not erase them.

No new Supabase migration is required for VROS 4.

## Main changes

- Calm homepage centered on **Continue My Day**
- Recently active projects with one-click **Resume Project**
- Simplified project page showing:
  - immediate next action
  - latest decision
  - latest conversation link
  - open tasks
  - recent memory
  - quick note
  - linked work
- Full project record remains available behind a disclosure button
- Knowledge Capture remains available globally and inside projects
- Existing Conversation Library, Ask VROS, Inbox, Manuscripts, Grants, and Tasks remain available
- Sidebar navigation now works from inside a project by returning to the requested home section
- URL view state is preserved with `?view=projects`, `?view=knowledge`, etc.

## Upgrade

1. Replace the existing GitHub repository contents with this package.
2. Commit to `main`.
3. Vercel will redeploy automatically.
4. No SQL migration and no environment-variable changes are needed.
5. Hard-refresh the live site after deployment.

## Adding more ChatGPT links afterward

Yes. Open **Capture & Memory** or a project and click **Capture session**. The two links you already saved remain intact.
