import { getIntroCommerce } from "@/lib/game/commerce";
import { safeSocialUrl } from "@/lib/game/social";
import SocialVisit from "./SocialVisit";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const commerce = await getIntroCommerce(slug).catch(() => null);
  return <SocialVisit socialUrl={safeSocialUrl(commerce?.social_url)} unavailable={!commerce} />;
}
