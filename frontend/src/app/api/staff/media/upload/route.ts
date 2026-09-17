import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import {
  validateUploadGuardrails,
  getStorageQuotaMetrics,
  STORAGE_CAPACITY_BYTES,
} from "@/lib/media/guardrails";
import { createJpegDerivative } from "@/lib/media/derivative";

export async function POST(request: Request) {
  try {
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);

    // 1. Periksa penggunaan kuota penyimpanan saat ini
    const { data: usageData, error: usageError } = await client
      .from("media_assets")
      .select("bytes");

    if (usageError) {
      return Response.json(
        { error: "database_error", message: usageError.message },
        { status: 500 }
      );
    }

    const totalUsedBytes = (usageData || []).reduce(
      (acc, row) => acc + (Number(row.bytes) || 0),
      0
    );

    const currentQuota = getStorageQuotaMetrics(totalUsedBytes);

    // Jika telah mencapai ambang pembekuan (85%), tolak upload baru
    if (currentQuota.isFrozen) {
      return Response.json(
        {
          error: "storage_quota_frozen",
          message:
            "Kapasitas penyimpanan pilot telah mencapai batas pembekuan (85%). Upload foto baru tidak diizinkan.",
          quota: currentQuota,
        },
        { status: 400 }
      );
    }

    // 2. Parse form-data
    const formData = await request.formData();
    const file = formData.get("file");
    const altText = formData.get("alt_text");
    const caption = formData.get("caption");
    const subjectAgeGroup = formData.get("subject_age_group");
    const albumId = formData.get("album_id");

    if (!file || !(file instanceof Blob)) {
      return Response.json(
        { error: "missing_file", message: "File gambar wajib disertakan" },
        { status: 400 }
      );
    }

    if (
      !altText ||
      typeof altText !== "string" ||
      altText.trim().length === 0 ||
      altText.trim().length > 300
    ) {
      return Response.json(
        {
          error: "invalid_alt_text",
          message:
            "Teks alt wajib diisi secara deskriptif (1 s.d. 300 karakter)",
        },
        { status: 400 }
      );
    }

    // 3. Validasi guardrails upload
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const guardrailResult = await validateUploadGuardrails(
      fileBuffer,
      file.type,
      file.size
    );

    if (!guardrailResult.valid) {
      return Response.json(
        { error: guardrailResult.error, message: guardrailResult.message },
        { status: 400 }
      );
    }

    // 4. Konversi ke JPEG derivatif bersih (EXIF/GPS dibersihkan)
    const derivative = await createJpegDerivative(fileBuffer);

    // 5. Pastikan derivatif baru tidak melampaui hard cap kuota 1 GB
    if (totalUsedBytes + derivative.bytes > STORAGE_CAPACITY_BYTES) {
      return Response.json(
        {
          error: "storage_quota_exceeded",
          message:
            "Ukuran file derivatif akan melampaui kuota penyimpanan maksimal 1 GB.",
          quota: currentQuota,
        },
        { status: 400 }
      );
    }

    // 6. Unggah derivatif ke Supabase Storage (bucket 'media')
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const fileId = crypto.randomUUID();
    const storagePath = `derivatives/${year}/${month}/${fileId}.jpg`;

    const { error: uploadError } = await client.storage
      .from("media")
      .upload(storagePath, derivative.buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return Response.json(
        {
          error: "storage_upload_failed",
          message: "Gagal mengunggah gambar ke penyimpanan: " + uploadError.message,
        },
        { status: 500 }
      );
    }

    // 7. Catat record ke public.media_assets
    const { data: assetData, error: assetError } = await client
      .from("media_assets")
      .insert({
        storage_path: storagePath,
        mime_type: "image/jpeg",
        bytes: derivative.bytes,
        width: derivative.width,
        height: derivative.height,
        alt_text: altText.trim(),
        caption:
          typeof caption === "string" && caption.trim()
            ? caption.trim()
            : null,
        subject_age_group:
          subjectAgeGroup === "child" ? "child" : "general",
        processing_state: "ready",
        consent_status: "pending",
        status: "draft",
        created_by: staff.profile.id,
        updated_by: staff.profile.id,
      })
      .select()
      .single();

    if (assetError) {
      // Rollback file jika insert database gagal
      await client.storage.from("media").remove([storagePath]);
      return Response.json(
        {
          error: "database_insert_failed",
          message: "Gagal menyimpan metadata media: " + assetError.message,
        },
        { status: 500 }
      );
    }

    // 8. Relasikan dengan album jika album_id disertakan
    if (albumId && typeof albumId === "string") {
      await client.from("album_assets").insert({
        album_id: albumId,
        asset_id: assetData.id,
      });
    }

    // 9. Catat audit log mutasi
    await client.from("audit_logs").insert({
      actor_id: staff.profile.id,
      action: "media.upload",
      entity_type: "media_assets",
      entity_id: assetData.id,
      changes: {
        storage_path: storagePath,
        bytes: derivative.bytes,
        width: derivative.width,
        height: derivative.height,
        alt_text: altText.trim(),
        subject_age_group: assetData.subject_age_group,
        album_id: albumId || null,
      },
    });

    const updatedQuota = getStorageQuotaMetrics(totalUsedBytes + derivative.bytes);

    return Response.json(
      {
        success: true,
        data: assetData,
        quota: updatedQuota,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return Response.json(
        { error: error.code },
        { status: error.code === "not_authenticated" ? 401 : 403 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return Response.json({ error: message }, { status: 500 });
  }
}
