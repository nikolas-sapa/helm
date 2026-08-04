# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email **niksapa150@gmail.com** with:

- A description of the vulnerability and its impact.
- Steps to reproduce (a minimal repro is ideal).
- Any relevant logs, versions, or configuration.

You should get an acknowledgment within a few days. We'll work with you to
confirm the issue, assess severity, and land a fix before any public
disclosure.

Given the trust model Helm implements (admin-gated deploy, parent-proxied LLM
key, per-agent execution isolation), reports touching `packages/runtime`
(bundle execution, key auth) or the control-plane admin gate are especially
welcome.

## Supported Versions

Helm does not yet have tagged releases. Security fixes are applied to the
`main` branch; there is no separate maintenance branch at this stage.

| Version | Supported |
|---|---|
| `main` | Yes |
