/**
 * Maps a URL to a stable, filesystem-safe folder name under output/.
 *
 * Examples:
 *   https://scaler.com               -> "scaler-com"
 *   https://www.stripe.com/          -> "stripe-com"
 *   https://example.com/products/    -> "example-com-products"
 *   https://sub.example.co.uk/foo/2  -> "sub-example-co-uk-foo-2"
 */
export function siteSlugFromUrl(url: string): string {
  const parsed = new URL(url);
  const host = parsed.host.replace(/^www\./i, '');
  const hostSlug = sanitize(host);

  const pathSlug = parsed.pathname
    .split('/')
    .filter((segment) => segment.length > 0)
    .map(sanitize)
    .filter((s) => s.length > 0)
    .join('-');

  return pathSlug ? `${hostSlug}-${pathSlug}` : hostSlug;
}

function sanitize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
