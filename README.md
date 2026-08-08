# AROS 1.5.1 — LSU Outlook Forwarding Edition

This revision removes Microsoft Entra access as a practical dependency for the email assistant.

## Architecture

LSU Outlook remains the authoritative mailbox.

`LSU Outlook → Forward as attachment → existing Gmail → AROS → triage + project match + draft`

AROS never signs in to LSU Microsoft 365 and does not need LSU mailbox credentials.

## Why "Forward as attachment"

The Outlook rule preserves the original message as an `.eml` attachment. AROS reads that attachment and uses the original:

- sender
- sender email address
- subject
- date
- message body

The forwarding wrapper is not treated as the research email.

## Email Assistant

AROS scans recent Gmail messages that contain attachments and processes only attached RFC822/`.eml` messages. Ordinary Gmail messages are ignored by the intake parser.

For each extracted LSU message AROS can:

- classify priority: High / Medium / Low
- categorize: Needs reply / Needs action / Project update / FYI / Administrative / Low priority
- explain why the message matters
- suggest an AROS project
- propose an action
- detect a commitment
- create an AROS task
- add the item to "I owe" or "Waiting on others"
- generate a response grounded in the linked project context

AROS does not send or create mail in Gmail. The generated response is copied to the clipboard and pasted into LSU Outlook for final review and sending.

## Google Docs Proposal Watch

The same Google OAuth connection is also used for Google Docs proposal monitoring.

AROS requests:

- Gmail read-only
- Google Docs read-only
- Google Drive metadata read-only
- basic Google identity scopes

It does not request Gmail send or compose permission.

## Upgrade from the previous AROS 1.5 build

If `migration_aros_1_5.sql` was already run successfully, **no additional SQL migration is required** for 1.5.1.

Replace the current GitHub repository contents with this package and commit to `main`.

## Google connector setup

AROS needs its own Google OAuth application because the Vercel app cannot reuse ChatGPT's Gmail connector credentials.

Add these Vercel variables:

- `NEXT_PUBLIC_APP_URL=https://vros-iota.vercel.app`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Keep the existing OpenAI and Supabase browser variables.

The Google OAuth callback URI is:

`https://vros-iota.vercel.app/api/google/callback`

Enable the Gmail API, Google Docs API, and Google Drive API in the Google Cloud project.

## First validation

Keep the Outlook rule narrow at first:

- Rule: `AROS Test`
- Condition: From your selected test sender
- Action: Forward as attachment to your existing Gmail account

After Google is connected to AROS:

1. Open **Communications → Email Assistant**.
2. Click **Check forwarded LSU mail**.
3. Confirm that AROS shows the original LSU sender and subject, not the forwarding wrapper.
4. Generate a draft response.
5. Click **Copy response**.
6. Paste it into Outlook and review it.

Only broaden the Outlook rule after several messages are parsed correctly.

## Safety

- Existing projects, ChatGPT links, project memory, tasks, manuscripts, grants, and proposal records stay in Supabase.
- AROS does not send LSU email.
- AROS does not have LSU mailbox credentials.
- Google access tokens are refreshed server-side; refresh tokens are encrypted before Supabase storage.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, or `GOOGLE_TOKEN_ENCRYPTION_KEY` in GitHub or client-side variables.
