# Supabase multi-project access for ChatGPT

## Recommended operating model

ChatGPT can authenticate to one Supabase account at a time. To manage several independent projects without repeatedly reconnecting accounts, use one dedicated operations account and invite that same account into every Supabase organization that contains a project ChatGPT needs to work on.

Recommended dedicated account:
- Keep it separate from personal email.
- Enable MFA.
- Do not share the password in chat.

## Supabase setup

For each Supabase organization:

1. Open Supabase Dashboard.
2. Go to Organization Settings -> Team.
3. Invite the same dedicated operations account.
4. Give the minimum role needed.
   - Developer: preferred for normal database/project development.
   - Administrator: use only when project settings must also be changed.
   - Owner: avoid unless ownership operations are genuinely required.
5. Accept the invitation from the operations account.
6. Reconnect the ChatGPT Supabase plugin using that operations account.

After this, a single ChatGPT Supabase connection can list all projects visible to the operations account.

## Important plan limitation

Supabase supports organization-level roles broadly. Project-scoped roles are available on Team and Enterprise plans. If project-scoped roles are unavailable on the current plan, separate unrelated projects into separate Supabase organizations so granting access to one project does not automatically expose unrelated projects in the same organization.

## Safety rule for HK Family Fun

Before any write operation, always verify the project ID and project name.

HK Family Fun V2:
- Project name: hkfamilyfun-v2
- Project ID: uiyrbqqvgnfhfdhedmav
- Region: ap-southeast-1

Never run HK Family Fun migrations against Promanrate, Pavvy, The Giving Kitchen, Our Years, or another project.
