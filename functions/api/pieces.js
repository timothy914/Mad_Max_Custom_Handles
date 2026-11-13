// GET /api/pieces — collections and designs, in display order (public).
import { json, loadPieces, loadCollections, publicPiece } from "../../lib/store.js";

export async function onRequestGet({ env }) {
  try {
    const [pieces, collections] = await Promise.all([loadPieces(env), loadCollections(env)]);
    return json({ ok: true, collections, pieces: pieces.map(publicPiece) }, 200, { "Cache-Control": "public, max-age=30" });
  } catch (e) {
    console.error(e);
    return json({ ok: false, collections: [], pieces: [] }, 500);
  }
}
