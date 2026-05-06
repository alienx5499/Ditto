import * as cheerio from 'cheerio';
import type { Element as DomElement } from 'domhandler';
import { siteSlugFromUrl } from './slug.js';
import type {
  SiteBrief,
  SiteBriefCta,
  SiteBriefFooterColumn,
  SiteBriefHeading,
  SiteBriefNavLink,
  SiteBriefSocialLink,
} from './site-brief.js';

const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const SECTION_KEYWORDS = [
  'hero',
  'features',
  'feature',
  'testimonial',
  'reviews',
  'pricing',
  'plans',
  'faq',
  'cta',
  'newsletter',
  'logos',
  'stats',
  'gallery',
  'team',
  'contact',
];
const SOCIAL_PLATFORMS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'linkedin', pattern: /linkedin\.com/i },
  { id: 'twitter', pattern: /(twitter\.com|x\.com)/i },
  { id: 'youtube', pattern: /youtube\.com|youtu\.be/i },
  { id: 'instagram', pattern: /instagram\.com/i },
  { id: 'facebook', pattern: /facebook\.com/i },
  { id: 'github', pattern: /github\.com/i },
  { id: 'tiktok', pattern: /tiktok\.com/i },
];

const MAX_HEADINGS = 24;
const MAX_NAV_LINKS = 12;
const MAX_CTAS = 8;
const MAX_FOOTER_COLUMNS = 6;

/**
 * Pure function: parses raw HTML into a `SiteBrief`. Best-effort heuristics,
 * never throws on malformed markup - cheerio handles invalid HTML gracefully.
 */
export function extractSiteBrief(rawHtml: string, url: string): SiteBrief {
  const $ = cheerio.load(rawHtml);
  const parsed = new URL(url);
  const host = parsed.host;

  const title = ($('title').first().text() || '').trim() || host;
  const description = $('meta[name="description"]').attr('content')?.trim();
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim();
  const themeColor = $('meta[name="theme-color"]').attr('content')?.trim();

  const palette = extractPalette($);
  if (themeColor && /^#[0-9a-fA-F]{3,8}$/.test(themeColor)) {
    if (!palette.includes(themeColor.toLowerCase())) palette.unshift(themeColor.toLowerCase());
  }

  const fonts = extractFonts($);
  const headings = extractHeadings($);
  const navLinks = extractNavLinks($);
  const ctas = extractCtas($, navLinks);
  const footerColumns = extractFooterColumns($);
  const socialLinks = extractSocialLinks($);
  const sectionsDetected = detectSections($);

  const bodyText = ($('body').text() || '').replace(/\s+/g, ' ').trim();
  const scriptCount = $('script').length;
  const isLikelyJsApp = bodyText.length < 500 && scriptCount > 5;

  const result: SiteBrief = {
    url,
    host,
    slug: siteSlugFromUrl(url),
    title,
    palette,
    fonts,
    headings,
    ctas,
    navLinks,
    footerColumns,
    socialLinks,
    sectionsDetected,
    rawHtmlLengthBytes: Buffer.byteLength(rawHtml, 'utf8'),
    isLikelyJsApp,
  };
  if (description) result.description = description;
  if (ogImage) result.ogImage = ogImage;
  if (themeColor) result.themeColor = themeColor;
  return result;
}

function extractPalette($: cheerio.CheerioAPI): string[] {
  const found = new Set<string>();
  $('[style]').each((_i, el) => {
    const style = $(el).attr('style') ?? '';
    matchHexes(style, found);
  });
  $('style').each((_i, el) => {
    matchHexes($(el).text(), found);
  });
  return Array.from(found).slice(0, 12);
}

function matchHexes(text: string, sink: Set<string>): void {
  const matches = text.match(HEX_COLOR_RE);
  if (!matches) return;
  for (const m of matches) {
    sink.add(m.toLowerCase());
  }
}

function extractFonts($: cheerio.CheerioAPI): string[] {
  const found = new Set<string>();
  $('link[href*="fonts.googleapis.com"]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const familyMatches = href.matchAll(/family=([^&:]+)(?::|&|$)/g);
    for (const m of familyMatches) {
      const name = decodeURIComponent((m[1] ?? '').replace(/\+/g, ' ')).trim();
      if (name) found.add(name);
    }
  });
  $('style').each((_i, el) => {
    const css = $(el).text();
    const familyMatches = css.matchAll(/font-family\s*:\s*([^;}]+)[;}]/gi);
    for (const m of familyMatches) {
      const value = (m[1] ?? '').trim();
      const first = value.split(',')[0]?.replace(/['"]/g, '').trim();
      if (
        first &&
        first.length > 1 &&
        !/^(inherit|initial|unset|sans-serif|serif|monospace)$/i.test(first)
      ) {
        found.add(first);
      }
    }
  });
  return Array.from(found).slice(0, 6);
}

