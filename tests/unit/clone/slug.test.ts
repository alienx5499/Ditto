import { describe, expect, it } from 'vitest';

import { siteSlugFromUrl } from '../../../src/clone/slug.js';

describe('siteSlugFromUrl', () => {
  it('strips protocol and converts dots to dashes', () => {
    expect(siteSlugFromUrl('https://scaler.com')).toBe('scaler-com');
  });

  it('strips leading www.', () => {
    expect(siteSlugFromUrl('https://www.stripe.com/')).toBe('stripe-com');
  });

  it('appends path segments when path is non-root', () => {
    expect(siteSlugFromUrl('https://example.com/products')).toBe('example-com-products');
  });

  it('flattens multi-segment paths', () => {
    expect(siteSlugFromUrl('https://sub.example.co.uk/foo/2')).toBe('sub-example-co-uk-foo-2');
  });

  it('drops trailing slash', () => {
    expect(siteSlugFromUrl('https://example.com/products/')).toBe('example-com-products');
  });

  it('handles uppercased hosts', () => {
    expect(siteSlugFromUrl('https://Scaler.COM')).toBe('scaler-com');
  });
});
