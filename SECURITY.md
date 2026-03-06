# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability in s2, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please report vulnerabilities through one of the following channels:

- **GitHub Security Advisories**: Use the [private vulnerability reporting](https://github.com/daulric/s2/security/advisories/new) feature on GitHub.
- **Email**: Contact the maintainer directly at [daulric's GitHub profile](https://github.com/daulric).

### What to include

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any relevant logs, screenshots, or proof-of-concept code
- Suggested fix, if you have one

### Response timeline

- **Acknowledgment**: Within 48 hours of the report
- **Status update**: Within 7 days with an initial assessment
- **Fix or mitigation**: Targeted within 30 days depending on severity

## Security Measures

This project employs the following automated security tooling:

- **[CodeQL](https://codeql.github.com/)** — Static analysis for JavaScript/TypeScript and GitHub Actions, running on every push, pull request, and on a weekly schedule.
- **[OSV-Scanner](https://google.github.io/osv-scanner/)** — Dependency vulnerability scanning against the OSV database, running on pushes, pull requests, and on a weekly schedule.
- **[Dependabot](https://docs.github.com/en/code-security/dependabot)** — Automated dependency update monitoring for npm packages on a weekly cadence.

## Scope

The following areas are in scope for security reports:

- Authentication and session management (Supabase Auth)
- Authorization and access control
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Server-side request forgery (SSRF)
- Injection vulnerabilities (SQL, NoSQL, command)
- Sensitive data exposure
- Insecure file upload handling
- Broken access control on video/user resources

The following are **out of scope**:

- Vulnerabilities in third-party services (Supabase, Vercel, Cloudflare)
- Denial of service (DoS) attacks
- Social engineering
- Issues requiring physical access to a user's device
- Automated scanner output without a demonstrated impact

## Best Practices for Contributors

- Never commit secrets, API keys, or credentials (`.env`, `credentials.json`, etc.)
- Use environment variables for all sensitive configuration
- Validate and sanitize all user inputs using Zod schemas
- Follow the principle of least privilege for Supabase RLS policies
- Keep dependencies up to date and review Dependabot PRs promptly
