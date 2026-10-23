const AUDIT_LOAD_ERROR = "Gagal memuat riwayat audit. Silakan muat ulang halaman.";

/**
 * RLS remains authoritative; skip the admin-only query entirely for other roles.
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 * @param {string} role
 * @returns {Promise<{data: import("./audit").AuditEntry[], error: string | null}>}
 */
export async function loadAuditLogs(client, role) {
  if (role !== "admin") return { data: [], error: null };
  try {
    const { data, error } = await client
      .from("audit_logs")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(50);
    return error ? { data: [], error: AUDIT_LOAD_ERROR } : { data: data || [], error: null };
  } catch {
    return { data: [], error: AUDIT_LOAD_ERROR };
  }
}

/** @param {string | null | undefined} timestamp */
export function formatAuditTimestamp(timestamp) {
  const date = new Date(timestamp || "");
  if (Number.isNaN(date.getTime())) return "Waktu tidak tersedia";
  const day = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar", weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date);
  return `${day}, ${time} WITA`;
}
