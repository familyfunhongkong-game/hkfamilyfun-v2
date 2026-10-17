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

The daily message now queries real pending merchant applications (`merchants.status=pending`) and events awaiting approval or publication (`events.status IN (submitted,approved)`). It separately includes unread admin notification count for reference. Marking notifications as read **does not** remove pending approvals from the daily report.

The report orders pending items from oldest submission to newest, highlighting items waiting at least five days. The five-day indicator is not a database-enforced SLA/deadline; proper `due_at` fields remain a future improvement. Lists are capped at 100 shown entries and 1000 queried per table; reaching the latter triggers a count warning.

Manual GitHub workflow dispatch can generate duplicate emails. Scheduled GitHub Actions are best-effort, not guaranteed to execute precisely at 09:00. Real email delivery requires configured secrets, a verified sending domain, and a successful end-to-end test. The cron will fail loudly when Supabase/Resend returns an error.

To run a query-only test without sending an email, add `DIGEST_DRY_RUN=1` in a controlled local environment with server-only credentials. The script still requires four configured environment variables and never logs their values.

The current report covers merchant and event review queues only. It does not yet include community reports, customer support messages, or independent notification issue-resolution tracking.
