# HK Family Fun Google Calendar Setup

The planner already contains the OAuth and Free/Busy integration code.

## Google Cloud setup

1. Create or use an HK Family Fun Google Cloud project.
2. Enable Google Calendar API.
3. Configure OAuth consent screen.
4. Create a Web application OAuth client.

Authorized redirect URI for testing:

`https://hkfamilyfun-v2.vercel.app/api/google-calendar/callback`

After domain cutover, also add:

`https://hkfamilyfun.com/api/google-calendar/callback`

## Required Vercel environment variables

Add these to the `hkfamilyfun-v2` Vercel project:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`
- `GOOGLE_REDIRECT_URI`

Testing redirect value:

`https://hkfamilyfun-v2.vercel.app/api/google-calendar/callback`

For `GOOGLE_TOKEN_ENCRYPTION_KEY`, use a long random secret. Do not expose it as a NEXT_PUBLIC variable.

## Privacy design

The planner requests Google Calendar read-only access.

The website uses the Google FreeBusy endpoint and only needs busy time ranges for itinerary conflict avoidance.

OAuth tokens are encrypted server-side and stored in an HttpOnly Secure cookie. They are not stored in localStorage.

## Planner behavior

When connected:

1. parent selects a Hong Kong date;
2. the planner checks the primary Google Calendar busy periods for that day;
3. events overlapping busy periods are excluded;
4. remaining HK Family Fun activities are ranked;
5. up to 3 non-overlapping activities are suggested;
6. individual events can still be added to Google Calendar.

The planner also supports browser speech recognition for Cantonese input when the browser supports it.
