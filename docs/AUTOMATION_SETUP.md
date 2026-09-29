# HK Family Fun Automation Setup

Daily event discovery is implemented in `.github/workflows/auto-discover-events.yml`.

Schedule: 00:15 UTC daily (08:15 Hong Kong time).

## Required GitHub repository secrets

Open:

Settings → Secrets and variables → Actions → New repository secret

Add:

- `SUPABASE_URL`
  - Value: your HK Family Fun V2 Supabase project URL.

- `SUPABASE_SERVICE_ROLE_KEY`
  - Value: the Service Role key from the HK Family Fun V2 Supabase project.
  - Never place this value in source code or NEXT_PUBLIC variables.

- `APPROVAL_EMAIL`
  - Suggested value: `info@hkfamilyfun.com`

- `APP_BASE_URL`
  - Current testing value: `https://hkfamilyfun-v2.vercel.app`
  - Change to `https://hkfamilyfun.com` only after final domain cutover.

Optional email delivery:

- `RESEND_API_KEY`
  - Needed only for direct approval email.
  - If omitted, the workflow still creates a GitHub Issue assigned to `familyfunhongkong-game`.

## Safety behavior

Automatic discovery:

1. scans official sources only;
2. limits new drafts to 5 per run;
3. checks source URL/fingerprint for duplicates;
4. tries to import JSON-LD / Open Graph event data;
5. creates records as `draft`;
6. sets `hidden_pending_confirmation = true`;
7. never publishes automatically;
8. Admin must verify and explicitly publish.

## Test

GitHub → Actions → Auto Discover HK Family Events → Run workflow.

After testing, check:

- Supabase `events` table for new Draft items;
- GitHub Issues for the approval notification;
- email inbox if Resend is configured;
- Admin approval links work.
