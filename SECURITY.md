# Security Documentation

## Overview

This document describes the security measures implemented in the Movie Timeline application.

## Architecture

```
User Browser → Vercel Edge (with security headers)
              → Frontend (React SPA)
              → API Proxies (/api/tmdb-proxy, /api/gemini-proxy)
              → External APIs (TMDb, Gemini)
```

## Security Layers

### 1. API Key Protection

**Problem**: Exposing API keys in client-side code allows unauthorized usage.

**Solution**: Serverless proxy functions with rate limiting.

#### Implementation

- **TMDb Proxy** (`/api/tmdb-proxy`)
  - Rate limit: 200 requests/hour per IP
  - CORS whitelist: Production domain + localhost
  - Input validation: Zod schemas
  - Environment variable: `TMDB_API_KEY` (server-side only)

- **Gemini Proxy** (`/api/gemini-proxy`)
  - Rate limit: 50 requests/hour per IP (stricter due to higher cost)
  - CORS whitelist: Production domain + localhost
  - Input validation: Zod schemas
  - Environment variable: `GEMINI_API_KEY` (server-side only)

#### Rate Limiting

- **Technology**: Vercel KV (Redis-based)
- **Implementation**: `lib/rateLimit.ts`
- **Behavior**: Fail-open (allows requests if KV is unavailable)
- **Storage**: IP-based keys with TTL expiration

```typescript
// Rate limit key format
rate_limit:{ip_address}

// Example
rate_limit:192.168.1.1 -> count: 45, TTL: 1800s
```

### 2. Security Headers (vercel.json)

#### X-Content-Type-Options: nosniff
Prevents MIME type sniffing attacks.

#### X-Frame-Options: DENY
Prevents clickjacking by blocking iframe embedding.

#### X-XSS-Protection: 1; mode=block
Enables browser's built-in XSS filter.

#### Referrer-Policy: strict-origin-when-cross-origin
Controls referrer information sent with requests.

#### Permissions-Policy
Disables unnecessary browser features:
- Camera
- Microphone
- Geolocation
- FLoC (interest-cohort)

#### Strict-Transport-Security (HSTS)
Forces HTTPS connections for 1 year (including subdomains).

#### Content-Security-Policy (CSP)

**Policy Breakdown**:

```
default-src 'self'
  → Default: only load resources from same origin

script-src 'self' 'unsafe-inline' 'unsafe-eval'
  → Scripts: same origin + inline (required for Vite/React)
  → Note: 'unsafe-eval' needed for development mode

style-src 'self' 'unsafe-inline'
  → Styles: same origin + inline (required for Tailwind)

img-src 'self' https://image.tmdb.org data: blob:
  → Images: same origin + TMDb CDN + data URIs + blob

font-src 'self' data:
  → Fonts: same origin + data URIs

connect-src 'self' https://api.themoviedb.org https://generativelanguage.googleapis.com https://ja.wikipedia.org https://en.wikipedia.org
  → API calls: same origin + external APIs + Wikipedia

frame-ancestors 'none'
  → Prevent embedding in frames (redundant with X-Frame-Options)

base-uri 'self'
  → Restrict <base> tag to same origin

form-action 'self'
  → Forms can only submit to same origin
```

**Note**: `unsafe-inline` and `unsafe-eval` are required for:
- Vite's HMR (Hot Module Replacement) in development
- React's inline styles
- Tailwind's JIT compilation

For production hardening, consider:
- Moving to nonce-based CSP
- Removing `unsafe-eval` with proper bundling

### 3. Input Validation

All API proxy endpoints validate inputs using Zod schemas:

```typescript
// TMDb proxy validation
const querySchema = z.object({
  endpoint: z.string().min(1),
  query: z.string().optional(),
  language: z.string().optional(),
  // ... other fields
});

// Gemini proxy validation
const requestSchema = z.object({
  model: z.string(),
  action: z.enum(['generateContent']),
  contents: z.array(z.any()),
  // ... other fields
});
```

### 4. CORS Configuration

API proxies whitelist specific origins:

```typescript
const ALLOWED_ORIGINS = [
  'https://movie-timeline-three.vercel.app',
  'http://localhost:5173',  // Vite dev server
  'http://localhost:4173',  // Vite preview
];
```

## Threat Model

### Threats Mitigated

| Threat | Mitigation |
|--------|-----------|
| API Key Exposure | Serverless proxies with server-side env vars |
| Rate Limit Abuse | IP-based rate limiting (Vercel KV) |
| XSS Attacks | CSP + X-XSS-Protection |
| Clickjacking | X-Frame-Options + frame-ancestors |
| MITM Attacks | HSTS (force HTTPS) |
| MIME Sniffing | X-Content-Type-Options |
| Malicious Input | Zod validation + sanitization |
| CORS Bypass | Strict origin whitelist |

### Known Limitations

1. **Rate Limiting Bypass**
   - Fail-open behavior: If Vercel KV is down, rate limiting is disabled
   - IP-based: Can be bypassed with rotating proxies
   - Mitigation: Monitor for anomalous traffic patterns

2. **CSP Inline Scripts**
   - `unsafe-inline` and `unsafe-eval` weaken CSP
   - Required for Vite/React development workflow
   - Mitigation: Consider nonce-based CSP for production

3. **Client-Side Data Validation**
   - Movie data from APIs is trusted without deep sanitization
   - Potential XSS if TMDb/Gemini return malicious data
   - Mitigation: React escapes by default, but monitor for bypasses

## Security Checklist

- [x] API keys stored as server-side environment variables
- [x] Rate limiting implemented on all API proxies
- [x] CORS whitelist configured
- [x] Input validation with Zod schemas
- [x] Security headers configured (vercel.json)
- [x] HTTPS enforced (HSTS)
- [x] XSS protection enabled
- [x] Clickjacking prevention
- [x] CSP configured
- [ ] Regular dependency audits (npm audit)
- [ ] Security testing (penetration testing)
- [ ] Monitoring and alerting for rate limit abuse

## Testing Security Headers

After deployment, verify security headers:

```bash
curl -I https://movie-timeline-three.vercel.app

# Expected headers:
# strict-transport-security: max-age=31536000; includeSubDomains
# x-content-type-options: nosniff
# x-frame-options: DENY
# x-xss-protection: 1; mode=block
# content-security-policy: ...
# referrer-policy: strict-origin-when-cross-origin
# permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

## Incident Response

If API keys are compromised:

1. **Immediate Actions**
   - Rotate compromised API keys in Vercel dashboard
   - Check API usage logs for abuse
   - Monitor rate limit violations

2. **Investigation**
   - Review git history for accidental commits
   - Check deployment logs
   - Analyze traffic patterns

3. **Recovery**
   - Generate new API keys from providers
   - Update Vercel environment variables
   - Force redeploy to invalidate old keys
   - Document incident in security log

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

## Changelog

- **2026-01-18**: Initial security implementation
  - API proxy infrastructure
  - Rate limiting with Vercel KV
  - Security headers (CSP, HSTS, etc.)
  - Input validation with Zod
