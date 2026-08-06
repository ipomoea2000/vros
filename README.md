# VROS 2.1.1 Navigation Hotfix

This release replaces the non-working hash-link sidebar with real client-side tabs.

## What it fixes

- Projects button now opens the Projects workspace.
- Manuscripts button now opens the Manuscripts tracker.
- Grants button now opens the Grant pipeline.
- Tasks button now opens the full task list.
- Each section now includes a working add form.
- Project cards continue to open individual project workspaces.

## Install

Replace the files in the existing GitHub repository with this package and commit to `main`.

No Supabase migration is needed if `migration_2_1.sql` was already run.

No Vercel environment-variable changes are needed.
