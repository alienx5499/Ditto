import axios from 'axios';

import { ToolError } from '../errors/index.js';
import { fetchUrlArgsSchema } from '../schemas/tool-args.js';
import type { ToolDescriptor } from '../types/index.js';

interface FetchUrlResult {
  url: string;
  status: number;
  contentType: string;
  body: string;
  truncated: boolean;
}

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 200_000;

export const fetchUrlTool: ToolDescriptor<unknown, FetchUrlResult> = {
  name: 'fetchUrl',
  description:
    'GET an HTTP(S) URL and return up to ~200KB of body text. Use sparingly to peek at site markup. ' +
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
    try {
      const res = await axios.get<string>(url, {
        timeout: TIMEOUT_MS,
        responseType: 'text',
        transformResponse: (v) => v,
        validateStatus: () => true,
        ...(ctx.signal ? { signal: ctx.signal } : {}),
        headers: {
          'User-Agent': 'DittoCLI/0.1 (+https://github.com)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      const contentType = String(res.headers['content-type'] ?? '');
      const body = typeof res.data === 'string' ? res.data : String(res.data ?? '');
      const truncated = body.length > MAX_BYTES;
      return {
        url,
        status: res.status,
        contentType,
        body: truncated ? body.slice(0, MAX_BYTES) : body,
        truncated,
      };
    } catch (err) {
      throw new ToolError(this.name, `Failed to GET ${url}: ${(err as Error).message}`, {
        code: 'TOOL_FETCH_FAILED',
        cause: err,
      });
    }
  },
};
