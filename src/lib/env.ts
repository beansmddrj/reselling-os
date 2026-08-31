type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getPublicEnv(): PublicEnv {
  return {
    // NEXT_PUBLIC values must be referenced statically so Next.js can inline
    // them into the browser bundle during the production build.
    supabaseUrl: required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    supabasePublishableKey: required(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
  };
}
