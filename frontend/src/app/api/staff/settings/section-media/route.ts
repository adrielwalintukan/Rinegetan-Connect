import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { triggerPublicRevalidation } from "@/lib/public/queries";

const VALID_SECTIONS = [
  "home_hero",
  "home_welcome",
  "sekolah_sabat",
  "tentang_kami",
];

export async function POST(request: Request) {
  try {
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);

    // Only Editor and Admin can mutate
    if (staff.role !== "admin" && staff.role !== "editor") {
      return Response.json(
        { error: "forbidden", message: "Hanya Editor dan Admin yang diizinkan." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { section_key, asset_id, custom_alt_text, custom_caption, reset } = body;

    if (!section_key || !VALID_SECTIONS.includes(section_key)) {
      return Response.json(
        { error: "invalid_section", message: "Seksi halaman tidak valid." },
        { status: 400 }
      );
    }

    if (reset) {
      // Delete custom assignment to revert to default
      const { error: deleteErr } = await client
        .from("site_section_media")
        .delete()
        .eq("section_key", section_key);

      if (deleteErr) {
        return Response.json(
          { error: "database_error", message: deleteErr.message },
          { status: 500 }
        );
      }

      await triggerPublicRevalidation("site_section_media");
      return Response.json({
        success: true,
        message: "Seksi berhasil dikembalikan ke pengaturan bawaan.",
      });
    }

    if (!asset_id) {
      return Response.json(
        { error: "missing_asset", message: "ID foto wajib disertakan." },
        { status: 400 }
      );
    }

    // Verify asset exists, is published, and consent is approved
    const { data: asset, error: assetErr } = await client
      .from("media_assets")
      .select("id, status, consent_status, hidden_at")
      .eq("id", asset_id)
      .single();

    if (assetErr || !asset) {
      return Response.json(
        { error: "asset_not_found", message: "Foto tidak ditemukan." },
        { status: 404 }
      );
    }

    if (
      asset.status !== "published" ||
      asset.consent_status !== "approved" ||
      asset.hidden_at
    ) {
      return Response.json(
        {
          error: "asset_not_eligible",
          message:
            "Foto belum diterbitkan atau belum memiliki persetujuan izin (consent).",
        },
        { status: 400 }
      );
    }

    // Upsert into site_section_media
    const { data: updatedData, error: upsertErr } = await client
      .from("site_section_media")
      .upsert({
        section_key,
        asset_id,
        custom_alt_text: custom_alt_text?.trim() || null,
        custom_caption: custom_caption?.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: staff.authUserId,
      })
      .select()
      .single();

    if (upsertErr) {
      return Response.json(
        {
          error: "database_error",
          message: "Gagal menyimpan konfigurasi seksi: " + upsertErr.message,
        },
        { status: 500 }
      );
    }

    await triggerPublicRevalidation("site_section_media");

    return Response.json({
      success: true,
      data: updatedData,
      message: "Gambar seksi halaman berhasil diperbarui.",
    });
  } catch (err: unknown) {
    if (err instanceof StaffAccessError) {
      return Response.json(
        { error: err.code, message: err.message },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return Response.json({ error: "server_error", message }, { status: 500 });
  }
}
