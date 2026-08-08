# AROS 1.5.3 Office Proposal Watch

This patch adds support for collaborative `.docx` Word proposals stored in Google Drive and opened through Google Docs.

## Files replaced
- app/api/proposals/check/route.ts
- app/api/google/connect/route.ts
- components/CommunicationsCenter.tsx
- package.json

## Important Google permission change
Office files must be downloaded through the Drive API for text extraction. AROS therefore changes the Drive scope from:

`drive.metadata.readonly`

to:

`drive.readonly`

In Google Auth Platform → Data Access, add:

`https://www.googleapis.com/auth/drive.readonly`

You may leave the old metadata-only scope present, but AROS will request Drive read-only on reconnection.

Then in AROS:
1. Disconnect Google.
2. Connect Google again.
3. Approve the new Drive read-only permission.
4. Return to Proposal Watch and click Check now on the existing Ai4SP watch.

The first successful check stores the baseline. Later checks compare the current document with that baseline.

No Supabase migration is required.
