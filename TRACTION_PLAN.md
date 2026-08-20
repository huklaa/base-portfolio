# Traction Measurement Plan

## Goal

Measure whether Base Portfolio Explorer is becoming useful without collecting wallet-owner identity, cookies, private wallet data, or cross-site profiles.

## Metrics that matter before an accelerator application

### Reach
- unique visitors
- page views
- mobile vs desktop share
- referring hosts

### Product use
- addresses analyzed per period
- share-card/profile-share actions
- returning sessions
- feedback submissions

### Quality
- analysis completion rate
- explorer/API failure rate
- median analysis duration
- percentage of analyses with partial coverage warnings

## Privacy rules

1. Never send the analyzed wallet address to a general-purpose analytics provider.
2. Never send token balances, portfolio value, NFTs, transaction hashes, counterparties, Builder Codes, or profile JSON to analytics.
3. Do not add advertising IDs, fingerprinting, cross-site identifiers, or session replay.
4. Prefer aggregate page-level analytics with no cookies.
5. Product-event analytics, if added later, should use coarse event names only (for example `analysis_completed`) with no address or financial payload.

## Recommended first activation: Cloudflare Web Analytics

Cloudflare Web Analytics is suitable for the first traction layer because it can be installed on a site that is not proxied through Cloudflare and provides privacy-first aggregate web analytics without changing DNS. It gives page views, visitors, referrers, device/browser information and performance metrics.

Important limitation: Cloudflare Web Analytics currently does **not** support custom events. Therefore it should be used for reach and web-performance evidence, not as a fake substitute for `Analyze`, `Share`, or `Download` event counts.

### Setup for the current GitHub Pages site

1. Create/open a Cloudflare account.
2. Go to **Web Analytics → Add a site**.
3. Add hostname `huklaa.github.io`.
4. Copy the generated JavaScript beacon snippet from **Manage site**.
5. Add that exact snippet to `index.html` immediately before `</body>`.
6. Verify visits appear in Cloudflare Web Analytics after deployment.

The site token in Cloudflare's browser snippet is a public site identifier, not a secret API credential. Still, use the exact generated snippet rather than guessing a token.

## Product-event layer (later)

Cloudflare page analytics alone cannot tell us how many people successfully analyze an address or share a profile. A second privacy-preserving event endpoint can be added later with a tiny event schema:

```json
{
  "event": "analysis_completed",
  "version": 1
}
```

Allowed event names should be strictly enumerated. No wallet address or analysis result should ever be attached.

Suggested coarse events:
- `analysis_started`
- `analysis_completed`
- `analysis_failed`
- `profile_shared`
- `base_card_downloaded`
- `json_profile_downloaded`
- `feedback_opened`

Until a trustworthy event backend is selected, these events should not be sent anywhere.

## Qualitative traction

A public feedback link to the repository can provide useful evidence alongside aggregate traffic:
- bug reports
- feature requests
- builder feedback
- requests for API access

For an accelerator application, a small number of concrete user/builder comments is more useful than inflated vanity metrics.

## Application evidence package

Before submitting, capture:
- 7-day and 30-day unique visitors/page views
- mobile share
- top referrers
- screenshots of aggregate analytics
- number of user-submitted feedback items
- number of shared public profile links observed through referrals where available
- a short changelog showing how feedback changed the product

Do not claim metrics we cannot independently measure.