type SupabasePublicEnvironment = {
  publishableKey: string;
  url: string;
};

export const getSupabasePublicEnvironment = (): SupabasePublicEnvironment => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    const missingVariables = [
      !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !publishableKey ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null,
    ].filter((variable): variable is string => variable !== null);

    throw new Error(
      `Supabase belum dikonfigurasi. Tambahkan ${missingVariables.join(", ")} ke frontend/.env.local.`,
    );
  }

  return { url, publishableKey };
};
