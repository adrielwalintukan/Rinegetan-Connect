import { createClient } from "@supabase/supabase-js";
import { resolveWeeklyOccurrences } from "../schedule-wita.mjs";
import { getMediaPublicUrl } from "../media/url.mjs";

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getPublishedAnnouncements() {
  const client = getPublicClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("announcements")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching published announcements:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Failed to query announcements:", err);
    return [];
  }
}

export async function getPublishedEvents() {
  const client = getPublicClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("starts_at", { ascending: true });
    if (error) {
      console.error("Error fetching published events:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Failed to query events:", err);
    return [];
  }
}

export async function getPublishedSchedules(startDate = null, endDate = null) {
  const client = getPublicClient();
  if (!client) return [];
  try {
    const [schedulesRes, exceptionsRes] = await Promise.all([
      client.from("schedules").select("*").eq("status", "published"),
      client.from("schedule_exceptions").select("*"),
    ]);
    if (schedulesRes.error) {
      console.error("Error fetching published schedules:", schedulesRes.error);
      return [];
    }
    const schedules = schedulesRes.data || [];
    const exceptions = exceptionsRes.data || [];

    if (!startDate || !endDate) {
      return schedules;
    }

    return resolveWeeklyOccurrences(schedules, exceptions, startDate, endDate);
  } catch (err) {
    console.error("Failed to query schedules:", err);
    return [];
  }
}

export async function getPublishedDepartments() {
  const client = getPublicClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("departments")
      .select("*")
      .eq("status", "published")
      .order("name", { ascending: true });
    if (error) {
      console.error("Error fetching published departments:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Failed to query departments:", err);
    return [];
  }
}

export async function getPublicMediaAlbums() {
  const client = getPublicClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("media_albums")
      .select(`
        *,
        cover:cover_asset_id (
          id,
          storage_path,
          mime_type,
          alt_text,
          caption
        ),
        album_assets (
          asset_id
        )
      `)
      .eq("status", "published")
      .order("occurred_on", { ascending: false });

    if (error) {
      console.error("Error fetching published media albums:", error);
      return [];
    }

    return (data || []).map((album) => ({
      ...album,
      photo_count: album.album_assets ? album.album_assets.length : 0,
    }));
  } catch (err) {
    console.error("Failed to query media albums:", err);
    return [];
  }
}

export async function getPublicMediaAssets(options = {}) {
  const { category = null, albumId = null } = options;
  const client = getPublicClient();
  if (!client) return [];
  try {
    const query = client
      .from("media_assets")
      .select(`
        *,
        album_assets (
          album_id,
          position,
          is_cover,
          album:album_id (
            id,
            title,
            slug,
            category
          )
        )
      `)
      .eq("status", "published")
      .eq("consent_status", "approved")
      .is("hidden_at", null)
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching published media assets:", error);
      return [];
    }

    let assets = data || [];

    if (albumId) {
      assets = assets.filter((asset) =>
        asset.album_assets?.some((aa) => aa.album_id === albumId)
      );
    }

    if (category && category !== "all" && category !== "Semua") {
      const catLower = category.toLowerCase();
      assets = assets.filter((asset) =>
        asset.album_assets?.some((aa) => aa.album?.category === catLower)
      );
    }

    return assets;
  } catch (err) {
    console.error("Failed to query media assets:", err);
    return [];
  }
}

export async function getSiteSectionMedia() {
  const client = getPublicClient();
  if (!client) return {};

  try {
    const { data, error } = await client
      .from("site_section_media")
      .select(`
        section_key,
        asset_id,
        custom_alt_text,
        custom_caption,
        asset:asset_id (
          id,
          storage_path,
          mime_type,
          alt_text,
          caption,
          status,
          consent_status,
          hidden_at
        )
      `);

    if (error) {
      console.error("Error fetching site section media:", error);
      return {};
    }

    const map = {};
    for (const item of data || []) {
      if (!item.asset || item.asset.status !== "published" || item.asset.hidden_at) {
        continue;
      }
      map[item.section_key] = {
        section_key: item.section_key,
        asset_id: item.asset_id,
        image_url: getMediaPublicUrl(item.asset.storage_path),
        alt_text: item.custom_alt_text || item.asset.alt_text,
        caption: item.custom_caption || item.asset.caption,
      };
    }
    return map;
  } catch (err) {
    console.error("Failed to query site section media:", err);
    return {};
  }
}

export function triggerPublicRevalidation(entityType, hooks = null) {
  try {
    if (hooks?.revalidateTag && hooks?.revalidatePath) {
      hooks.revalidateTag("public-content");
      hooks.revalidateTag(`public-${entityType}`);
      hooks.revalidatePath("/");
      if (entityType === "events") hooks.revalidatePath("/kegiatan");
      if (entityType === "schedules") hooks.revalidatePath("/sekolah-sabat");
      if (entityType === "departments") hooks.revalidatePath("/pelayanan");
      if (
        entityType === "media" ||
        entityType === "media_assets" ||
        entityType === "media_albums"
      ) {
        hooks.revalidatePath("/media");
        hooks.revalidateTag("public-media");
        hooks.revalidateTag("media-assets");
        hooks.revalidateTag("media-albums");
      }
      if (entityType === "site_section_media") {
        hooks.revalidateTag("site-section-media");
        hooks.revalidatePath("/");
        hooks.revalidatePath("/sekolah-sabat");
        hooks.revalidatePath("/tentang-kami");
      }
      return;
    }

    // In Next.js runtime
    import("next/cache").then(({ revalidateTag, revalidatePath }) => {
      try {
        revalidateTag("public-content");
        revalidateTag(`public-${entityType}`);
        revalidatePath("/");
        if (entityType === "events") revalidatePath("/kegiatan");
        if (entityType === "schedules") revalidatePath("/sekolah-sabat");
        if (entityType === "departments") revalidatePath("/pelayanan");
        if (
          entityType === "media" ||
          entityType === "media_assets" ||
          entityType === "media_albums"
        ) {
          revalidatePath("/media");
          revalidateTag("public-media");
          revalidateTag("media-assets");
          revalidateTag("media-albums");
        }
        if (entityType === "site_section_media") {
          revalidateTag("site-section-media");
          revalidatePath("/");
          revalidatePath("/sekolah-sabat");
          revalidatePath("/tentang-kami");
        }
      } catch (innerErr) {
        console.warn("Revalidation warning:", innerErr);
      }
    }).catch(() => {
      // Ignored outside Next.js
    });
  } catch (err) {
    console.warn("triggerPublicRevalidation error:", err);
  }
}
