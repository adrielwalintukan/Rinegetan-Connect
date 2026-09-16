import type { SupabaseClient, User } from "@supabase/supabase-js";

export class StaffAccessError extends Error {
  code: "not_authenticated" | "not_admin";

  constructor(code: "not_authenticated" | "not_admin") {
    super(code);
    this.name = "StaffAccessError";
    this.code = code;
  }
}

export const requireActiveAdmin = async (
  client: SupabaseClient,
): Promise<User> => {
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

  if (
    roleResult.error ||
    profileResult.error ||
    roleResult.data?.role !== "admin" ||
    profileResult.data?.is_active !== true
  ) {
    throw new StaffAccessError("not_admin");
  }

  return user;
};
