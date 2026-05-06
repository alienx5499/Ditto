/**
 * Structured summary of a public landing page, produced by the HTML extractor
 * and consumed by the model when synthesizing a clone.
 *
 * Everything in here is derived from publicly-served HTML. Do NOT bake
 * full long-form copy into clones; the system prompt only allows headings,
 * nav labels, and CTA labels to flow through to the generated artifact.
 */
export interface SiteBriefHeading {
  level: 1 | 2 | 3;
  text: string;
}

export interface SiteBriefCta {
  label: string;
  href?: string;
}

export interface SiteBriefNavLink {
  label: string;
  href: string;
}

export interface SiteBriefFooterColumn {
  title: string;
  items: string[];
}

export interface SiteBriefSocialLink {
  platform: string;
  href: string;
}

export interface SiteBrief {
  url: string;
  host: string;
  slug: string;
  title: string;
  description?: string;
  ogImage?: string;
  themeColor?: string;
  palette: string[];
  fonts: string[];
  headings: SiteBriefHeading[];
  ctas: SiteBriefCta[];
  navLinks: SiteBriefNavLink[];
  footerColumns: SiteBriefFooterColumn[];
  socialLinks: SiteBriefSocialLink[];
  sectionsDetected: string[];
  rawHtmlLengthBytes: number;
  isLikelyJsApp: boolean;
}
