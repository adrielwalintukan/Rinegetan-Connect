/** @type {ReadonlyArray<"pending" | "approved" | "rejected" | "revoked">} */
export const CONSENT_STATUSES = ["pending", "approved", "rejected", "revoked"];

/** @param {unknown} value @returns {value is "pending" | "approved" | "rejected" | "revoked"} */
export const isConsentStatus = (value) =>
  typeof value === "string" && CONSENT_STATUSES.includes(value);

/**
 * Write the evidence first; revoked consent and unpublishing must share one UPDATE
 * so the child-consent constraint never observes a published, unapproved child photo.
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 * @param {{id: string, subject_age_group: string, status?: string}} asset
 * @param {"pending" | "approved" | "rejected" | "revoked"} consentStatus
 * @param {string} userId
 */
export async function recordConsent(client, asset, consentStatus, userId) {
  const { error: recordError } = await client.from("consent_records").insert({
    asset_id: asset.id,
    consent_status: consentStatus,
    subject_age_group: asset.subject_age_group,
    recorded_by: userId,
  });
  if (recordError) return { data: null, error: recordError };

  return client
    .from("media_assets")
    .update({
      consent_status: consentStatus,
      consent_recorded_at: new Date().toISOString(),
      consent_recorded_by: userId,
      ...(consentStatus !== "approved" && asset.status === "published" ? { status: "draft" } : {}),
    })
    .eq("id", asset.id)
    .select()
    .single();
}
