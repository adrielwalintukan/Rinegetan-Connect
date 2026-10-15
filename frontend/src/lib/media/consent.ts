import type { SupabaseClient } from "@supabase/supabase-js";

export const CONSENT_STATUSES = ["pending", "approved", "rejected", "revoked"] as const;
export type ConsentStatusInput = (typeof CONSENT_STATUSES)[number];

export const isConsentStatus = (value: unknown): value is ConsentStatusInput =>
  typeof value === "string" && (CONSENT_STATUSES as readonly string[]).includes(value);

/**
 * Records consent evidence first, then applies it to the photo. If the evidence cannot be
 * written, the photo keeps its previous consent (never "approved" without a record).
 */
export async function recordConsent(
  client: SupabaseClient,
  asset: { id: string; subject_age_group: string },
  consentStatus: ConsentStatusInput,
  userId: string,
) {
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
    })
    .eq("id", asset.id)
    .select()
    .single();
}
