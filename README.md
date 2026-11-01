# BLEAT Service & Warranty Portal

Phase 1 covers the buyer side (requirements 1–10 and 15), the database schema for all phases, and the congratulations email.
Phase 2 adds the staff portal (web/staff.html): admin and service engineer login, registrations, complaints, staff accounts and multilingual UI.

## Structure

```
db/schema.sql           D1 (SQLite) schema for all phases
db/seed.sql             Initial dropdown values (category, place of purchase)
src/index.js            Cloudflare Worker API
wrangler.toml           Worker config
web/index.html          Buyer portal (static, deploy to Cloudflare Pages)
web/staff.html          Staff portal for admins and service engineers (Pages)
web/i18n.js             Translations: English, Hindi, Tamil, Telugu, Malayalam, Bengali, Kannada, Marathi, Gujarati, Punjabi, Odia, Assamese
src/staff.js            Staff API (login, registrations, complaints, comments, reopen, accounts)
tools/create-admin.js   Creates the first admin locally; the password never leaves your computer
db/migrations_003_staff.sql  Phase 2 migration (already applied to the live database)
apps-script/Code.gs     Google Apps Script mailer (sends from Contact@bleatconnect.com)
```

## Architecture

- **Portal:** `service.bleatconnect.in`, Cloudflare Pages serving `web/`
- **API:** `api.bleatconnect.in`, Cloudflare Worker serving `src/index.js`
- **Database:** Cloudflare D1 (SQLite)
- **Login:** Google Identity Services. The Worker verifies the ID token with Google and sets an HttpOnly session cookie.
- **Email:** the Worker calls the Apps Script web app after each product registration. Apps Script sends through Gmail.

## Deploy steps

1. **Create the database**
   ```bash
   npx wrangler d1 create bleat-service
   ```
   Paste the returned `database_id` into `wrangler.toml`, then apply the schema and seed:
   ```bash
   npx wrangler d1 execute bleat-service --remote --file=db/schema.sql
   npx wrangler d1 execute bleat-service --remote --file=db/seed.sql
   ```

2. **Google sign-in**
   In Google Cloud Console, create an OAuth client ID (type: Web application).
   - Authorized JavaScript origin: `https://service.bleatconnect.in`
   - Put the client ID in `wrangler.toml` (`GOOGLE_CLIENT_ID`) and in `web/index.html` (`GOOGLE_CLIENT_ID`).

3. **Apps Script mailer**
   - Create a project at script.google.com and paste `apps-script/Code.gs`.
   - Project Settings > Script properties: add `SHARED_SECRET` with a long random value.
   - Deploy > New deployment > Web app. Execute as: **Me**. Who has access: **Anyone**. Copy the URL into `wrangler.toml` (`APPS_SCRIPT_URL`).
   - In the Gmail account that owns Contact@bleatconnect.com: Settings > Accounts and Import > Send mail as > add `Contact@bleatconnect.com` and verify it. Without this, the `from` header is rejected.
   - Upload the header image to `service.bleatconnect.in/email-banner.png` (or change `BANNER_URL`).

4. **Worker secret and deploy**
   ```bash
   npx wrangler secret put APPS_SCRIPT_SECRET     # same value as SHARED_SECRET
   npx wrangler deploy
   ```
   Attach `api.bleatconnect.in` to the Worker as a custom domain.

5. **Frontend**
   Create a Cloudflare Pages project from the `web/` folder and attach `service.bleatconnect.in`.
   Both domains must be under `bleatconnect.in`, because the session cookie is `SameSite=Lax`.

## Business rules implemented

| Rule | Where |
|---|---|
| Mandatory profile: name, email, phone, address line 1, city, state, country, postal code | `parseProfile` (server) and form (client) |
| Product registration only after profile and privacy consent are complete | `requireCompleteProfile` |
| Category and place of purchase come from `dropdown_options`; default category is Dashcamera | `dropdowns`, `optionExists` |
| "Offline Dealer" requires a dealer name; other places clear it | `createProduct` |
| Serial number must be unique (case-insensitive), so one device cannot be registered twice | `serial_norm UNIQUE` |
| Congratulations email sent after registration, subject "Congratulations for Registration of Product", from Contact@bleatconnect.com | `sendRegistrationEmail` + `Code.gs` |
| Tickets only for products the buyer owns; ticket numbers `BLT000001`… | `createTicket` |
| Warranty T&C shown on every request; must be accepted before submitting | `createTicket` + `web/index.html` |
| Status values: `pending_engineer`, `pending_buyer`, `closed` | schema CHECK constraint |

## Open items for phase 2

- Engineer and admin logins (username + password). The schema uses a username because two engineers can share a name.
- Comments thread between buyer and engineer, with status changes.
- Pickup and return shipments with courier and AWB fields.
- Admin editing of dropdown lists.
- Email for the ticket (currently only the registration email is sent).

## Phase 2 deploy steps

1. **Database:** existing database is already migrated. A fresh install gets the columns from `db/schema.sql`.
2. **First admin** (run on your own computer, so the password is never typed into chat):
   ```bash
   node tools/create-admin.js
   npx wrangler d1 execute bleat-service --remote --file=tools/first-admin.sql
   ```
   Then delete `tools/first-admin.sql`. Further admins and engineers are created on the Staff accounts page.
3. **Worker:** `npx wrangler deploy`
4. **Apps Script:** paste the updated `apps-script/Code.gs` into the Mail_Relay project, then Deploy > Manage deployments > edit > New version. Keep the same URL.
5. **Pages:** `npx wrangler pages deploy web --project-name service-portal --branch main`
6. Open `https://service.bleatconnect.in/staff.html`.

Engineers sign in with their username. Admins sign in with their email ID.
Translations are machine-drafted. Have a native speaker review each language before launch.

## WhatsApp OTP sign-in (buyers)

Buyers can sign in with Google or with a 6-digit code sent on WhatsApp (Meta WhatsApp Cloud API).

One-time setup:

1. In Meta Business Manager (WhatsApp Manager), create an **Authentication** template named `bleat_login_otp`,
   language `en`. Meta fixes the body text ("{{1}} is your verification code."), so use that. Add the
   security recommendation and a 5-minute expiry, and a single **Copy code** button (OTP type). Submit and wait for approval.
2. Set the Worker secrets (never commit these):
   - `npx wrangler secret put WHATSAPP_ACCESS_TOKEN` (permanent system-user token)
   - `npx wrangler secret put OTP_PEPPER` (any long random string; it salts the code hashes)
3. In `wrangler.toml`, set `WHATSAPP_PHONE_NUMBER_ID` to the sender's phone number ID.
4. Apply `db/migrations_007_otp.sql` to the D1 database.

Rules:
- A code is valid for 5 minutes, works once, and allows 5 wrong tries.
- At most 3 codes per number in 10 minutes, and 10 per IP per hour.
- A code signs in to the account with that phone number only if the number was entered by staff
  (migrated or staff-created) or was already proven by an earlier OTP. Numbers typed into a buyer's
  own profile are not trusted for this.
- A Google sign-in claims a staff-created or migrated account whose email matches the Google email.
