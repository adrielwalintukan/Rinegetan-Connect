import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { triggerPublicRevalidation } from "@/lib/public/queries";
import { publicErrorMessage } from "@/lib/api/errors";
import { recordConsent } from "@/lib/media/consent";

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
        console.error("section-media reset failed:", deleteErr);
        return Response.json(
          { error: "database_error", message: publicErrorMessage(deleteErr) },
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

    // Verify asset exists and is not hidden
    const { data: asset, error: assetErr } = await client
      .from("media_assets")
      .select("id, status, consent_status, hidden_at, subject_age_group")
      .eq("id", asset_id)
      .single();

    if (assetErr || !asset) {
      return Response.json(
        { error: "asset_not_found", message: "Foto tidak ditemukan." },
        { status: 404 }
      );
    }

    if (asset.hidden_at) {
      return Response.json(
        {
          error: "asset_not_eligible",
          message: "Foto telah disembunyikan (takedown) dan tidak dapat digunakan.",
        },
        { status: 400 }
      );
    }

    // Pastikan foto yang dijadikan banner publik memiliki persetujuan izin (consent) dan berstatus terbit (published)
    if (asset.consent_status !== "approved") {
      await recordConsent(client, asset, "approved", staff.user.id);
    }

    if (asset.status !== "published") {
      await client
        .from("media_assets")
        .update({ status: "published" })
        .eq("id", asset.id);
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
        updated_by: staff.user.id,
      })
      .select()
      .single();

    if (upsertErr) {
      console.error("section-media upsert failed:", upsertErr);
      return Response.json(
        {
          error: "database_error",
          message: `Gagal menyimpan gambar seksi. ${publicErrorMessage(upsertErr)}`,
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
      const status = err.code === "not_authenticated" ? 401 : 403;
      return Response.json(
        { error: err.code, message: "Sesi Anda berakhir atau akun tidak memiliki akses staf." },
        { status }
      );
    }
    console.error("section-media failed:", err);
    return Response.json({ error: "server_error", message: publicErrorMessage(err) }, { status: 500 });
  }
}

