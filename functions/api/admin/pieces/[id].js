// POST   /api/admin/pieces/<id> -> edit a design (multipart). "order" = photo order, e.g. "n:0,k:<id>" (see lib/store.js).
// DELETE /api/admin/pieces/<id> -> remove a design and its photos
import { json, loadPieces, savePieces, loadCollections, readFields, savePhotos, deletePhotos,
  MAX_PHOTOS, UserError, photoOrder } from "../../../../lib/store.js";

export async function onRequestPost({ request, env, params }) {
  const list = await loadPieces(env);
  const i = list.findIndex((p) => p.id === params.id);
  if (i < 0) return json({ ok: false, error: "That design was already removed." }, 404);
  const fd = await request.formData();
  const fields = readFields(fd, await loadCollections(env));
  const old = list[i].photos;
  const kept = String(fd.get("order") || "").split(",").filter((t) => t.startsWith("k:") && old.includes(t.slice(2)));
  if (kept.length + fd.getAll("photo").length > MAX_PHOTOS) throw new UserError(`Up to ${MAX_PHOTOS} photos per design.`);
  const photos = photoOrder(fd, old, await savePhotos(env, fd));
  if (!photos.length) throw new UserError("A design needs at least one photo.");
  list[i] = { ...list[i], ...fields, photos, updated: new Date().toISOString() };
  await savePieces(env, list);
  await deletePhotos(env, old.filter((id) => !photos.includes(id)));
  return json({ ok: true, piece: list[i] });
}

export async function onRequestDelete({ env, params }) {
  const list = await loadPieces(env);
  const piece = list.find((p) => p.id === params.id);
  if (!piece) return json({ ok: true });
  await savePieces(env, list.filter((p) => p.id !== params.id));
  await deletePhotos(env, piece.photos);
  return json({ ok: true });
}
