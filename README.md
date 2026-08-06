# AROS 1.0 — Agentic Research Operating System

AROS evolves VROS 4 by adding advisory agents, an approval queue, and transparent agent history. It does not replace or erase the VROS database.

## Existing information remains intact

The upgrade uses an additive SQL migration. It does not delete or overwrite:

- projects
- ChatGPT conversation links
- project sessions
- tasks
- manuscripts
- grants
- notes
- resources
- project memory
- project relationships

## Agents included

- Research Coordinator
- Stale Project Watch
- Deadline Watch
- Manuscript Readiness
- Project Memory Auditor
- Complete Portfolio Review

AROS 1.0 is deliberately human-supervised. Agents generate recommendations and wait for approval before creating tasks or updating a project's next action.

## Upgrade

### 1. Run the additive migration

In Supabase SQL Editor, run:

`supabase/migration_aros_1_0.sql`

### 2. Replace the GitHub repository files

Upload this package's contents to the existing repository root and commit to `main`.

### 3. No new variables are required for manual agents

Manual advisory agents use the existing Supabase authentication and work immediately.

## Optional scheduled daily agents

The included `vercel.json` schedules `/api/agents/cron` daily.

To enable scheduled agents, add these server-side Vercel variables:

- `CRON_SECRET` — generate a long random secret
- `SUPABASE_SERVICE_ROLE_KEY` — obtain from Supabase project API keys; keep it server-side only

Then redeploy and enable **scheduled daily advisory brief** in AROS Agent Controls.

The service-role key must never be prefixed with `NEXT_PUBLIC_`, committed to GitHub, or pasted into client code.

Scheduled agents remain advisory: they add recommendations to the review queue and do not automatically send messages, edit manuscripts, delete data, or submit anything.

## First use

1. Open **AROS Agents** in the sidebar.
2. Click **Run complete portfolio review**.
3. Review each recommendation.
4. Approve useful actions or dismiss them.
5. Open Agent Activity to see exactly what ran and when.
