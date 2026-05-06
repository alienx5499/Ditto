import axios from 'axios';

import { extractSiteBrief } from '../clone/extract.js';
import { ToolError } from '../errors/index.js';
import { fetchUrlArgsSchema } from '../schemas/tool-args.js';
import type { SiteBrief } from '../clone/site-brief.js';
import type { ToolDescriptor } from '../types/index.js';

const TIMEOUT_MS = 25_000;
const MAX_BYTES = 5_000_000;

export const extractSiteTool: ToolDescriptor<unknown, SiteBrief> = {
  name: 'extractSite',
  description:
    'Fetch a public landing page URL and return a structured SiteBrief: title, description, palette, fonts, headings, nav links, CTAs, footer columns, social links, detected sections. Use BEFORE writing files when cloning a site. ' +
    'Args: a URL string or { url: string }.',
  parametersJsonSchema: {
    oneOf: [
      { type: 'string', format: 'uri' },
      { type: 'object', properties: { url: { type: 'string', format: 'uri' } }, required: ['url'] },
    ],
  },
  async execute(rawArgs, ctx) {
    const parsed = fetchUrlArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new ToolError(this.name, `Invalid args: ${parsed.error.message}`, {
        code: 'TOOL_BAD_ARGS',
      });
    }
    const url = typeof parsed.data === 'string' ? parsed.data : parsed.data.url;

    let html: string;
    try {
      const res = await axios.get<string>(url, {
        timeout: TIMEOUT_MS,
        responseType: 'text',
        transformResponse: (v) => v,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        validateStatus: (s) => s < 400,
        ...(ctx.signal ? { signal: ctx.signal } : {}),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; DittoCLI/0.1; +https://github.com/) educational-clone-bot',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      html = typeof res.data === 'string' ? res.data : String(res.data ?? '');
    } catch (err) {
      throw new ToolError(this.name, `Could not fetch ${url}: ${(err as Error).message}`, {
        code: 'TOOL_FETCH_FAILED',
        cause: err,
      });
    }

    try {
      return extractSiteBrief(html, url);
    } catch (err) {
      throw new ToolError(this.name, `Could not extract site brief from ${url}`, {
        code: 'TOOL_EXTRACT_FAILED',
        cause: err,
      });
    }
  },
};
