// Existing email-confirmation links may contain one-time query/hash tokens.
// Render the same shared account hub at this legacy URL so the browser can
// complete Supabase's session exchange without a server redirect dropping tokens.
export { default, metadata } from "../account/page";
