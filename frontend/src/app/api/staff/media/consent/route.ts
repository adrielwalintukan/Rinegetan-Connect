import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { publicErrorMessage } from "@/lib/api/errors";
import { isConsentStatus, recordConsent } from "@/lib/media/consent";
import { triggerPublicRevalidation } from "@/lib/public/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, consent_status: consentStatus } = body ?? {};
    if (typeof id !== "string" || !isConsentStatus(consentStatus)) {
      return Response.json({ error: "validation_error", message: "Status izin tidak valid." }, { status: 400 });
    }

    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);

    const { data: asset, error: assetError } = await client
      .from("media_assets")
      .select("id, subject_age_group, status")
      .eq("id", id)
      .single();
    if (assetError || !asset) {
      return Response.json({ error: "not_found", message: "Foto tidak ditemukan." }, { status: 404 });
    }

    const { data: updated, error } = await recordConsent(client, asset, consentStatus, staff.user.id);
    if (error || !updated) {
      console.error("media consent update failed:", error);
      return Response.json({ error: "consent_failed", message: publicErrorMessage(error) }, { status: 500 });
    }

    await Promise.all([
      triggerPublicRevalidation("media_assets"),
      triggerPublicRevalidation("site_section_media"),
    ]);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return Response.json(
        { error: error.code, message: "Sesi Anda berakhir atau akun tidak memiliki akses staf." },
        { status: error.code === "not_authenticated" ? 401 : 403 }
      );
    }
    console.error("media consent failed:", error);
    return Response.json({ error: "server_error", message: publicErrorMessage(error) }, { status: 500 });
  }
}
