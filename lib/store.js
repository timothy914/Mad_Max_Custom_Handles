// Shared storage for the handle gallery.
// KV namespace bound as WORK:
//   "pieces"        -> JSON array of designs (array order = display order)
//   "collections"   -> JSON array of { id, name } (array order = filter order)
//   "img:<photoId>" -> full photo (max 1600px JPEG)
//   "th:<photoId>"  -> thumbnail (max 640px JPEG)

export const BLADE_TYPES = ["Fixed blade", "Folding", "Kitchen", "Hunting / skinning", "Other"];
export const STATUSES = ["Showcase", "Available", "Sold"];
export const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const DEFAULT_COLLECTIONS = ["Patriotic", "Outdoors"];

export class UserError extends Error {}

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

export const clean = (v, max) =>
  String(v ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, max);
export const oneLine = (v, max) => clean(v, max).replace(/\s+/g, " ");

export const newId = () => {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (x) => a[x % a.length]).join("");
};

function kv(env) {
  if (!env.WORK) throw new Error("WORK KV binding missing");
  return env.WORK;
}

export async function loadPieces(env) { return (await kv(env).get("pieces", "json")) || []; }
export const savePieces = (env, list) => kv(env).put("pieces", JSON.stringify(list));

export async function loadCollections(env) {
  let list = await kv(env).get("collections", "json");
  if (!list) { // first run: start with the two the client asked about
    list = DEFAULT_COLLECTIONS.map((name) => ({ id: newId(), name }));
    await saveCollections(env, list);
  }
  return list;
}
export const saveCollections = (env, list) => kv(env).put("collections", JSON.stringify(list));

// What visitors see.
export const publicPiece = (p) => ({
  id: p.id, name: p.name, collection: p.collection, blade: p.blade, material: p.material,
  price: p.price, status: p.status, featured: p.featured, desc: p.desc, photos: p.photos,
});

// Text fields of the add/edit form.
export function readFields(fd, collections) {
  const col = String(fd.get("collection") || "");
  const f = {
    name: oneLine(fd.get("name"), 80),
    collection: collections.some((c) => c.id === col) ? col : "",
    blade: BLADE_TYPES.includes(fd.get("blade")) ? fd.get("blade") : "",
    material: oneLine(fd.get("material"), 60) || "Paper micarta",
    price: oneLine(fd.get("price"), 30),
    status: STATUSES.includes(fd.get("status")) ? fd.get("status") : "Showcase",
    featured: ["on", "true", "1"].includes(String(fd.get("featured"))),
    desc: clean(fd.get("desc"), 1200),
  };
  if (!f.name) throw new UserError("Give the design a name.");
  return f;
}

// New photos arrive as pairs of fields: "photo" (full) and "thumb" (small), in the same order.
export async function savePhotos(env, fd) {
  const full = fd.getAll("photo").filter((f) => f && typeof f === "object" && f.size > 0);
  const thumbs = fd.getAll("thumb").filter((f) => f && typeof f === "object" && f.size > 0);
  const ids = [];
  for (let i = 0; i < full.length; i++) {
    const f = full[i], t = thumbs[i] || f;
    if (f.size > MAX_PHOTO_BYTES || t.size > MAX_PHOTO_BYTES) throw new UserError("That photo is too large. Try a smaller one.");
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new UserError("Photos must be JPG, PNG or WebP.");
    const id = newId();
    await kv(env).put("img:" + id, await f.arrayBuffer(), { metadata: { type: f.type } });
    await kv(env).put("th:" + id, await t.arrayBuffer(), { metadata: { type: t.type || f.type } });
    ids.push(id);
  }
  return ids;
}

// "order" field from the admin page: e.g. "n:0,k:abc123,n:1" (n = new upload by index, k = existing photo id).
export function photoOrder(fd, existing, fresh) {
  const out = [];
  for (const t of String(fd.get("order") || "").split(",")) {
    const id = t.startsWith("n:") ? fresh[Number(t.slice(2))] : t.startsWith("k:") && existing.includes(t.slice(2)) ? t.slice(2) : null;
    if (id && !out.includes(id)) out.push(id);
  }
  for (const id of fresh) if (!out.includes(id)) out.push(id); // never lose an upload
  return out;
}

export async function deletePhotos(env, ids) {
  for (const id of ids) {
    await kv(env).delete("img:" + id);
    await kv(env).delete("th:" + id);
  }
}

// ---- Cloudflare Access check for /api/admin/* ----
// Cloudflare Access (Zero Trust) puts a signed token on every request it lets through.
// We verify it here too, so the admin API is safe even if the Access rule is ever misconfigured.
// Settings: ACCESS_TEAM_DOMAIN (e.g. "spigelmeyer.cloudflareaccess.com"), ACCESS_AUD (the app's AUD tag),
//           ADMIN_EMAILS (comma-separated, e.g. "madmaxcustomknifehandles@gmail.com,timothy@...")
let certCache = { at: 0, keys: [] };

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

export async function adminEmail(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion") || "";
  const [h, p, s] = token.split(".");
  if (!h || !p || !s || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  let header, payload;
  try {
    header = JSON.parse(new TextDecoder().decode(b64url(h)));
    payload = JSON.parse(new TextDecoder().decode(b64url(p)));
  } catch { return null; }
  if (Date.now() - certCache.at > 3600e3) {
    const r = await fetch(env.ACCESS_CERTS_URL || `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`); // override is for local testing only
    certCache = { at: Date.now(), keys: (await r.json()).keys || [] };
  }
  const jwk = certCache.keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(s), new TextEncoder().encode(h + "." + p));
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!ok || !aud.includes(env.ACCESS_AUD) || payload.exp * 1000 < Date.now()) return null;
  const email = String(payload.email || "").toLowerCase();
  const allowed = String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
  return allowed.length && !allowed.includes(email) ? null : email || null;
}
