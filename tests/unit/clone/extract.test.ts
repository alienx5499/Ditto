import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { extractSiteBrief } from '../../../src/clone/extract.js';

const fixturePath = resolve(__dirname, '../../fixtures/sample-landing.html');
const sampleHtml = readFileSync(fixturePath, 'utf8');
const url = 'https://acme.example/';

describe('extractSiteBrief', () => {
  it('reads title, description, and meta tags', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    expect(brief.title).toBe('Acme Cloud - Ship faster');
    expect(brief.description).toContain('ship faster');
    expect(brief.themeColor).toBe('#0F1B3D');
    expect(brief.ogImage).toBe('https://acme.example/og.png');
  });

  it('derives slug from URL', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    expect(brief.slug).toBe('acme-example');
  });

  it('mines hex colors from <style> blocks (palette has multiple entries)', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    expect(brief.palette.length).toBeGreaterThanOrEqual(4);
    expect(brief.palette).toContain('#0f1b3d');
    expect(brief.palette).toContain('#00c2ff');
  });

  it('extracts Google Font families', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    expect(brief.fonts).toContain('Inter');
    expect(brief.fonts).toContain('JetBrains Mono');
  });

  it('extracts h1/h2/h3 headings with levels', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    const levels = brief.headings.map((h) => h.level);
    expect(levels).toContain(1);
    expect(levels).toContain(2);
    expect(levels).toContain(3);
    const h1 = brief.headings.find((h) => h.level === 1);
    expect(h1?.text).toBe('Ship software with confidence');
  });

  it('captures nav links from header', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    const labels = brief.navLinks.map((l) => l.label);
    expect(labels).toContain('Products');
    expect(labels).toContain('Pricing');
    expect(labels).toContain('Login');
  });

  it('captures CTA buttons', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    const labels = brief.ctas.map((c) => c.label);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some((l) => /start|get|trial|demo/i.test(l))).toBe(true);
  });

  it('detects landing sections by class', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    expect(brief.sectionsDetected).toContain('header');
    expect(brief.sectionsDetected).toContain('hero');
    expect(brief.sectionsDetected).toContain('feature');
    expect(brief.sectionsDetected).toContain('pricing');
    expect(brief.sectionsDetected).toContain('faq');
    expect(brief.sectionsDetected).toContain('footer');
  });

  it('extracts footer columns with items', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    const titles = brief.footerColumns.map((c) => c.title);
    expect(titles).toContain('Product');
    expect(titles).toContain('Company');
    const product = brief.footerColumns.find((c) => c.title === 'Product');
    expect(product?.items).toContain('Features');
  });

  it('detects social platforms in footer', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    const platforms = brief.socialLinks.map((s) => s.platform);
    expect(platforms).toContain('twitter');
    expect(platforms).toContain('linkedin');
    expect(platforms).toContain('github');
  });

  it('flags JS-only apps when body is sparse', () => {
    const jsAppHtml = `
      <!doctype html><html><head><title>App</title></head>
      <body>
        <div id="root"></div>
        <script>1</script><script>2</script><script>3</script>
        <script>4</script><script>5</script><script>6</script>
      </body></html>`;
    const brief = extractSiteBrief(jsAppHtml, 'https://app.example/');
    expect(brief.isLikelyJsApp).toBe(true);
  });

  it('does not flag content-rich pages as JS-only', () => {
    const brief = extractSiteBrief(sampleHtml, url);
    expect(brief.isLikelyJsApp).toBe(false);
  });
});
