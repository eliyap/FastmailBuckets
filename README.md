# Email Buckets

Groups your unread Fastmail inbox by sender. Runs entirely in the browser — no backend.

## Setup

```
npm install
npm run dev
```

Enter your Fastmail API token when prompted. It's stored in `localStorage`.

## Build

```
npm run build
```

Produces a single `dist/index.html` you can open directly or host anywhere.

## Token

Create a read-only API token at [Fastmail Settings > Privacy & Security > API tokens](https://app.fastmail.com/settings/security/tokens). Grant it `Mail` read-only access.
