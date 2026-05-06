# Ditto

> Copy anything. Build anything.

Ditto is a conversational CLI engineering agent. You chat with it in the terminal and it writes real files on your machine by looping through `START → THINK → TOOL → OBSERVE → OUTPUT` until the task is done. It is built on Vertex AI Gemini and ships with eight built-in tools (`writeFile`, `readFile`, `makeDirectory`, `listDirectory`, `executeCommand`, `fetchUrl`, `openInBrowser`, `extractSite`).

Ditto can clone any public homepage. Give it a URL and it will fetch the page, extract a `SiteBrief` (palette, fonts, headings, nav, CTAs, footer columns, social links, detected sections), then synthesize a self-contained `index.html`, `styles.css`, `script.js` under `output/<slug>/` and open it in your default browser. Optionally attach a screenshot for higher visual fidelity.

```
 ____  _ _   _
|  _ \(_) |_| |_ ___
| | | | | __| __/ _ \
| |_| | | |_| || (_) |
|____/|_|\__|\__\___/
   › Copy anything. Build anything.
   › v0.1.0 · model: gemini-3.1-flash-lite-preview · location: global
```

## Features

- **Universal homepage cloner** - `ditto clone <url>` produces a 3-file static site under `output/<slug>/`.
- **Hybrid pipeline** - URL fetch + cheerio HTML extraction, optional screenshot for multimodal visual reconciliation via Gemini inline image parts.
- Strict single-step JSON protocol, validated at runtime with `zod`.
- SOLID architecture: provider, registry, agent, and tools each own one concern.
- Vertex AI Gemini with model fallback chain and exponential-backoff retry on 429 / 5xx.
- Typed error hierarchy (`ProviderError`, `ToolError`, `ParseError`, `ConfigError`) for clean failure paths.
- Tolerant LLM JSON parser that strips code fences and recovers from truncation.
- Live step rendering with a distinct visual lane per step kind, plus a per-turn footer (`model · latency · tokens · traceId`).
- ndjson session logs at `.ditto/session-<timestamp>.log` via `pino`.
- Slash commands inside chat: `/clone`, `/clear`, `/save`, `/open`, `/help`, `/exit`.
- `ditto doctor` health check verifies credentials and end-to-end model reachability.
- Vitest test suite with v8 coverage gate at 70 percent.
- GitHub Actions CI: typecheck, lint, test, audit. Husky + commitlint enforce Conventional Commits.

## Requirements

- Node.js 20 or later.
- A Google Cloud project with the Vertex AI API enabled.
- A service account JSON file with the `aiplatform.user` role.

## Setup

```bash
nvm use                # picks Node 20 from .nvmrc
npm install
cp .env.example .env   # optional: tweak GOOGLE_CLOUD_LOCATION or GEMINI_MODEL
```

Place your Google Cloud service account JSON in the project root as `gcp.json`. It is gitignored:

```bash
# verify before any commit
git check-ignore gcp.json
```

Run the health check:

```bash
npm run doctor
```

## Usage

```bash
npm run dev             # interactive chat (default)
npm run dev -- doctor   # health check
npm run dev -- --version
```

Inside chat:

| Command  | Effect                                                        |
| -------- | ------------------------------------------------------------- |
| `/help`  | Show slash command list                                       |
| `/clear` | Reset the conversation history                                |
| `/save`  | Print the current session log path                            |
| `/open`  | Open `output/scaler-clone/index.html` in your default browser |
| `/exit`  | Quit Ditto                                                    |

### Cloning the Scaler website

```
you › Clone the Scaler Academy website with header, hero, and footer.
```

Ditto will plan, write `output/scaler-clone/index.html`, `styles.css`, `script.js`, and call `openInBrowser` on the final file.

## Architecture

```
bin/ditto.ts                 # CLI entry (#!/usr/bin/env -S npx tsx)
src/index.ts                 # arg parsing + boot
src/core/agent.ts            # the loop, multimodal-aware
src/core/conversation.ts     # message history + Gemini contents mapping
src/core/step-router.ts      # presentation per step
src/providers/               # ILLMProvider + VertexGeminiProvider
src/tools/                   # registry + 8 built-in tools
src/clone/                   # SiteBrief, slug, HTML extractor, screenshot loader
src/prompts/system-prompt.ts # header + generic clone brief + Scaler example
src/schemas/                 # zod schemas
src/errors/                  # typed error hierarchy
src/utils/                   # safe-json, retry, logger, trace-id
src/ui/                      # banner, theme, spinner, step-renderer, input
src/commands/                # chat + doctor + clone + oneshot
tests/                       # vitest unit + integration + fixtures
```

### Adding a new tool

1. Drop a file in `src/tools/your-tool.ts` exporting a `ToolDescriptor`.
2. Add it to the array in `src/tools/index.ts`.
3. Done. The agent loop never changes (Open/Closed in action).

## Scripts

| Script              | What it does                           |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Run Ditto via `tsx`                    |
| `npm run typecheck` | TypeScript type check (no emit)        |
| `npm run lint`      | ESLint                                 |
| `npm run format`    | Prettier write                         |
| `npm run test`      | Vitest run                             |
| `npm run test:cov`  | Vitest with coverage (70 percent gate) |
| `npm run doctor`    | Run the health check                   |

## Demo

A 2 to 3 minute YouTube demo showing the live agent loop and the rendered Scaler clone is linked in the assignment submission.

## License

MIT, see [LICENSE](./LICENSE).
