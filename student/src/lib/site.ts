import { headers } from "next/headers";
import { env } from "@/lib/env";

/** The public address of this site, used in links sent by email. */
export async function siteUrl(): Promise<string> {
  const configured = env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
