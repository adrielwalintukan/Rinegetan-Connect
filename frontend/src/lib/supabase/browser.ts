import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnvironment } from "./environment";

export const createBrowserSupabaseClient = () => {
  const { url, publishableKey } = getSupabasePublicEnvironment();

  return createBrowserClient(url, publishableKey);
};
