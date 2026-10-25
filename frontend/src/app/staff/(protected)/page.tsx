import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff } from "@/lib/staff/server";
import { StaffDashboard, type TabType } from "@/components/staff/StaffDashboard";
import { getSiteSectionMedia } from "@/lib/public/queries";
import { loadCourseImports } from "@/lib/courses/import-actions";
import type { Course, CourseImport, CourseLesson } from "@/types/courses";
import type { ContentItem } from "@/components/staff/ContentTable";
import { loadAuditLogs } from "@/lib/staff/audit";
import { loadCourseCollection } from "@/lib/courses/queries";
import type { MediaAsset, MediaAlbum } from "@/types/media";
import type { StaffMember } from "@/components/staff/StaffManager";

export const dynamic = "force-dynamic";

export default async function StaffHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const client = await createServerSupabaseClient();
  const staff = await requireActiveStaff(client);
  const rawTab = typeof resolvedParams?.tab === "string" ? resolvedParams.tab : undefined;
  const initialTab = (rawTab === "staff" || rawTab === "audit") && staff.role !== "admin" ? "announcements" : rawTab;

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
    coursesRes,
    lessonsRes,
    importsRes,
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
    loadAuditLogs(client, staff.role),
    client
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false }),
    client
      .from("media_albums")
      .select("*")
      .order("occurred_on", { ascending: false }),
    getSiteSectionMedia(),
    loadCourseCollection(client, "courses"),
    loadCourseCollection(client, "course_lessons"),
    loadCourseImports(client),
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
      initialAuditLogs={auditLogsRes.data}
      auditLogsError={auditLogsRes.error}
      initialMediaAssets={(mediaAssetsRes.data as MediaAsset[]) || []}
      initialMediaAlbums={(mediaAlbumsRes.data as MediaAlbum[]) || []}
      initialSectionMedia={sectionMedia}
      currentUserId={staff.user.id}
      initialStaff={initialStaff}
      initialTab={initialTab as TabType | undefined}
      initialCourses={(coursesRes.data as Course[]) || []}
      initialCourseLessons={(lessonsRes.data as CourseLesson[]) || []}
      initialCourseImports={(importsRes.data as CourseImport[]) || []}
      courseImportsError={importsRes.error ? "Daftar impor gagal dimuat. Silakan coba muat ulang." : null}
      coursesError={coursesRes.error || lessonsRes.error ? "Materi gagal dimuat. Silakan coba muat ulang." : null}
    />
  );
}

