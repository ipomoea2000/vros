# VROS 3.0 — Research Memory Engine

VROS 3.0 adds project memory, saved session history, resumable project briefs, research inbox, workflow states, and project constellations.

## Upgrade
1. Run `supabase/migration_3_0.sql` in Supabase SQL Editor.
2. Replace the files in the GitHub repository with this package.
3. Commit to `main`; Vercel will redeploy.
4. No new environment variables are required.

## OpenAI credits
The core VROS database, project memory, session capture, inbox, links, and timelines work without OpenAI credits. The following require an active API balance: Ask VROS and Generate Resume. Add API credits in the OpenAI Platform billing page. ChatGPT subscriptions and API billing are separate.

## New capabilities
- Project Resume: purpose, hypothesis, last decision, open questions, blockers, and next action.
- Generate Resume: AI-generated resumption brief grounded in saved VROS records.
- Save Session: record what happened in a ChatGPT conversation or work session and paste its link.
- Research Inbox: capture ideas and questions before organizing them.
- Workflow states: Next, This Week, Waiting, and Someday.
- Project Constellation: database support for relationships among projects.

## Important limitation
VROS cannot automatically crawl your ChatGPT account. To return directly to a prior conversation, paste its share or browser URL into a saved Project Session or Resource record. Future sessions can be captured systematically so project continuity no longer depends on memory.
