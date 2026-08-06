# VROS 2.2 — Portfolio Import and Ask VROS

## What this version adds

- Fixes the landing-page Add Task control by using a real form submission.
- Adds a one-time portfolio reconstruction and import.
- Imports projects, manuscripts, grants, tasks, and project notes.
- Skips matching titles/names to reduce duplicates.
- Populates project dropdown menus automatically after import.
- Adds Ask VROS, a project-aware AI question-and-answer panel.
- Keeps the OpenAI API key on the Vercel server, never in browser code.
- Uses `store: false` for VROS AI requests.

## 1. Run the Supabase migration

In Supabase SQL Editor, run:

```text
supabase/migration_2_2.sql
```

This adds an activity-log table for future timeline features. It does not remove existing records.

## 2. Replace the GitHub repository contents

Upload the contents of this package to the existing VROS repository root and replace the current files.

Commit to `main`. Vercel will redeploy automatically.

## 3. Import the reconstructed portfolio

After deployment:

1. Sign in.
2. The empty dashboard will show **Populate VROS from our prior work**.
3. Click **Preview portfolio**.
4. Review the counts and project names.
5. Click **Import into my VROS account**.

The importer checks existing project names and record titles and skips likely duplicates.

## 4. Configure Ask VROS

Ask VROS is optional. The rest of VROS works without an OpenAI API key.

In Vercel → Project → Settings → Environment Variables, add:

```text
OPENAI_API_KEY = your OpenAI API key
OPENAI_MODEL = gpt-5-mini
```

Do not use `NEXT_PUBLIC_` in the API-key name.

Redeploy after adding the variables.

The application uses the official OpenAI JavaScript SDK and Responses API through a protected server route. It sends the structured VROS portfolio records relevant to the signed-in session; it does not automatically access ChatGPT conversations, OneDrive, email, or computer folders.

## Security boundary

- Supabase publishable key remains browser-safe and is protected by RLS.
- OpenAI API key remains server-side in Vercel.
- Never add a Supabase service-role key to browser code.
- VROS currently stores structured metadata and notes, not confidential research files.
