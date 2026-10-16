import type { SupabaseClient, User } from "@supabase/supabase-js";

export type StaffRole = "admin" | "editor";

export class StaffAccessError extends Error {
  code: "not_authenticated" | "not_staff" | "not_admin";

  constructor(code: "not_authenticated" | "not_staff" | "not_admin") {
    super(code);
    this.name = "StaffAccessError";
    this.code = code;
  }
}

export type ActiveStaff = {
  role: StaffRole;
  user: User;
};

export const requireActiveStaff = async (
  client: SupabaseClient,
): Promise<ActiveStaff> => {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    throw new StaffAccessError("not_authenticated");
  }

  const [roleResult, profileResult] = await Promise.all([
    client
      .from("staff_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
    client
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const role = roleResult.data?.role;

  if (
    roleResult.error ||
    profileResult.error ||
    !["admin", "editor"].includes(role ?? "") ||
    profileResult.data?.is_active !== true
  ) {
    throw new StaffAccessError("not_staff");
  }

  return {
    role: role as StaffRole,
    user,
  };
};

export const requireActiveAdmin = async (
  client: SupabaseClient,
): Promise<User> => {
  const staff = await requireActiveStaff(client);
  if (staff.role !== "admin") {
    throw new StaffAccessError("not_admin");
  }

  return staff.user;
};
