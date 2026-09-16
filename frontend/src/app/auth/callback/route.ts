import { NextResponse } from "next/server";

import {
  PASSWORD_UPDATE_PATH,
  safeNextPath,
} from "@/lib/auth/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const callbackErrorUrl = (request: Request) => {
  const url = new URL("/staff/login", request.url);
  url.searchParams.set("error", "callback");
  return url;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeNextPath(
    requestUrl.searchParams.get("next"),
    PASSWORD_UPDATE_PATH,
  );

  if (!code) {
    return NextResponse.redirect(callbackErrorUrl(request));
  }

  const client = await createServerSupabaseClient();
  const { error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(callbackErrorUrl(request));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
