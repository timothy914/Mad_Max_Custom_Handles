# Mad Max Custom Knife Handles website

Static site plus one Cloudflare Pages Function for the custom handle request form.

- `site/` — pages and assets (Cloudflare Pages output directory, no build command)
- `functions/api/request.js` — validates the request and emails it to Mad Max through Resend, with the customer's blade photos attached and reply-to set to the customer
- `build.py` — edit the CONTENT block (phone, hours, Facebook link, projects), then `python3 build.py` to regenerate `site/*.html`, or `python3 build.py --preview` for a single-file preview

## Adding work photos
Put photos in `site/assets/work/` (landscape, about 1200x900, .webp or .jpg). In `build.py`, replace a `PROJECTS` entry's name and set its photo file name, e.g.
`("Drop point hunter", "Fixed blade", "Paper micarta", "drop-point-hunter.webp", "drop")`, then rebuild.

## Cloudflare setup
1. Pages project → Connect to Git → this repo. Output directory `site`, no build command. `functions/` at the repo root is picked up automatically.
2. Resend: add and verify the site's domain, create an API key.
3. Variables: `EMAIL_FROM` (e.g. `Mad Max Website <requests@yourdomain.com>`), `ALERT_EMAIL_TO=madmaxcustomknifehandles@gmail.com` (comma-separated for more than one)
4. Secrets: `RESEND_API_KEY`, optional `TURNSTILE_SECRET`
5. Optional KV namespace bound as `REQUESTS`: rate limit (5/hour per visitor), duplicate protection, 90-day request log.

The form reports success only after the email is accepted by Resend; otherwise it tells the visitor to call 717-916-0074. The Gmail app on Joseph's phone gives the instant phone alert.

## Before launch
- [ ] Facebook group link (`FACEBOOK_URL` in build.py)
- [ ] Final domain (`SITE_URL`) and `EMAIL_FROM`
- [ ] Confirm "Three steps" wording with Joseph
- [ ] Swap in real handle photos
