import { type NextRequest, NextResponse } from "next/server";

import {
  isProtectedStaffPath,
  isPublicAuthPath,
} from "@/lib/auth/redirect";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSupabaseSession(request);
  const pathname = request.nextUrl.pathname;

  if (!isProtectedStaffPath(pathname) || isPublicAuthPath(pathname) || claims) {
    return response;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/staff/login";
  loginUrl.search = `?next=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;

  const redirect = NextResponse.redirect(loginUrl);
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });

  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
