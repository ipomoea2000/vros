# VROS 3.1 — Knowledge Capture and Conversation Library

VROS 3.1 turns saved ChatGPT sessions and other work sessions into structured project memory.

## What it adds

- A global **Knowledge** section.
- A guided **Knowledge Capture** form.
- Save a source URL and link one session to multiple projects.
- Paste conversation text or rough notes.
- Optional AI extraction of:
  - summary
  - decisions
  - evidence/files
  - open questions
  - next actions
  - keywords
- All extracted fields remain editable before saving.
- Optional automatic update of the primary project's memory.
- Optional task creation from semicolon-separated next actions.
- A searchable **Conversation Library** with direct links back to original chats.
- Project workspaces include Knowledge Capture and their saved conversation history.

## Important limitation

VROS cannot read a private ChatGPT conversation merely from its URL. Paste the important conversation text, a ChatGPT-generated recap, or your own notes into Knowledge Capture. The URL is stored for direct return to the original chat.

## Upgrade

1. In Supabase SQL Editor, run:
   `supabase/migration_3_1.sql`

2. Replace the existing GitHub repository contents with this package.

3. Commit to `main`; Vercel will redeploy automatically.

4. No new environment variables are needed. AI extraction uses the existing:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`

## Recommended first capture

Open the original AI4SP Digital Twin conversation and copy its URL. In VROS:

1. Open **Knowledge**.
2. Enter a session title.
3. Choose **AI4SP Sweetpotato Digital Twin** as the primary project.
4. Paste the URL.
5. Paste a short recap or the relevant portion of the conversation.
6. Click **Extract memory with AI**.
7. Review the fields and save.
8. Close the original browser tab.
