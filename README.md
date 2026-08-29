# Pochi

Peer-to-peer trading for blind box collectibles. MVP scope: Sonny Angels only, no payments, no messaging — just listings, browsing, and trade proposals.

## What's in v1

- Google sign-in
- List a figure (photo, name, series, condition)
- Browse available figures
- Propose a 1-for-1 trade
- Accept / decline
- On acceptance, both sides see each other's email to sort out shipping themselves

Deliberately **not** in v1: messaging, price anchoring, multi-item trades, ratings, payments. Add these once the core loop (will strangers actually trade through this?) is validated.

## Setup

### 1. Create a Supabase project

Go to supabase.com, create a new project, and grab your project URL and anon key from Settings → API.

### 2. Set up the database

Open the SQL editor in your Supabase dashboard and run the contents of `supabase/schema.sql`. This creates the 4 tables (`users`, `listings`, `trades`, `trade_items`), row-level security policies, and a public storage bucket for listing photos.

### 3. Configure Google sign-in

**In Google Cloud Console** (console.cloud.google.com):
- Create a project (or use an existing one) → APIs & Services → Credentials → Create Credentials → OAuth client ID → Application type: **Web application**.
- Under Authorized redirect URIs, add `https://<your-project-ref>.supabase.co/auth/v1/callback` (find your project ref in the Supabase dashboard URL, or under Settings → API). This is Supabase's own callback, not your app's.
- Copy the generated **Client ID** and **Client Secret**.

**In Supabase**: Authentication → Providers → Google → enable it, paste the Client ID and Client Secret, save.

**Also in Supabase**: Authentication → URL Configuration → add `http://localhost:3000/auth/callback` (and later your production URL) to the redirect allow list — this is your app's callback that finishes the sign-in after Google redirects back through Supabase.

### 4. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project settings.

### 5. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploying

Push to GitHub and import into Vercel. Add the same two env vars in the Vercel project settings. Update the Supabase redirect URL to your production domain once deployed.

## Testing the loop

1. Sign in with two different Google accounts (two browser profiles or incognito windows work)
2. Both list a figure
3. From account A, open account B's listing and propose a trade
4. From account B, go to "my trades" and accept
5. Both listings flip to "traded" and you'll see each other's email

## Next steps once this validates

- Ratings/reputation after a completed trade (biggest trust gap right now)
- In-app messaging once you've seen what people actually need to coordinate
- Multi-collectible support (Smiskis, Calico Critters)
- Flat fee per completed trade
