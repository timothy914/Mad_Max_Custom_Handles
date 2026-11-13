// GET  /api/admin/pieces -> everything the admin page needs
// POST /api/admin/pieces -> add a design (multipart form)
import { json, loadPieces, savePieces, loadCollections, readFields, savePhotos, newId,
  BLADE_TYPES, STATUSES, MAX_PHOTOS, UserError, photoOrder } from "../../../lib/store.js";

export async function onRequestGet({ env, data }) {
  const [pieces, collections] = await Promise.all([loadPieces(env), loadCollections(env)]);
  return json({ ok: true, email: data.email, pieces, collections, bladeTypes: BLADE_TYPES, statuses: STATUSES, maxPhotos: MAX_PHOTOS });
}

export async function onRequestPost({ request, env }) {
  const fd = await request.formData();
  const collections = await loadCollections(env);
  const fields = readFields(fd, collections);
  if (fd.getAll("photo").length > MAX_PHOTOS) throw new UserError(`Up to ${MAX_PHOTOS} photos per design.`);
  const photos = photoOrder(fd, [], await savePhotos(env, fd));
  if (!photos.length) throw new UserError("Add at least one photo.");
  const piece = { id: newId(), ...fields, photos, created: new Date().toISOString() };
  const list = await loadPieces(env);
  list.unshift(piece); // newest first
  await savePieces(env, list);
  return json({ ok: true, piece });
}
