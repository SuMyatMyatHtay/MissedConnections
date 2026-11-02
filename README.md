# MissedConnection

Event rooms that help people find useful introductions. Organizers create a room and share a QR code. Attendees describe their project, needs, and offers, discover complementary people, and request a meeting. Accepted introductions show the room’s meeting point; either participant can confirm they met.

## Local development

```sh
npm install
npm run dev
```

Without Supabase credentials, use **Explore local demo**. Demo attendees are fictional and invitations do not send. Live rooms require Supabase.

## Supabase setup

1. Run `supabase/rooms.sql` in the Supabase SQL Editor. It is rerunnable and leaves the original `attendees` table intact.
2. Enable **Allow anonymous sign-ins** under Authentication → Sign In / Providers and save. This lets each browser join without email.
3. Set the browser-safe values in `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_ENABLE_SEMANTIC_MATCHING=false
```

4. Restart the dev server. Create a room, introduce yourself, and open its invitation in an incognito browser to test a second participant.

Anonymous sessions belong to a browser. Clearing its data or changing devices loses access to that identity. Room codes act as invitations; only share them with intended participants. Participants explicitly consent to discovery and can hide their profile or mark themselves unavailable. Only introduction participants and the room owner can read introductions; the organizer can see room metrics and profiles for their room.

Before a large event, review Supabase Auth’s anonymous sign-in rate limit: many attendees may share the venue’s public IP. Enable appropriate CAPTCHA protection before broader public promotion.

## Semantic matching

1. Run `supabase/semantic.sql` after the room schema.
2. Deploy `supabase/functions/match-room/index.ts` as the **match-room** Supabase Edge Function. Leave JWT verification enabled. You can paste the file into the Dashboard Edge Function editor, or use the CLI:

```sh
npx supabase login
npx supabase functions deploy match-room --project-ref YOUR_PROJECT_REF
```

3. Set `VITE_ENABLE_SEMANTIC_MATCHING=true` and restart/rebuild.

The function verifies the caller’s identity and room membership, generates 384-dimensional `gte-small` embeddings inside Supabase, and stores separate vectors for offers and needs. Postgres/pgvector compares your needs to their offers in both directions. Vectors refresh when a participant’s introduction changes. Realtime updates notify existing clients when new profiles have been embedded. Only the server can read raw embeddings. Exact skill matching remains available if the function is unavailable; the interface reports which engine is active.

For Gemini-written explanations, add `GEMINI_API_KEY` in Supabase → Edge Functions → Secrets. Optionally set `GEMINI_MODEL` (default `gemini-2.5-flash-lite`). The function explains up to three shortlisted pairs and caches responses against both introductions and the model. Without this key, semantic ranking still works and explanations use explicit skill overlaps. Never put server secrets in `VITE_` variables or commit `.env` files. The current server credential is named `SUPABASE_SERVICE_ROLE_KEY` and is used only for local test cleanup.

## Verification

```sh
node scripts/check-backend.mjs
npx playwright test
npm run build
node scripts/verify-bundle.mjs
```

The browser test uses two isolated sessions, including a mobile viewport. It creates a temporary room, checks live arrival, sends and accepts an invitation, confirms the meeting, and removes its own test records. Cleanup requires `SUPABASE_SERVICE_ROLE_KEY` in local `.env`. It must never be shipped to browsers. Screenshots are saved in ignored `test-results/`.

## Event launch

Deploy the `dist/` directory to public HTTPS hosting. Environment variables are compiled into this Vite build: changing a frontend setting requires rebuilding. Anonymous login does not need an email redirect URL.

1. Create a real event room on the **deployed URL**.
2. Enter a recognizable meeting point and create your own profile.
3. Display the room’s QR code. It uses the current website’s origin, so use the public deployment rather than localhost.
4. Test with one real phone before inviting the room.
5. Keep the organizer’s browser session to retain ownership.

Profiles and invitations are stored in Supabase; no email, phone number, external event link, or contact details are collected. This is an event MVP: it does not include account recovery, push notifications while the browser is closed, or verified physical attendance.
