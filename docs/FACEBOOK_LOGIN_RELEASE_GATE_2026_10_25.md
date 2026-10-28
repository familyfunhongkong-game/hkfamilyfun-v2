# HK Family Fun — Facebook Login release gate

As of 2026-10-25, the Meta developer app showed **Unpublished** and users received **App not active**.

## Existing production routes

- Privacy Policy: `https://www.hkfamilyfun.com/privacy`
- User data deletion instructions: `https://www.hkfamilyfun.com/data-deletion`
- Terms: `https://www.hkfamilyfun.com/terms`
- Meta Valid OAuth Redirect URI: `https://uiyrbqqvgnfhfdhedmav.supabase.co/auth/v1/callback`
- Supabase Auth site URL: `https://www.hkfamilyfun.com`
- Merchant sign-in redirect: `https://www.hkfamilyfun.com/merchant/dashboard`

The legal routes already exist in Next.js and are exempted from live-host maintenance rewrite in `proxy.ts`. **Manually confirm each route loads in a normal and incognito browser before submitting it to Meta.** Do not invent a Meta deletion callback endpoint; this site documents the manual deletion-request procedure.

## New safe rollout switch

`NEXT_PUBLIC_FACEBOOK_LOGIN_LIVE` must be set to the string `true` in the **Vercel Production** environment **only after** Meta App is published and a real end-to-end Facebook login succeeds. By default the Facebook button remains hidden, even if Supabase Auth Settings reports `external.facebook=true`. Email/password and Google login are not changed.

Disabling the switch removes the Facebook sign-in button and stops new initiations through the Merchant login UI. This is *not* equivalent to disabling Facebook as an authentication provider at Supabase (other flows could still use it). This is a client-side user-experience safeguard, **not** an access-control boundary.

## Owner-controlled Meta steps

1. Meta Developers → HK Family Fun → **Publish**. App currently Unpublished.
2. Meta App Settings → Basic → set **Data Deletion Instructions URL** to `https://www.hkfamilyfun.com/data-deletion` and privacy/terms URLs to corresponding existing pages.
3. Check ownership of the Meta Business Portfolio and get Full Control or a permitted verification workflow for **Peyto Dev Hub Limited** (confirmed legal operator of HK Family Fun).
4. Confirm the actual Facebook Login use case is approved and minimal: regular parent/merchant login should not require unrelated Marketing API permissions.
5. Publish the Meta app when Meta permits it, then check an ordinary Facebook user (not only an app admin/tester), login callback, and correct authenticated landing/merchant registration.
6. Add the Vercel production `NEXT_PUBLIC_FACEBOOK_LOGIN_LIVE=true` switch and redeploy; verify live website sign-in.

**Do not put Facebook App Secret, Supabase service-role keys, access tokens, or passwords in GitHub.**

## QA

- Verify Facebook button is absent by default.
- Verify Google/email flows are unaffected.
- Verify Facebook button appears only after explicit env enablement AND provider availability.
- Verify a normal user's Facebook login; the Meta 'App not active' page must not appear.
- Keep app in maintenance mode until unrelated full launch gates are closed.
