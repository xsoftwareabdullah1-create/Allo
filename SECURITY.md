# Security Policy

## Supported versions

Security fixes target the latest code on `main`. There are no long-term support branches yet.

## Reporting a vulnerability

Do not publish an exploitable vulnerability in a public issue. Use GitHub's **Report a vulnerability** flow in the repository Security tab when available. Include impact, affected commit, safe reproduction steps and suggested mitigation. Never include passwords, API keys, private model data or personal information.

## Deployment security

- Put internet-facing deployments behind HTTPS.
- Use long, unique `ALLO_USERNAME`, `ALLO_PASSWORD` and `ALLO_API_KEY` values.
- Keep secrets in environment variables or a secret manager; never commit them.
- Restrict network access to Allo.
- Never expose the Ollama port directly to the public internet.
- Treat prompts, images, model output and workspace backups as sensitive.
- Back up Allo and Ollama persistent volumes securely.

Allo currently provides single-user Basic authentication, not a hardened multi-user identity system. Review README limitations before exposing an instance to untrusted users.
