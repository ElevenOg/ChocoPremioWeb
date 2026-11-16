import { redirect } from "next/navigation";
import { getIntroCommerce } from "@/lib/game/commerce";
import { safeSocialUrl } from "@/lib/game/social";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const commerce = await getIntroCommerce(slug).catch(() => null);
  // Resolve early clicks without rendering an intermediate return screen.
  redirect(safeSocialUrl(commerce?.social_url) ?? "/" + encodeURIComponent(slug));
}
