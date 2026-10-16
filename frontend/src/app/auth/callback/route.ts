import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import {
  PASSWORD_UPDATE_PATH,
  safeNextPath,
} from "@/lib/auth/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Admin-sent emails (invite) cannot carry a PKCE code, so their template links here with token_hash.
const EMAIL_OTP_TYPES: EmailOtpType[] = ["invite", "recovery", "email", "magiclink", "signup", "email_change"];

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

  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const isTokenHashLink = Boolean(tokenHash && type && EMAIL_OTP_TYPES.includes(type));

  if (!code && !isTokenHashLink) {
    return NextResponse.redirect(callbackErrorUrl(request));
  }

  const client = await createServerSupabaseClient();
  const { error } = code
    ? await client.auth.exchangeCodeForSession(code)
    : await client.auth.verifyOtp({ token_hash: tokenHash as string, type: type as EmailOtpType });

  if (error) {
    return NextResponse.redirect(callbackErrorUrl(request));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
