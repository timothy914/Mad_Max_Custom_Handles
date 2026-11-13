// POST /api/request — custom handle request from the Contact page (multipart form).
// 1) validate  2) log to KV (optional)  3) email Mad Max through Resend, photos attached, reply-to = customer
//
// Settings (Cloudflare Pages > Settings > Variables and Secrets):
//   RESEND_API_KEY   (secret)
//   EMAIL_FROM       e.g. "Mad Max Website <requests@madmaxcustomknifehandles.com>" (domain verified in Resend)
//   ALERT_EMAIL_TO   madmaxcustomknifehandles@gmail.com  (comma-separate to add more, e.g. a copy to Timothy)
//   TURNSTILE_SECRET (optional, enables bot check)
// Binding (optional): KV namespace REQUESTS — rate limiting, duplicate protection, 90-day log

const FAIL = "We couldn't send your request. Please call 717-916-0074 or email madmaxcustomknifehandles@gmail.com.";
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const clean = (v, max) => String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/\s+/g, " ");

function newRef() {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(5));
  return "MM-" + Array.from(b, (x) => a[x % a.length]).join("");
}

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token || "", remoteip: ip || "" }),
  });
  const j = await r.json().catch(() => ({}));
  return !!j.success;
}

export async function onRequestPost({ request, env }) {
  let fd;
  try { fd = await request.formData(); } catch { return json({ ok: false, error: FAIL }, 400); }

  if (fd.get("website")) return json({ ok: true, ref: newRef() }); // honeypot

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const kv = env.REQUESTS;

  const req = {
    name: oneLine(fd.get("name"), 80),
    email: oneLine(fd.get("email"), 120),
    phone: oneLine(fd.get("phone"), 20),
    material: oneLine(fd.get("material"), 120),
    message: clean(fd.get("message"), 2000),
  };
  if (!req.name || !req.message) return json({ ok: false, error: "Please fill in your name and message." }, 422);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) return json({ ok: false, error: "Please enter a valid email so we can reply." }, 422);

  // Photos
  const files = fd.getAll("photos").filter((f) => f && typeof f === "object" && f.size > 0).slice(0, MAX_PHOTOS);
  let total = 0;
  const attachments = [];
  for (const [i, f] of files.entries()) {
    if (f.size > MAX_PHOTO_BYTES) return json({ ok: false, error: "One of the photos is too large. Please send photos under 8 MB." }, 413);
    total += f.size;
    if (total > MAX_TOTAL_BYTES) return json({ ok: false, error: "The photos are too large together. Please send fewer photos." }, 413);
    const safe = oneLine(f.name, 60).replace(/[^\w.\- ]/g, "") || `photo-${i + 1}.jpg`;
    attachments.push({ filename: safe, content: b64(await f.arrayBuffer()) });
  }

  if (!(await turnstileOk(env, fd.get("cf-turnstile-response"), ip))) return json({ ok: false, error: FAIL }, 403);

  if (kv && ip) { // 5 requests per hour per visitor
    const key = "rl:" + ip;
    const n = parseInt((await kv.get(key)) || "0", 10);
    if (n >= 5) return json({ ok: false, error: FAIL }, 429);
    await kv.put(key, String(n + 1), { expirationTtl: 3600 });
  }

  const rid = oneLine(fd.get("requestId"), 64);
  if (kv && rid) { // a retry of the same submission does not send a second email
    const prev = await kv.get("rid:" + rid);
    if (prev) return json({ ok: true, ref: prev });
  }

  const ref = newRef();
  const lines = [
    `New custom handle request (${ref})`, "",
    `Name: ${req.name}`, `Email: ${req.email}`, `Phone: ${req.phone || "not given"}`,
    `Handle material: ${req.material || "not given"}`,
    `Photos attached: ${attachments.length}`, "", "Message:", req.message, "",
    "Reply to this email to answer the customer directly.",
  ];

  if (!env.RESEND_API_KEY) { console.error("RESEND_API_KEY missing"); return json({ ok: false, error: FAIL }, 500); }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: String(env.ALERT_EMAIL_TO || "").split(",").map((s) => s.trim()).filter(Boolean),
      reply_to: req.email,
      subject: `Handle request from ${req.name} (${ref})`,
      text: lines.join("\n"),
      attachments,
    }),
  });
  if (!r.ok) {
    console.error("resend", r.status, await r.text().catch(() => ""));
    return json({ ok: false, error: FAIL }, 502);
  }

  if (kv) {
    await kv.put("req:" + ref, JSON.stringify({ ref, at: new Date().toISOString(), ...req, photos: attachments.length }),
      { expirationTtl: 90 * 86400 });
    if (rid) await kv.put("rid:" + rid, ref, { expirationTtl: 86400 });
  }
  return json({ ok: true, ref });
}

