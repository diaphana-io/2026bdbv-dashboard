# Security Policy

## Supported versions

Security fixes are accepted against the default branch (`main`) of this repository.

## Reporting a vulnerability

Please **do not** open a public GitHub Issue for security vulnerabilities.

Email **bdbv@diaphana.co** with a subject line starting with `[security]` and:

- A short description of the issue and its impact
- Steps to reproduce (or a proof-of-concept against a local clone)
- Affected commit SHA or release tag when known

We aim to acknowledge reports within **7 days** and to share an initial assessment within **14 days**. Coordinated disclosure is preferred; please give us a reasonable window to ship a fix before public discussion.

## Scope

This repository is the **public Map** (`/app`) — anonymous read surfaces for outbreak visualization. Curate write/UI and Cloudflare Access policies live in the private Curate repository and are out of scope for reports that only apply there.

Out of scope for this policy: social engineering, denial-of-service against third-party infrastructure you do not own, and physical attacks.
