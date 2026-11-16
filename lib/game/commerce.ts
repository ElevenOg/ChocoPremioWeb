import "server-only";

import { unstable_cache } from "next/cache";
import { supabaseServer } from "../db/supabase-server";

// Share public presentation data only. Sessions and prizes are never cached.
export const getIntroCommerce = unstable_cache(async (slug: string) => {
  const { data, error } = await supabaseServer.from("commerces")
    .select("slug,social_url").eq("slug", slug).eq("active", true)
    .abortSignal(AbortSignal.timeout(5000)).maybeSingle();
  if (error) throw new Error("No se pudo consultar el comercio.");
  return data as { slug: string; social_url: string | null } | null;
}, ["intro-commerce-v1"], { revalidate: 60 });
