import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabasePublicEnvironment } from "./environment";

export const updateSupabaseSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicEnvironment();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  return { claims: error || !data ? null : data.claims, response };
};
