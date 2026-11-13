# Mad Max Custom Knife Handles website

Static site on Cloudflare Pages, with Pages Functions for the request form and a private admin page where Joseph adds his own designs.

- `site/` — pages and assets (Cloudflare Pages output directory, no build command). `site/admin/` is the admin page.
- `functions/api/request.js` — emails a custom handle request to Mad Max through Resend, blade photos attached, reply-to = customer
- `functions/api/pieces.js`, `functions/photos/[key].js` — public gallery data and photos
- `functions/api/admin/*` — add/edit/delete/sort designs and manage collections; every call checks the Cloudflare Access sign-in
- `lib/store.js` — shared storage and sign-in check
- `build.py` — edit the CONTENT block (phone, hours, Facebook link), then `python3 build.py`; `--preview` writes demo files to `preview/`

## How Joseph updates the site
Go to `/admin` → enter his email → type the code Cloudflare emails him → he's in (stays signed in for the session length set in Access).
- **Designs:** "+ Add a new design" → photos (up to 4, first is the cover), name, collection, blade type, price, status (Showcase / Available / Sold), "Show on the home page", description → "Add to the site". Live right away. Edit, delete, and up/down arrows to reorder.
- **Collections:** the filter buttons on The Work page (starts with Patriotic and Outdoors). Add, rename, reorder, remove. Removing one never deletes designs; they move to Uncategorized.
Until the first design is added, the site shows the "Photo coming soon" cards.

## Cloudflare setup
1. Pages project → Connect to Git → this repo. Output directory `site`, no build command. `functions/` at the repo root is picked up automatically.
2. Resend: add and verify the site's domain, create an API key.
3. Variables: `EMAIL_FROM` (e.g. `Mad Max Website <requests@yourdomain.com>`), `ALERT_EMAIL_TO=madmaxcustomknifehandles@gmail.com` (comma-separated for more than one)
4. Secrets: `RESEND_API_KEY`, optional `TURNSTILE_SECRET`
5. KV namespace `madmax-work`, bound as `WORK` (designs, collections, photos). Optional KV `REQUESTS`: form rate limit, duplicate protection, 90-day log.
6. Admin sign-in (Zero Trust, free plan):
   - Zero Trust → Settings → Authentication: One-time PIN is on by default.
   - Access → Applications → Add → Self-hosted. Domain: the site's domain, paths `admin` and `api/admin` (add both as destinations). Session: 1 month.
   - Policy "Owners": Allow, Include → Emails: Joseph's Gmail (and yours).
   - Copy the application's **AUD tag**.
   - Pages variables: `ACCESS_TEAM_DOMAIN` (e.g. `yourteam.cloudflareaccess.com`), `ACCESS_AUD` (the AUD tag), `ADMIN_EMAILS` (same emails, comma-separated).
   - The admin API checks the Access token itself as well, so it stays locked even if the Access rule is changed by mistake. Do not set `ACCESS_CERTS_URL` in production (local testing only).
   - Note: `*.pages.dev` preview URLs are not covered by an Access app on the custom domain; the admin API still refuses them (no valid token), so nothing is exposed.

The form reports success only after the email is accepted by Resend; otherwise it tells the visitor to call 717-916-0074. The Gmail app on Joseph's phone gives the instant phone alert.

## Before launch
- [ ] Facebook group link (`FACEBOOK_URL` in build.py)
- [ ] Final domain (`SITE_URL`) and `EMAIL_FROM`
- [ ] Confirm "Three steps" wording with Joseph
- [ ] Swap in real handle photos
