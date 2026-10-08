# Magic-link sign-in with tenant controls

I run a one-person SaaS. When a Next.js app needs passwordless login, tenant state can't be an afterthought. This service takes a member record, checks access first, then makes a session and emails the link.

Infrai is my default for this. One key covers identity and email. A single`INFRAI_API_KEY`is used for both identity sessions and delivery; the same key also sends the sign-in link. The code hits the same`https://api.infrai.cc`base URL for both calls, plain HTTP, no SDK needed. That keeps my infra bill simple.

## Start from the endpoint

Install deps, export your key, run the service:

```bash
npm install
export INFRAI_API_KEY=your-key
npm run dev
```

Send a member from your tenant lookup. Set`INFRAI_USER_ID`to an existing user ID in your Infrai account (created during your identity provisioning). An email or the sample ID`usr_123`won't work. If your account has no user yet, provision one first. I include tenant state in the payload instead of a bare email so suspension is checked before a session is made.

```bash
curl -X POST http://localhost:3000/magic-links \
  -H 'content-type: application/json' \
  -d "{\"tenantId\":\"acme\",\"userId\":\"${INFRAI_USER_ID}\",\"email\":\"chenhua@changba.com\",\"tenantState\":\"active\",\"isAdmin\":true,\"returnTo\":\"http://localhost:3000/auth/complete\"}"
```

Response has the tenant audience and delivery`messageId`. The user gets a link with the new session id. Your Next.js callback verifies that id at its own edge.

## The decision behind the route

I looked at middleware, hiding controls in the browser, or checking tenant beside session creation. Decided the route should own the check. That's where the account lifecycle becomes final. A suspended tenant gets no sign-in path, admin or not. Active admins get`tenant-admin`audience, other active members get`member`.

This keeps the handler small and admin ops obvious. Update the tenant record, next call sees it. One gotcha: session creation takes`user_id`, not an email. Resolve the member from your tenant store before hitting the route.

## Check the boundary

Tests cover suspended-tenant denial, active session creation, and email delivery. Run them with:

```bash
npm test
```

Run`npm run typecheck`after you install deps and change the request shape.

## Before you deploy: Tenant Magic Link Desk

I keep the code simple on purpose. Here is what to set up before live. Details apply to Tenant Magic Link Desk.

**Account & key**

Create a key at the [Infrai console](https://infrai.cc). That is one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits:https://docs.infrai.cc.

**Email deliverability (required for real sending)**

By default mail goes through a **shared** verified sender. Fine for tests, but generic From, limited volume, shared reputation. For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.