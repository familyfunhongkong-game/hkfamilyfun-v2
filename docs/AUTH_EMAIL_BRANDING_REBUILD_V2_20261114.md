# HK Family Fun — Auth Email Branding Recovery & Rebuild V2 Gate

**Reviewed 2026-11-14.** Requested: existing HK Family Fun logo-branded HTML (not plain text) for **Sign-up Confirmation** and **Forgot Password / Recovery**, preserving the original logo and safe Supabase Auth links. Production Maintenance Mode unchanged.

## What the actual records showed

- Connected Resend account for `hkfamilyfun.com` has a verified sending domain; historical sender is **"HK Family Fun" <no-reply@hkfamilyfun.com>**.
- Actual delivered **2026-11-09** Staging confirmation email subject `Confirm your email address` and HTML body was only `<h2>` + text + `<a>`, with no logo or styled layout.
- Actual delivered **2026-11-02** Staging recovery email subject `Reset your password` was similarly unbranded.
- Therefore **Rebuild Staging Auth currently used plain/default template HTML** as of those send dates; this is *not* an email-client-only missing image bug.
- The user's earlier version is described as branded. **Exact prior HTML/layout was not recovered** from accessible saved records and code. We reconstructed a branded style using the exact official uploaded transparent PNG, not an invented/re-drawn logo. This should not be called an exact byte-for-byte old-template restoration.

## Original logo verified

- Original uploaded PNG: 100×100 RGBA; 20,047 bytes; SHA-256 `bf9f56f08f6a2cf522db388037e83c2d3363ebc5858400378efd6ead4ade9fa5`.
- Existing V2 route `/api/brand/family-fun-logo` reconstructs the same exact bytes and enforces checksum. `proxy.ts` permits `/api/` paths while the public home is under Maintenance Mode.
- Email HTML references **absolute HTTPS** `https://www.hkfamilyfun.com/api/brand/family-fun-logo`. A staging/production Management API sync must first fetch the live logo and verify PNG MIME and full hash before updating hosted templates.
- External-image-disabled email clients retain visible HK Family Fun text and descriptive image ALT text.

## Committed full HTML (not just website React UI)

- `supabase/templates/confirmation.html` -> `mailer_templates_confirmation_content`
- `supabase/templates/recovery.html` -> `mailer_templates_recovery_content`
- Branded header, original 88px PNG, Traditional Chinese primary copy, clear purple CTA, direct fallback link, security note, non-promotional footer, contact, inline CSS/table layout.
- **Both must contain** `{{ .ConfirmationURL }}` (button and fallback). **Never** hardcode bearer tokens, magic links, `localhost`, or Staging URLs into the email body.
- Suggested hosted subjects: `HK Family Fun｜確認你的電郵地址` and `HK Family Fun｜重設你的帳戶密碼`.
- Shared Supabase Auth email templates mean these branded confirmation/recovery messages are used by **Parent, Merchant and Admin** Auth flows where Supabase sends their matching template. The redirect destination is still controlled per caller, never by HTML alone.

## Hosted Supabase deployment is a SEPARATE configuration change

**GitHub code deploys DO NOT change the hosted Supabase Auth Email Templates.** The Supabase connected integration offers DB/admin operations but not hosted `config/auth` PATCH, so publishing these GitHub files is not proof that real emails are branded.

To manage this safely:
- Manual-only Actions: `.github/workflows/auth-email-branding-manual.yml`, with choice `target: staging / production` and `action: verify / apply`.
- Manual check/apply utility: `scripts/sync-auth-email-templates.mjs` using documented Supabase Management API `GET/PATCH /v1/projects/{ref}/config/auth`. It reads back all 4 scoped template/subject settings, saves the former values to local noncommitted `artifacts/auth-email-backups`, checks original live PNG and re-reads updated config; it **does not** update sender, SMTP, MFA, Auth redirect allow list, password policy or other settings.
- Required **organization-managed GitHub Actions secret** `HKFF_SUPABASE_MANAGEMENT_TOKEN` holding a *scoped project-config token*; **never add a PAT to GitHub source**. Supabase token scope for the two projects must allow auth config read/write.
- For Production apply, set GitHub Actions environment `hkff-auth-email-production`, require reviewer approvals where supported, and set environment variable `HKFF_AUTH_EMAIL_PRODUCTION_APPROVED=YES`. Staging env is `hkff-auth-email-staging`. Missing approval fails closed.
- If the management secret has not been configured, **the workflow cannot touch hosted Supabase**. Do not claim hosted implementation complete.
- Alternative: Supabase Dashboard for each project -> Authentication -> Email Templates -> Confirm sign up / Reset password -> paste these exact HTML files and set the subjects, save and read back.

## Current user flows to retain

- Parent `signUp` and `resend({type: 'signup'})`: `emailRedirectTo: window.location.origin + '/login'`.
- Parent `resetPasswordForEmail`: redirect to `window.location.origin + '/account/reset-password'`; frontend minimum 8 for parent only.
- Merchant/Admin recovery: their own redirect to `/merchant/update-password`, and stronger minimum 12 kept. Shared recovery email must remain role-neutral to support both.
- Confirm both projects allow the exact production and Staging redirect paths under Authentication -> URL Configuration.

## Final acceptance gates (must be observed on actual mail)

1. Verify Staging logo public URL GET returns **200 + image/png + exact original hash**.
2. Apply and **read back** both Staging hosted templates and subjects; do not infer success from CI build.
3. Create a legitimate *dedicated test inbox* account and send confirmation email. Inspect received HTML and original-logo rendering on Gmail, Outlook and 375px phone; verify the link opens proper Staging origin, and that the user can confirm, then log in.
4. Request a real forgot-password email, open it, set a new password, and confirm old login fails and new login succeeds.
5. Verify Merchant/Admin role-specific recovery destinations and 12-character min rule.
6. Only after Staging passes, apply and read back Production settings using explicit owner approval. Send fresh Production test emails and verify received HTML, logo, and correct `www.hkfamilyfun.com` redirect. Do not bypass Auth or disable email confirmation.
7. Record Resend delivered/failed status and actual email content; take acceptance screenshots; no real OTP/token/one-time link in issue/CI logs.
8. Keep Website Maintenance Mode and PR release gates independent; template branding alone does **not** constitute GO approval.

## Automated guard

`node scripts/check-auth-email-branding.mjs`, included in prebuild, verifies both HTML files, original branded logo route, popup-safe official link placeholders, role-independent copy, and Parent redirect contract. This is source-level evidence, **not a guarantee of hosted Supabase email appearance**.

Reference: https://supabase.com/docs/guides/auth/auth-email-templates (current Management API field names and template variables).
