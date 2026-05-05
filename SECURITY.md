# Security Policy

## Supported versions

Only the latest minor version receives security updates.

## Reporting a vulnerability

Please do not open a public issue for security vulnerabilities.

Instead, email the maintainer privately with:

- A clear description of the issue
- Steps to reproduce
- The impact (data exposure, code execution, denial of service, etc.)
- Any suggested mitigation

You can expect an acknowledgement within 72 hours and a fix or mitigation plan within 14 days for high-severity issues.

## Handling secrets

- `gcp.json` is gitignored by default. Do not commit it.
- API keys and service account material must come from environment variables or local-only files.
- Run `git check-ignore gcp.json` after cloning to verify your `.gitignore` is in effect.
