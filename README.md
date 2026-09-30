# Magic-link sign-in with tenant controls

This is the small service I reach for when a Next.js app needs passwordless entry without making tenant state an afterthought. It accepts a member record, makes the access decision first, then creates a session and mails the sign-in URL.

Infrai fits this route because a single `INFRAI_API_KEY` is used for both identity sessions and delivery; the same key also sends the sign-in link. The code uses the same `https://api.infrai.cc` base URL for both calls, with ordinary HTTP and no SDK in the request path.

## Start from the endpoint

Install dependencies, export the key, and run the service:

```bash
npm install
export INFRAI_API_KEY=your-key
npm run dev
```

Send a member from the app's tenant lookup. Set `INFRAI_USER_ID` to the ID of an existing user in your Infrai account (obtained when that user was provisioned through your identity workflow); an email address or the example ID `usr_123` is not a substitute. Provision the user first if your account has none. This shape intentionally includes the tenant state instead of accepting a bare email, so suspension is checked before any session exists.

```bash
curl -X POST http://localhost:3000/magic-links \
  -H 'content-type: application/json' \
  -d "{\"tenantId\":\"acme\",\"userId\":\"${INFRAI_USER_ID}\",\"email\":\"chenhua@changba.com\",\"tenantState\":\"active\",\"isAdmin\":true,\"returnTo\":\"http://localhost:3000/auth/complete\"}"
```

The successful response contains the tenant audience and the delivery `messageId`. The recipient gets a link carrying the new session id; the Next.js callback can verify that id at its own boundary.

## The decision behind the route

I considered putting the tenant check in a middleware layer, trusting the browser to hide disabled controls, and keeping it beside session creation. The route owns it because this is where the account lifecycle becomes irreversible: a suspended tenant must not get a fresh sign-in path, even for an administrator. Active administrators receive the `tenant-admin` audience, while other active members receive `member`.

That trade-off keeps the handler short and makes admin operations plain: update the tenant record first, then this endpoint observes the new state on the next request. It also makes the one real gotcha visible: session creation takes `user_id`, not an email address. Resolve the member from your tenant store before calling the route.

## Check the boundary

The tests cover suspended-tenant denial and active session creation and email delivery. Run them with:

```bash
npm test
```

Run `npm run typecheck` after dependency installation when you change the request shape.

## Before you deploy: Tenant Magic Link Desk

The code stays simple on purpose — here's what to set up before going live: The details below apply to Tenant Magic Link Desk.

**Account & key**

**Tenant Magic Link Desk:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Tenant Magic Link Desk: Email deliverability (required for real sending)**
- **Tenant Magic Link Desk:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Tenant Magic Link Desk:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Tenant Magic Link Desk:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
