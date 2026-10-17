import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import {
  validateUploadGuardrails,
  getStorageQuotaMetrics,
  STORAGE_CAPACITY_BYTES,
} from "@/lib/media/guardrails";
import { createJpegDerivative } from "@/lib/media/derivative";
import { publicErrorMessage } from "@/lib/api/errors";
import { isConsentStatus, recordConsent } from "@/lib/media/consent";

const MEDIA_CATEGORIES = ["ibadah", "pemuda", "sekolah_sabat", "sosial", "fellowship", "umum"];

export async function POST(request: Request) {
  try {
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);

    // 1. Periksa penggunaan kuota penyimpanan saat ini
    const { data: usageData, error: usageError } = await client
      .from("media_assets")
      .select("bytes");

    if (usageError) {
      console.error("media upload quota query failed:", usageError);
      return Response.json(
        { error: "database_error", message: publicErrorMessage(usageError) },
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
    const consentInput = formData.get("consent_status");
    const consentStatus = isConsentStatus(consentInput) ? consentInput : "pending";
    const categoryInput = formData.get("category");
    const category =
      typeof categoryInput === "string" && MEDIA_CATEGORIES.includes(categoryInput) ? categoryInput : "umum";

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
      console.error("media storage upload failed:", uploadError);
      return Response.json(
        {
          error: "storage_upload_failed",
          message: "Gagal mengunggah gambar ke penyimpanan. Silakan coba lagi.",
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
        category,
        status: "draft",
        created_by: staff.user.id,
        updated_by: staff.user.id,
      })
      .select()
      .single();

    if (assetError) {
      // Rollback file jika insert database gagal
      console.error("media_assets insert failed:", assetError);
      await client.storage.from("media").remove([storagePath]);
      return Response.json(
        {
          error: "database_insert_failed",
          message: `Gagal menyimpan data foto. ${publicErrorMessage(assetError)}`,
        },
        { status: 500 }
      );
    }

    // Consent selain pending baru diterapkan setelah buktinya tercatat; bila gagal, foto tetap pending (aman, tidak tampil publik).
    let savedAsset = assetData;
    let consentWarning: string | null = null;
    if (consentStatus !== "pending") {
      const { data: consentAsset, error: updateError } = await recordConsent(
        client,
        assetData,
        consentStatus,
        staff.user.id,
      );

      if (updateError || !consentAsset) {
        console.error("consent recording failed:", updateError);
        consentWarning = "Foto tersimpan, tetapi izin (consent) belum tercatat sehingga statusnya masih Pending.";
      } else {
        savedAsset = consentAsset;
      }
    }

    // Jika upload menandai auto_publish dan consent disetujui, terbitkan foto langsung
    const autoPublish = formData.get("auto_publish") === "true";
    if (autoPublish && consentStatus === "approved") {
      const { data: publishedAsset, error: pubError } = await client
        .from("media_assets")
        .update({ status: "published" })
        .eq("id", assetData.id)
        .select()
        .single();
      if (!pubError && publishedAsset) {
        savedAsset = publishedAsset;
      }
    }

    // 8. Relasikan dengan album jika album_id disertakan
    if (albumId && typeof albumId === "string") {
      await client.from("album_assets").insert({
        album_id: albumId,
        asset_id: assetData.id,
      });
    }

    // Audit "media" dicatat oleh trigger database media_assets_audit_mutation.

    const updatedQuota = getStorageQuotaMetrics(totalUsedBytes + derivative.bytes);

    return Response.json(
      {
        success: true,
        data: savedAsset,
        warning: consentWarning,
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

    console.error("media upload failed:", error);
    return Response.json({ error: "server_error", message: publicErrorMessage(error) }, { status: 500 });
  }
}
