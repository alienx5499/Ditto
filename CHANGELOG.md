# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Universal homepage cloner. `ditto clone <url>` produces a self-contained 3-file static site under `output/<slug>/` for any public landing page.
- New `extractSite` tool. Fetches a URL and returns a structured `SiteBrief` (palette, fonts, headings, nav, CTAs, footer columns, social links, detected sections, JS-app heuristic).
- Multimodal input. `--screenshot path` attaches an inline image to the first user turn for higher visual fidelity.
- `/clone <url>` slash command in interactive chat.
- New `src/clone/` module: `extract.ts`, `slug.ts`, `screenshot.ts`, `site-brief.ts`.
- HTML extractor unit tests + clone-flow integration test (canned provider).
- Refactored `src/prompts/system-prompt.ts` into header + generic clone brief + Scaler worked example + protocol few-shot.
- Initial scaffold of Ditto CLI agent.
- Vertex AI Gemini provider with model fallback chain and exponential backoff retry.
- Tool registry with eight built-in tools: `executeCommand`, `writeFile`, `readFile`, `makeDirectory`, `listDirectory`, `fetchUrl`, `openInBrowser`, `extractSite`.
- Agent loop implementing START / THINK / TOOL / OBSERVE / OUTPUT with iteration cap and wall-clock budget. Multimodal-aware (`runTurn` accepts inline images).
- ASCII banner, themed step renderer, slash commands.
- `ditto doctor` health check.
- Vitest test suite with v8 coverage gate at 70 percent.
- GitHub Actions CI: typecheck, lint, test, audit.
