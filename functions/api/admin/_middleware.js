// Every /api/admin/* request must come through Cloudflare Access from an allowed email.
import { adminEmail, json, UserError } from "../../../lib/store.js";

export async function onRequest(ctx) {
  const email = await adminEmail(ctx.request, ctx.env).catch(() => null);
  if (!email) return json({ ok: false, error: "Please sign in again." }, 401);
  ctx.data.email = email;
  try {
    return await ctx.next();
  } catch (e) {
    if (e instanceof UserError) return json({ ok: false, error: e.message }, 422);
    console.error(e);
    if (/binding missing/.test(e.message)) return json({ ok: false, error: "Setup issue: the site's storage (WORK) isn't connected. Add the WORK binding in Cloudflare and redeploy." }, 500);
    return json({ ok: false, error: "Something went wrong. Please try again." }, 500);
  }
}
