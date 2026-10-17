import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff } from "@/lib/staff/server";
import { StaffDashboard, type TabType } from "@/components/staff/StaffDashboard";
import { getSiteSectionMedia } from "@/lib/public/queries";
import type { ContentItem } from "@/components/staff/ContentTable";
import type { AuditEntry } from "@/components/staff/AuditLogViewer";
import type { MediaAsset, MediaAlbum } from "@/types/media";
import type { StaffMember } from "@/components/staff/StaffManager";

export const dynamic = "force-dynamic";

export default async function StaffHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const initialTab = typeof resolvedParams?.tab === "string" ? resolvedParams.tab : undefined;
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
    sectionMedia,
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
    getSiteSectionMedia(),
  ]);

  const staffRes =
    staff.role === "admin"
      ? await client
          .from("profiles")
          .select("id, display_name, is_active, created_at, staff_roles(role)")
          .order("created_at", { ascending: true })
      : { data: [] };
  const initialStaff: StaffMember[] = (staffRes.data || []).map((row) => {
    const roles = row.staff_roles as { role: StaffMember["role"] } | { role: StaffMember["role"] }[] | null;
    return {
      id: row.id,
      display_name: row.display_name,
      is_active: row.is_active,
      created_at: row.created_at,
      role: (Array.isArray(roles) ? roles[0]?.role : roles?.role) ?? null,
    };
  });

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
      initialSectionMedia={sectionMedia}
      currentUserId={staff.user.id}
      initialStaff={initialStaff}
      initialTab={initialTab as TabType | undefined}
    />
  );
}

