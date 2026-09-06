# Supabase setup

1. Create a Supabase project.
2. Open **Authentication → Providers → Anonymous Sign-Ins** and enable anonymous sign-ins.
3. Open the SQL editor and run every file in `supabase/migrations/` in filename order.
4. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
5. Add the same three environment variables to the Vercel project and redeploy.

The publishable key is intentionally used in the browser. Database access is limited by the migration's grants, Row Level Security policies, authenticated family membership, atomic database functions, and the one-vote-per-user constraint. Never put the Supabase service-role key in a `VITE_` variable.

People join with only a display name. The app uses Supabase Anonymous Auth behind the scenes, so there is no email, password, or social login. The display name is saved on the family membership and shown on polls that person creates.

The migration creates the initial family code `8H2K`. To use another code, insert it into `public.families` and set `VITE_FAMILY_CODE` to the same uppercase value.

For a public launch, enable CAPTCHA or Cloudflare Turnstile for anonymous sign-ins and schedule cleanup of old anonymous users.

## Family administrators

Apply `supabase/migrations/20260906000000_add_family_admins.sql` after the existing migrations. It adds database-enforced admin permissions and removal controls; it does not automatically promote anyone.

Identify the intended member in the Supabase SQL editor:

```sql
select id, display_name, family_id, is_admin
from public.family_members
order by joined_at;
```

After verifying the exact member ID, promote that existing account with a database-owner query:

```sql
update public.family_members
set is_admin = true
where id = '<verified member UUID>'::uuid;
```

Do not assign admins by display name: display names are editable and not unique. Browser clients have no permission to modify roles. The admin will see remove buttons in the family-member dialog and delete buttons for all displayed names. Self-removal and removal of another admin are rejected. Regular members retain creator-only deletion of custom names.

Removal deletes the family membership and its votes/reactions while keeping suggested names. A removal record prevents that same auth account rejoining automatically. Authentication is currently anonymous: clearing browser data can create a different account, and recovering an admin account across devices requires durable sign-in, which is not added by this migration. This does not delete the Supabase Auth account globally.

Run `npm run test:admins` to apply the migrations in isolated PGlite PostgreSQL and verify authorization and removal behavior. Supabase Auth is stubbed for this test; production Auth and Realtime require deployment verification.
