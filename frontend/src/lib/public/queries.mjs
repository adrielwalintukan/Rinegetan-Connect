import { createClient } from "@supabase/supabase-js";
import { resolveWeeklyOccurrences } from "../schedule-wita.mjs";

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
      .order("start_date", { ascending: true });
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
      .order("display_order", { ascending: true });
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

export function triggerPublicRevalidation(entityType, hooks = null) {
  try {
    if (hooks?.revalidateTag && hooks?.revalidatePath) {
      hooks.revalidateTag("public-content");
      hooks.revalidateTag(`public-${entityType}`);
      hooks.revalidatePath("/");
      if (entityType === "events") hooks.revalidatePath("/kegiatan");
      if (entityType === "schedules") hooks.revalidatePath("/sekolah-sabat");
      if (entityType === "departments") hooks.revalidatePath("/pelayanan");
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
