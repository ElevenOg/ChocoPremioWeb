import Intro from "./Intro";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // The complete intro HTML needs no database request. Early social clicks
  // resolve their destination separately while the session is prepared.
  return <Intro key={slug} slug={slug} />;
}
