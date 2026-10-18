import { assertCanDeletePermanently, SUPPORTED_ENTITIES, validateDeletePayload } from "./content-mutations.mjs";
import { UserFacingError } from "../api/errors.mjs";

const CLEANUP_WARNING = "Data foto sudah dihapus, tetapi file di penyimpanan belum berhasil dibersihkan. Hubungi Admin untuk menindaklanjuti pembersihan Storage.";

/**
 * Delete the row first so a failed FK/RLS check cannot destroy a file still in use.
 * Storage is a separate service: a cleanup failure must remain visible to the operator.
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 * @param {{role: string, entityType: string, id: string, reason: string}} params
 * @returns {Promise<{success: boolean, deletedId: string, warning?: string}>}
 */
export async function executePermanentDelete(client, params) {
  assertCanDeletePermanently(params.role);
  if (!SUPPORTED_ENTITIES.includes(params.entityType)) {
    throw new UserFacingError(`Entitas tidak valid: ${params.entityType}`);
  }
  const validation = validateDeletePayload(params.reason);
  if (!validation.valid) throw new UserFacingError(validation.message || "Alasan penghapusan tidak valid");

  try {
    await client.rpc("set_audit_reason", { p_reason: validation.reason });
  } catch {
    // The database trigger still records the deletion if the optional reason RPC is unavailable.
  }

  const { data: deleted, error } = await client
    .from(params.entityType)
    .delete()
    .eq("id", params.id)
    .select(params.entityType === "media_assets" ? "id, storage_path" : "id")
    .single();
  if (error) throw error;
  if (!deleted) throw new UserFacingError("Data tidak ditemukan atau sudah dihapus.");

  const result = { success: true, deletedId: params.id };
  if (params.entityType !== "media_assets") return result;

  const path = deleted.storage_path;
  const safePath = typeof path === "string" && path.startsWith("derivatives/") &&
    !path.split("/").some((part) => part === ".." || part === "." || part === "");
  if (safePath) {
    try {
      const { error: cleanupError } = await client.storage.from("media").remove([path]);
      if (!cleanupError) return result;
    } catch {
      // Metadata is already deleted; report pending cleanup instead of a false total failure.
    }
  }
  console.error("Media Storage cleanup pending:", { assetId: params.id, storagePath: path });
  return { ...result, warning: CLEANUP_WARNING };
}
