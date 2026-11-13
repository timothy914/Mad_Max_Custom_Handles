// POST /api/admin/collections  { collections: [{ id?, name }] } -> replaces the list (order = filter order).
// Designs in a removed collection move to "Uncategorized"; they are not deleted.
import { json, loadPieces, savePieces, saveCollections, loadCollections, oneLine, newId } from "../../../lib/store.js";

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.collections)) return json({ ok: false, error: "Bad list." }, 400);
  const old = await loadCollections(env);
  const seen = new Set();
  const next = [];
  for (const c of body.collections.slice(0, 30)) {
    const name = oneLine(c?.name, 40);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    next.push({ id: old.some((o) => o.id === c.id) ? c.id : newId(), name });
  }
  await saveCollections(env, next);
  const ids = new Set(next.map((c) => c.id));
  const pieces = await loadPieces(env);
  if (pieces.some((p) => p.collection && !ids.has(p.collection))) {
    await savePieces(env, pieces.map((p) => (p.collection && !ids.has(p.collection) ? { ...p, collection: "" } : p)));
  }
  return json({ ok: true, collections: next });
}
