import { runStaffLifecycleRpc } from "@/lib/staff/lifecycle-route";

export async function POST(request: Request) {
  return runStaffLifecycleRpc(request, "reactivate_staff", "reactivation_failed");
}
