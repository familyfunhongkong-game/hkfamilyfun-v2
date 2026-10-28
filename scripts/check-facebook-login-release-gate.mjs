// Contract: enabling Facebook in Supabase is insufficient until the Meta app is live.
// Run: node scripts/check-facebook-login-release-gate.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const login = readFileSync('components/merchant/merchant-login-panel.tsx', 'utf8');
const config = readFileSync('lib/merchant-google-provider.ts', 'utf8');
const proxy = readFileSync('proxy.ts', 'utf8');
const deletion = readFileSync('app/data-deletion/page.tsx', 'utf8');

assert.match(login, /NEXT_PUBLIC_FACEBOOK_LOGIN_LIVE\s*===\s*["']true["']/);
assert.match(login, /facebookLive\s*\?\s*socialSignInAvailability\(["']facebook["']\)/);
assert.match(login, /provider === ["']facebook["'] && !facebookLive/);
assert.match(login, /availableSocial\.facebook && <button/);
assert.match(login, /socialSignInAvailability\(["']google["']\)/);
assert.match(config, /auth\/v1\/settings/);
assert.match(proxy, /["']\/data-deletion["']/);
assert.match(proxy, /PUBLIC_LEGAL_PATHS/);
assert.match(deletion, /deletionLegal/);

console.log('Facebook rollout gate and public deletion-route contracts OK');
