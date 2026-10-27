---
title: Privacy Policy
description: How Diaphana, LLC processes personal data for the public 2026 BDBV outbreak dashboard and documentation site (GDPR-oriented notice).
---

**Last updated:** 26 October 2026

This Privacy Policy describes how we process personal data for the public dashboard and documentation site.

## Data controller

**Diaphana, LLC** is the data controller for processing described in this notice.

Contact channels are listed under [Contact](#contact).

## What this notice covers

- The public map dashboard and related public pages under `https://2026bdbv.diaphana.io/app`
- This documentation site under `https://2026bdbv.diaphana.io/docs`

You do not need an account to use these public surfaces. We do not operate a visitor profile database for the public map or docs.

## Personal data we process

Depending on how you use the services, we may process:

| Category | Examples | When |
| --- | --- | --- |
| Functional browser storage | Cookie and `localStorage` values that remember UI preferences | When you use the dashboard or docs |
| Infrastructure / security data | Request metadata such as IP address, user agent, and timestamps in hosting logs | When your browser requests pages or assets |
| Contact data | Email address, message content, GitHub account details you choose to share | Only if you email us or open a GitHub Issue / Discussion |

We do **not** use advertising cookies or third-party analytics cookies from this application.

Outbreak case data shown on the map come from curated sources. That content is not personal data about you as a visitor. See [Outbreak and map content](#outbreak-and-map-content).

## Cookies and local storage

These first-party items support the public UI. They are functional / strictly necessary for the preferences and layout you request; we do not use them for advertising or cross-site tracking.

| Name | Type | Purpose | Retention |
| --- | --- | --- | --- |
| `sidebar_state` | Cookie | Remembers whether the map sidebar is open or closed | About 7 days (`max-age`) |
| `bdbv-map-ui-v8` | `localStorage` | Map UI preferences (for example layer visibility, basemap, boundary level, panel open state, and panel positions). Older keys such as `bdbv-map-ui-v7` … `v3` may be read briefly during upgrades | Until you clear site data for this origin |
| `theme` | `localStorage` | Light / dark / system theme preference on the dashboard (default key used by `next-themes`) | Until you clear site data for this origin |
| `starlight-theme` | `localStorage` | Light / dark / auto theme preference on this documentation site (Starlight) | Until you clear site data for this origin |

The documentation site does not set first-party cookies for theme or navigation.

## Purposes

We process the data above to:

1. Provide and display the public dashboard and documentation
2. Remember your UI preferences on the same device/browser
3. Operate hosting securely and reliably (availability, abuse prevention, debugging of infrastructure)
4. Respond when you contact us through GitHub or email

## Legal bases (GDPR)

Where the GDPR applies, we rely on:

- **Article 6(1)(f) — legitimate interests**, for functional storage that improves usability of the public UI, and for security and availability of hosting. Those interests are balanced against your rights; the storage is limited to first-party preferences and ordinary request logs, with no advertising profiling.
- **Article 6(1)(b) — performance of a contract / requested service**, where processing is needed to deliver the interactive pages and preference behaviour you ask the browser to keep.
- **Article 6(1)(f) or 6(1)(b)**, as appropriate, when you voluntarily contact us so we can reply.

We do **not** currently rely on **consent** (Article 6(1)(a)) for tracking: we do not run non-essential advertising or analytics cookies. If that changes, we will update this notice and obtain consent where required.

## Recipients

| Recipient | Role |
| --- | --- |
| [Cloudflare](https://www.cloudflare.com/privacypolicy/) | Hosting, CDN, and related infrastructure for the dashboard and docs |
| [GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) | Only if you use Issues or Discussions; then GitHub processes data under its own terms |

We do **not** sell personal data.

## International transfers

Hosting and contact channels may process data outside your country, including outside the European Economic Area (for example via Cloudflare or GitHub). Those providers publish their own privacy notices and transfer mechanisms. We do not operate a separate visitor analytics pipeline that exports preference cookies to third-party marketers.

## Retention

| Data | Retention |
| --- | --- |
| Cookies | As in the table above (for example `sidebar_state` ≈ 7 days) |
| `localStorage` preferences | Until you clear them in the browser |
| Hosting / edge logs | According to the hosting provider’s defaults and configuration; we do not keep a separate long-term visitor profile store |
| Contact messages | As long as needed to handle your request and any related follow-up |

## Your rights (GDPR)

Where the GDPR applies, you may have the right to:

- Access your personal data
- Rectify inaccurate personal data
- Erase personal data
- Restrict processing
- Object to processing based on legitimate interests
- Data portability, where applicable
- Withdraw consent, where processing was based on consent (not used for tracking today)
- Lodge a complaint with a supervisory authority in your country of residence or work

Because public browsing is largely anonymous, we may only be able to fulfil certain requests if you provide enough information for us to locate data that relates to you (for example, an email you sent us). You can clear most preference data yourself by deleting cookies and site data for this origin in your browser.

To exercise rights, use [Contact](#contact).

## Your choices

- Use your browser settings to block or delete cookies and clear `localStorage` for this site.
- Changing theme or map preferences updates stored values on your device; clearing site data resets them to defaults.
- Blocking cookies may reset sidebar open/closed state on later visits.

## Children

These services are not directed at children. We do not knowingly collect personal data from children. If you believe a child has provided personal data to us, contact us and we will delete it where appropriate.

## Outbreak and map content

Numbers, cases, and related outbreak information on the map come from curated real-world sources and human-approved claims. That material is not treated as personal data about you as a visitor of the dashboard or docs.

## Changes

We may update this notice from time to time. The **Last updated** date at the top will change when we do. Continued use of the public dashboard or docs after an update means you should review the revised notice.

## Contact

- **Preferred:** [GitHub Issues](https://github.com/diaphana-io/2026bdbv-dashboard/issues) or [Discussions](https://github.com/diaphana-io/2026bdbv-dashboard/discussions) on the project repository.
- **Sensitive matters:** email [bdbv@diaphana.co](mailto:bdbv@diaphana.co).

Project background: [About](/docs/about/).
