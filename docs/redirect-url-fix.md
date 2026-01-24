# Redirect URL Fix - localhost:3000 Issue

## Problem

When redirecting after user signup (and other API operations) in production, users were being redirected to `https://localhost:3000` instead of the actual domain (e.g., `https://zeorabbit.com`). This caused an SSL error in the browser:

```
GET https://localhost:3000/member net::ERR_SSL_PROTOCOL_ERROR
```

## Root Cause

Many API route handlers were using `req.url` directly in `NextResponse.redirect()`:

```typescript
// ❌ INCORRECT - uses internal URL
return NextResponse.redirect(new URL("/member", req.url), 303);
```

In production environments behind a reverse proxy (Nginx, Vercel, etc.), `req.url` contains the internal server URL (`localhost:3000`) rather than the public-facing URL (`https://zeorabbit.com`).

## Solution

Use the `getBaseUrl(req)` helper function which properly extracts the base URL from reverse proxy headers:

```typescript
import { getBaseUrl } from "@/server/url-helpers";

export async function POST(req: Request) {
  const baseUrl = getBaseUrl(req);
  
  // ✅ CORRECT - uses proper base URL
  return NextResponse.redirect(new URL("/member", baseUrl), 303);
}
```

### What `getBaseUrl()` does

The helper function (`src/server/url-helpers.ts`) checks for reverse proxy headers:

1. Reads `x-forwarded-proto` and `x-forwarded-host` headers
2. If present, constructs URL from those headers (e.g., `https://zeorabbit.com`)
3. Otherwise, falls back to `req.url`

## Fixed Files

A total of **27 files** were fixed:

### Core Authentication & User Flow
- ✅ `src/app/api/auth/signup/route.ts` - **CRITICAL** (original issue)
- ✅ `src/app/api/auth/login/route.ts`
- ✅ `src/app/api/auth/logout/route.ts`
- ✅ `src/app/api/dev/promote-admin/route.ts`

### Payment & Billing
- ✅ `src/app/api/advertiser/topups/route.ts` - **HIGH PRIORITY**
- ✅ `src/app/api/advertiser/product-orders/route.ts`

### Member Experience
- ✅ `src/app/api/member/reward/campaigns/[id]/join/route.ts` - **HIGH PRIORITY**
- ✅ `src/app/api/member/participations/route.ts`
- ✅ `src/app/api/member/participations/[id]/evidence/route.ts`
- ✅ `src/app/api/member/payouts/route.ts`
- ✅ `src/app/api/member/payout-accounts/route.ts`

### Rewarder (Legacy)
- ✅ `src/app/api/rewarder/participations/route.ts`
- ✅ `src/app/api/rewarder/participations/[id]/evidence/route.ts`
- ✅ `src/app/api/rewarder/payouts/route.ts`
- ✅ `src/app/api/rewarder/payout-accounts/route.ts`

### Admin Operations
- ✅ `src/app/api/admin/products/route.ts`
- ✅ `src/app/api/admin/products/[id]/route.ts`
- ✅ `src/app/api/admin/participations/[id]/approve/route.ts`
- ✅ `src/app/api/admin/participations/[id]/reject/route.ts`
- ✅ `src/app/api/admin/payouts/[id]/approve/route.ts`
- ✅ `src/app/api/admin/payouts/[id]/hold/route.ts`
- ✅ `src/app/api/admin/payouts/[id]/reject/route.ts`

### Advertiser Operations
- ✅ `src/app/api/advertiser/places/route.ts`
- ✅ `src/app/api/advertiser/campaigns/route.ts`
- ✅ `src/app/api/advertiser/campaigns/[campaignId]/activate/route.ts`

### Development Tools
- ✅ `src/app/api/dev/bootstrap/route.ts`
- ✅ `src/app/api/dev/seed/route.ts`

## How to Apply the Fix

An automated script was created to fix all affected files:

```bash
node scripts/fix-redirect-urls.mjs
```

The script:
1. Scans all `route.ts` files in `src/app/api/`
2. Adds `import { getBaseUrl } from "@/server/url-helpers"`
3. Adds `const baseUrl = getBaseUrl(req);` at function start
4. Replaces all `req.url` with `baseUrl` in redirect calls

## Testing

To test the fix:

1. Deploy to production (or staging)
2. Test signup flow: `https://zeorabbit.com/signup`
3. Verify successful redirect to `/member` or `/advertiser` without SSL errors
4. Check browser network tab - redirects should use `https://zeorabbit.com`, not `localhost:3000`

## Prevention

For future API routes that perform redirects:

```typescript
import { NextResponse } from "next/server";
import { getBaseUrl } from "@/server/url-helpers";

export async function POST(req: Request) {
  const baseUrl = getBaseUrl(req);  // ← Always do this first
  
  // ... your logic ...
  
  return NextResponse.redirect(new URL("/path", baseUrl), 303);
}
```

## Related Issues

This issue can occur in any API route that:
- Uses `NextResponse.redirect()`
- Runs behind a reverse proxy (Nginx, Vercel, AWS ALB, etc.)
- Doesn't use the proper base URL

Other potential locations to check:
- Form actions that redirect
- OAuth callbacks
- Payment webhook handlers
- Any API that constructs absolute URLs

## References

- Next.js Redirect: https://nextjs.org/docs/app/api-reference/functions/redirect
- X-Forwarded Headers: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
- Helper function: `src/server/url-helpers.ts`

