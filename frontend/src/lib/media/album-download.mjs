import { UserFacingError } from "../api/errors.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** @param {unknown} value @returns {{albumId: string, enabled: boolean}} */
export function parseAlbumDownloadPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !("albumId" in value) || typeof value.albumId !== "string" || !UUID_PATTERN.test(value.albumId) ||
      !("enabled" in value) || typeof value.enabled !== "boolean") {
    throw new UserFacingError("ID album dan pilihan izin unduhan tidak valid.");
  }
  return { albumId: value.albumId, enabled: value.enabled };
}

/**
 * The session client keeps RLS authoritative; the database trigger records the permission change.
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 * @param {{albumId: string, enabled: boolean}} payload
 * @param {string} userId
 */
export function setAlbumDownloadEnabled(client, payload, userId) {
  return client.from("media_albums")
    .update({ public_download_enabled: payload.enabled, updated_by: userId })
    .eq("id", payload.albumId)
    .select()
    .single();
}
