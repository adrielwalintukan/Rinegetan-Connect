import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff } from "@/lib/staff/server";
import { StaffDashboard } from "@/components/staff/StaffDashboard";
import type { ContentItem } from "@/components/staff/ContentTable";
import type { AuditEntry } from "@/components/staff/AuditLogViewer";
import type { MediaAsset, MediaAlbum } from "@/types/media";

export const dynamic = "force-dynamic";

export default async function StaffHomePage() {
  const client = await createServerSupabaseClient();
  const staff = await requireActiveStaff(client);

  // Fetch initial content securely server-side
  const [
    announcementsRes,
    eventsRes,
    schedulesRes,
    departmentsRes,
    auditLogsRes,
    mediaAssetsRes,
    mediaAlbumsRes,
  ] = await Promise.all([
    client
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false }),
    client
      .from("events")
      .select("*")
      .order("created_at", { ascending: false }),
    client
      .from("schedules")
      .select("*")
      .order("position", { ascending: true }),
    client
      .from("departments")
      .select("*")
      .order("name", { ascending: true }),
    client
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false }),
    client
      .from("media_albums")
      .select("*")
      .order("occurred_on", { ascending: false }),
  ]);

  return (
    <StaffDashboard
      userEmail={staff.user.email || "staff@gmahkrinegetan.org"}
      role={staff.role}
      initialAnnouncements={(announcementsRes.data as ContentItem[]) || []}
      initialEvents={(eventsRes.data as ContentItem[]) || []}
      initialSchedules={(schedulesRes.data as ContentItem[]) || []}
      initialDepartments={(departmentsRes.data as ContentItem[]) || []}
      initialAuditLogs={(auditLogsRes.data as AuditEntry[]) || []}
      initialMediaAssets={(mediaAssetsRes.data as MediaAsset[]) || []}
      initialMediaAlbums={(mediaAlbumsRes.data as MediaAlbum[]) || []}
    />
  );
}
