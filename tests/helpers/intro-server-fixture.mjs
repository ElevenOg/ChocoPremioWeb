// Loaded only by the browser regression test's child server.
// Fake credentials and this transport keep QA isolated from the real database.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  // NEXT_PUBLIC_* may also be inlined into the production server bundle.
  if (url.hostname.endsWith(".supabase.co")) {
    if (url.pathname === "/rest/v1/commerces" && (!options?.method || options.method === "GET")) {
      return new Response(JSON.stringify([{ slug: "qa-intro", social_url: "https://www.instagram.com/example/" }]), { headers: { "Content-Type": "application/json" } });
    }
    throw new Error("Unexpected database request during isolated browser QA");
  }
  return originalFetch(input, options);
};
