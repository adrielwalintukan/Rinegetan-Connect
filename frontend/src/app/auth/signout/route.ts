import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const client = await createServerSupabaseClient();
  await client.auth.signOut();
  redirect("/staff/login");
}
