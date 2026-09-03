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
