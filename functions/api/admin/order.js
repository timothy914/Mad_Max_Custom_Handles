// POST /api/admin/order  { ids: [...] } -> new display order for designs
import { json, loadPieces, savePieces } from "../../../lib/store.js";

export async function onRequestPost({ request, env }) {
  const { ids } = await request.json().catch(() => ({}));
  const list = await loadPieces(env);
  if (!Array.isArray(ids)) return json({ ok: false, error: "Bad order." }, 400);
  const pos = new Map(ids.map((id, n) => [id, n]));
  list.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
  await savePieces(env, list);
  return json({ ok: true });
}