function extractHeadings($: cheerio.CheerioAPI): SiteBriefHeading[] {
  const out: SiteBriefHeading[] = [];
  $('h1, h2, h3').each((_i, el) => {
    if (out.length >= MAX_HEADINGS) return;
    const tag = (el as DomElement).tagName?.toLowerCase() ?? 'h2';
    const level = (tag === 'h1' ? 1 : tag === 'h2' ? 2 : 3) as 1 | 2 | 3;
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && text.length <= 200) out.push({ level, text });
  });
  return dedupeBy(out, (h) => `${h.level}::${h.text.toLowerCase()}`);
}

function extractNavLinks($: cheerio.CheerioAPI): SiteBriefNavLink[] {
  const out: SiteBriefNavLink[] = [];
  $('header a, nav a').each((_i, el) => {
    if (out.length >= MAX_NAV_LINKS) return;
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    const href = $(el).attr('href') ?? '';
    if (!label || label.length > 40) return;
    if (!href) return;
    out.push({ label, href });
  });
  return dedupeBy(out, (l) => l.label.toLowerCase());
}

function extractCtas($: cheerio.CheerioAPI, navLinks: SiteBriefNavLink[]): SiteBriefCta[] {
  const out: SiteBriefCta[] = [];
  const ctaSelectors = [
    'a.btn',
    'a.button',
    'a[class*="cta"]',
    'a[class*="btn"]',
    'button.btn',
    'button[class*="cta"]',
    'button[class*="primary"]',
    'a[role="button"]',
  ];
  $(ctaSelectors.join(', ')).each((_i, el) => {
    if (out.length >= MAX_CTAS) return;
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    if (!label || label.length > 40) return;
    const href = $(el).attr('href');
    out.push(href ? { label, href } : { label });
  });
  if (out.length === 0 && navLinks.length > 0) {
    const last = navLinks[navLinks.length - 1];
    if (last) out.push({ label: last.label, href: last.href });
  }
  return dedupeBy(out, (c) => c.label.toLowerCase());
}

function extractFooterColumns($: cheerio.CheerioAPI): SiteBriefFooterColumn[] {
  const out: SiteBriefFooterColumn[] = [];
  $('footer')
    .first()
    .find('h2, h3, h4, h5, .footer-title, .footer-heading')
    .each((_i, headingEl) => {
      if (out.length >= MAX_FOOTER_COLUMNS) return;
      const title = $(headingEl).text().replace(/\s+/g, ' ').trim();
      if (!title || title.length > 40) return;
      const items: string[] = [];
      const container = $(headingEl).parent();
      container.find('a, li').each((_j, itemEl) => {
        if (items.length >= 6) return;
        const text = $(itemEl).text().replace(/\s+/g, ' ').trim();
        if (text && text.length <= 60 && !items.includes(text) && text !== title) {
          items.push(text);
        }
      });
      if (items.length > 0) out.push({ title, items });
    });
  return out;
}

function extractSocialLinks($: cheerio.CheerioAPI): SiteBriefSocialLink[] {
  const out: SiteBriefSocialLink[] = [];
  const seen = new Set<string>();
  $('footer a, a[aria-label]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    if (!href) return;
    for (const { id, pattern } of SOCIAL_PLATFORMS) {
      if (pattern.test(href) && !seen.has(id)) {
        out.push({ platform: id, href });
        seen.add(id);
        break;
      }
    }
  });
  return out;
}

function detectSections($: cheerio.CheerioAPI): string[] {
  const detected = new Set<string>();
  if ($('header').length > 0) detected.add('header');
  if ($('nav').length > 0 && !detected.has('header')) detected.add('nav');
  if ($('footer').length > 0) detected.add('footer');

  $('section, div').each((_i, el) => {
    const id = ($(el).attr('id') ?? '').toLowerCase();
    const cls = ($(el).attr('class') ?? '').toLowerCase();
    const haystack = `${id} ${cls}`;
    for (const kw of SECTION_KEYWORDS) {
      if (haystack.includes(kw)) {
        const normalized = kw.replace(/s$/, '');
        detected.add(normalized);
      }
    }
  });
  if ($('h1').length > 0 && !detected.has('hero')) detected.add('hero');
  return Array.from(detected);
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}
