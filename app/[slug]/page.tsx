import Intro from "./Intro";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // The complete intro HTML needs no database request. The local social route
  // resolves the commerce's destination independently of session creation.
  return <Intro key={slug} slug={slug} />;
}
