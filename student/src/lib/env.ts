import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("must be your Supabase project URL, like https://abc123.supabase.co"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "is missing"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().or(z.literal("")),
});

// Read each value by name so Next.js can include it in the browser build.
const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
  throw new Error(
    `Settings are missing or wrong in .env.local (${problems}). Copy .env.example to .env.local, fill in the values from Supabase, then restart the server.`,
  );
}

export const env = parsed.data;
