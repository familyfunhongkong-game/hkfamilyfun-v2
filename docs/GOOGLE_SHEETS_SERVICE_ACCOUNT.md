# HK Family Fun — Google Sheets Service Account Runbook

Purpose: replace temporary OAuth Testing with durable, unattended Google Sheets read-only sync.

## Current Google Cloud project

- Project ID: `peaceful-nature-510612-p6`
- HK Family Fun Google account: `familyfun.hongkong@gmail.com`

## 1. Create a Service Account

In Google Cloud Console:

1. Open **IAM & Admin → Service Accounts**.
2. Select project `peaceful-nature-510612-p6`.
3. Create a service account named `hk-family-fun-sheets-sync`.
4. No broad Google Cloud project role is required for Sheets read-only access.
5. Create a JSON key for this service account.

Do not paste the private key into chat or source control.

## 2. Share only the required Sheets

Share these spreadsheets with the service account email as **Viewer**:

### Event Intake
- Spreadsheet ID: `1l8T5vdO35qefIAbJPejreJm9AMmomKpLmMBo3-tq_3E`
- Sheet: `Event Intake`

### Merchant Event Submission Form
- Spreadsheet ID: `1JGcL95SRyXosdjVydIghvsGAFtXMz3qrTOybE-Q5PMs`
- Sheet: `Sheet1`

Do not share the whole Drive.

## 3. Add Vercel environment variables

Project: `hkfamilyfun-v2`

Add:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - Value: the service account email from the JSON key.
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  - Value: the exact `private_key` field from the JSON key.
  - Store as **Secret / Sensitive**.
  - Production + Preview + Development.

Redeploy production after adding the variables.

## 4. Expected result

Admin → Operations Hub should show:

- Auth mode: **Service Account（長期）**
- Status: **CONNECTED**
- Sync All Data / Forms available

System Health should show:

- Google Sheets Sync: Ready
- Google Service Account: Ready

## 5. Security model

- Sheets scope is read-only.
- Supabase remains the source of truth.
- Google Sheets is an input source only.
- No automatic public publish.
- New/changed intake still goes through normalize, duplicate/schema validation and Admin approval.
- Service Account eliminates the OAuth Testing expiry/re-consent problem.

## 6. Verification

After redeploy:

1. Run **Sync All Data / Forms**.
2. Verify Sync Runs increments.
3. Verify unchanged rows are skipped, not reset.
4. Verify changed rows are normalized.
5. Verify `needs_review` records are not auto-promoted.
6. Verify no duplicate Intake records are created.
