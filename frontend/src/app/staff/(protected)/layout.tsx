import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";

export default async function ProtectedStaffLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  try {
    const client = await createServerSupabaseClient();
    await requireActiveStaff(client);
  } catch (error) {
    if (
      error instanceof StaffAccessError &&
      error.code === "not_authenticated"
    ) {
      redirect("/staff/login?next=/staff");
    }

    redirect("/staff/login?error=unauthorized");
  }

  return children;
}
