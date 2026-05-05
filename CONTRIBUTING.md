# Contributing to Ditto

Thanks for considering a contribution.

## Quick start

```bash
nvm use
npm install
cp .env.example .env
# Place your Google Cloud service account JSON at ./gcp.json
npm run dev
```

## Workflow

1. Fork and create a branch off `main` (`feat/...`, `fix/...`).
2. Add or update tests for any behavior change.
3. Run the full local pipeline before pushing:

   ```bash
   npm run typecheck
   npm run lint
   npm run test:cov
   ```

4. Use [Conventional Commits](https://www.conventionalcommits.org/) for messages. The `commit-msg` hook will enforce this.
5. Open a PR with a clear summary and link any related issues.

## Code style

- TypeScript strict mode. No `any` unless justified in a comment.
- Single Responsibility: one concern per file.
- Validate every external boundary with `zod`.
- Surface errors as typed subclasses of `DittoError`.

## Reporting issues

Use the issue templates under `.github/ISSUE_TEMPLATE/`. Include reproduction steps and Ditto version (`ditto --version`).
