// GET /photos/<photoId>.jpg (full) or /photos/<photoId>-th.jpg (thumbnail)
// Photo ids never change (an edit makes a new id), so they cache for a year.
export async function onRequestGet({ params, env }) {
  const m = /^([a-z0-9]{10})(-th)?\.jpg$/.exec(params.key || "");
  if (!m || !env.WORK) return new Response("Not found", { status: 404 });
  const { value, metadata } = await env.WORK.getWithMetadata((m[2] ? "th:" : "img:") + m[1], "arrayBuffer");
  if (!value) return new Response("Not found", { status: 404 });
  return new Response(value, {
    headers: { "Content-Type": metadata?.type || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
