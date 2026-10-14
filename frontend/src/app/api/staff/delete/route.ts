import { runStaffLifecycleRpc } from "@/lib/staff/lifecycle-route";

export async function POST(request: Request) {
  return runStaffLifecycleRpc(request, "delete_staff", "deletion_failed");
}
