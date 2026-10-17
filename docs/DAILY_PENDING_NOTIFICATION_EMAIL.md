# Daily Admin Notification Digest

## Schedule

GitHub Actions workflow: `.github/workflows/daily-pending-notice.yml`.
Runs at **09:00 Hong Kong time (01:00 UTC)** every day. GitHub scheduled workflows may run later than their target time.

Recipient is fixed to `familyfun.hongkong@gmail.com`.

## Required GitHub Actions repository secrets

Configure in repository Settings → Secrets and variables → Actions:

- `SUPABASE_URL`: the V2 Supabase project URL (not the discontinued legacy project).
- `SUPABASE_SERVICE_ROLE_KEY`: V2 server-side service role key; **never expose to browser or commit to Git**.
- `RESEND_API_KEY`: active Resend API key.
- `DIGEST_FROM_EMAIL`: complete email sender address using a verified Resend domain, e.g. `HK Family Fun <notifications@hkfamilyfun.com>` only when this address/domain is verified.

Missing secrets cause a failing job rather than a false positive success.

## How to verify

1. Open GitHub → Actions → **HK Family Fun Daily Pending Notice** → Run workflow.
2. Check job status and the Resend email ID in action logs. The key itself is not logged.
3. Confirm the email is received at the fixed Gmail recipient (check Spam folder).
4. Review subsequent daily scheduled runs.

Delivery is **not confirmed** until repository secrets are configured and a successful end-to-end send has been observed.

## Current semantics and limitations

This initial version queries up to 1000 `platform_notifications` rows scoped to `recipient_scope=admin` where `read_at IS NULL`. It does not assume an unread notification is an unresolved merchant or event approval. The email explains this limitation and links to the admin portal. It lists at most 100 rows to limit message size.

Future upgrade: introduce explicit `pending/resolved` lifecycle and real `due_at` SLA for merchant applications, event submissions and user-reported issues, plus persisted digest delivery IDs to prevent accidental duplicate deliveries after manual reruns.
