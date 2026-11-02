# MissedConnection

Event rooms that help people at networking events find the right person to talk to first.

- **Organizers need an account.** They create a room, share its QR code, and get an admin view: everyone who joined (email, company, role, intent, skills), who invited whom and how it ended, and a CSV export.
- **Participants don't need one.** Scanning the QR code opens a gate: *Log in or sign up* (profile pre-filled next time) or *Continue as guest*. People looking for work provide their target role instead of a company/current role; other attendees can add their company and role.
- **Matching** ranks the room by intent first (hiring and looking for work rank highest, scored on how well the job seeker's skills cover what the hirer is searching for), then complementary and shared skills. Related skills count (React and Frontend), people at your own company rank lower, and each match gets a plain-language reason and a tailored icebreaker.
- Accepted introductions show the meeting point. Confirming “We met” requires sending a private contact card with a prefilled email, preferred contact mode, contact details, and an optional message.
- The Inbox combines meeting requests and realtime “Contact me” cards, with an unread count on the tab.
- Meeting requests can include a short note and up to six additional attendees, followed by a clear success screen that returns the sender to their dashboard.

## Local development

```sh
npm install
npm run dev
```

Without Supabase credentials, use **Explore local demo**. Demo attendees are fictional and invitations do not send. Live rooms require Supabase.

## Supabase setup

1. Run `supabase/rooms.sql` in the Supabase SQL Editor. It is rerunnable, upgrades an existing project in place, and leaves the original `attendees` table intact.
2. Under Authentication → Sign In / Providers, keep **Email** enabled (organizer and participant accounts) and enable **Allow anonymous sign-ins** (guest mode). For quick testing, turn off **Confirm email**; otherwise new accounts must confirm their email before logging in.
3. Set the browser-safe values in `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_ENABLE_SEMANTIC_MATCHING=false
```

4. Restart the dev server. Create a room, introduce yourself, and open its invitation in an incognito browser to test a second participant.

Guest sessions belong to a browser. Clearing its data or changing devices loses access to that guest identity; accounts work on any device. Only non-anonymous accounts can create rooms (enforced by row-level security, not just the UI). Emails live in `member_contacts`, readable only by their owner, the room organizer, and the other side of an accepted introduction. Contact cards live in `contact_cards` and are readable only by their sender and recipient. Room codes act as invitations; only share them with intended participants. Participants explicitly consent to discovery and can hide their profile or mark themselves unavailable. Only introduction participants and the room owner can read introductions; the organizer can see room metrics and profiles for their room.

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

The browser test uses two isolated sessions, including a mobile viewport. It creates a temporary organizer account, hosts a room, joins a guest through the QR gate, checks hiring and job-seeker matching, sends and accepts an invitation, confirms the meeting and the organizer's connection view, then removes its own records and users. Cleanup requires `SUPABASE_SERVICE_ROLE_KEY` in local `.env`. It must never be shipped to browsers. Screenshots are saved in ignored `test-results/`.

## Event launch

Deploy the `dist/` directory to public HTTPS hosting. Environment variables are compiled into this Vite build: changing a frontend setting requires rebuilding. If email confirmation is on, set the Auth Site URL to the deployed address.

1. Create a real event room on the **deployed URL**.
2. Enter a recognizable meeting point. Use **Join matching too** if you also want matches.
3. Display the room’s QR code (organizers log in first). It uses the current website’s origin, so use the public deployment rather than localhost.
4. Test with one real phone before inviting the room.
5. Log in on any device to get back to your organizer view.

Profiles and invitations are stored in Supabase; emails are collected, phone numbers are not. This is an event MVP: it does not include push notifications while the browser is closed, verified physical attendance, or upgrading a guest to an account.
