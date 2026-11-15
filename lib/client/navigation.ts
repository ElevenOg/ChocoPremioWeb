// Keep fast client navigation, with a document navigation as recovery if the
// route request gets stuck. Call the returned cleanup when the source unmounts.
export function navigateWithRecovery(href: string, navigate: (href: string) => void): () => void {
  const timer = window.setTimeout(() => window.location.assign(href), 6000);
  try {
    navigate(href);
  } catch {
    window.clearTimeout(timer);
    window.location.assign(href);
  }
  return () => window.clearTimeout(timer);
}
