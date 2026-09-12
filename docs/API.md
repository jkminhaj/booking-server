# API Guide

Full endpoint-by-endpoint reference: run the server and open **`/api/docs`**
(interactive Swagger UI — try requests right from the browser). The raw spec
is also at `/api/openapi.yaml` / `/api/openapi.json` if you want to import it
into Postman/Insomnia or generate a client SDK. Source: `docs/openapi.yaml`.

This page covers the things that don't fit neatly into an endpoint list.

## Base URL

```
http://localhost:3000/api
```

## Every response looks like one of these two shapes

```json
{ "success": true, "data": { ... } }
```
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

Paginated list endpoints add `"meta": { "page": 1, "limit": 20, "total": 42 }`
alongside `data`.

| Status | code                  | Meaning                                      |
| ------ | --------------------- | --------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Body/query/params failed a zod schema — check `error.details` |
| 401    | `UNAUTHORIZED`        | Missing/invalid/expired access token          |
| 403    | `FORBIDDEN`           | Valid token, wrong role                       |
| 404    | `NOT_FOUND`           | No such resource in your business             |
| 409    | `CONFLICT` / `APPOINTMENT_CONFLICT` / `STAFF_NOT_AVAILABLE` | Duplicate, or the requested slot isn't bookable |
| 429    | `TOO_MANY_REQUESTS`   | Rate limit hit — see below                    |
| 503    | `DATABASE_UNAVAILABLE`| The database is temporarily unreachable       |

## Auth flow

1. `POST /auth/register` (new business) or `POST /auth/login` — both return
   `{ accessToken, user }` in the body and set a `refreshToken` httpOnly
   cookie.
2. Send `accessToken` as `Authorization: Bearer <token>` on every other
   request. It expires in 15 minutes.
3. When you get a 401 for an expired token, call `POST /auth/refresh` — the
   browser sends the cookie automatically, no body needed — and swap in the
   new `accessToken`. It also rotates the cookie.
4. `POST /auth/logout` invalidates the refresh token immediately (and every
   other one issued before it), everywhere it's been used.

```bash
# Register a business + its first (OWNER) user
curl -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
        "business": { "name": "Apex Barbers", "email": "hi@apexbarbers.com" },
        "owner": { "name": "Jordan", "email": "jordan@apexbarbers.com", "password": "correct-horse-battery-staple" }
      }'
# -> { "success": true, "data": { "accessToken": "...", "user": { ... } } }

# Use it
curl http://localhost:3000/api/business \
  -H "Authorization: Bearer <accessToken>"

# Refresh when it expires (cookies.txt carries the refresh cookie)
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/refresh
```

## Roles

`OWNER > ADMIN > MANAGER > RECEPTIONIST / STAFF`. Each endpoint's
description in `/api/docs` says which roles it requires; there's no
endpoint that's readable without *some* authenticated role except the
public-booking and auth-entry routes below. `STAFF` is always restricted to
their own appointments, regardless of filters passed.

## What's unauthenticated

Everything else needs a bearer token. These don't:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET/POST /public/business/{slug}/...` — the customer-facing booking flow
- `POST /payments/create-intent` — the customer paying for their own booking
- `POST /payments/webhook` — called by Stripe, not a client
- `GET /health`

## Rate limits

| Bucket                          | Limit             |
| -------------------------------- | ------------------ |
| Everything under `/api`          | 300 / 15 min / IP  |
| `POST /auth/login`               | 10 / 15 min / IP (failed attempts only) |
| `POST /auth/register`            | 5 / hour / IP      |
| Public booking + payment intents | 30 / hour / IP     |

A `429` includes `Retry-After`-style timing in the standard rate-limit
response headers.

## The public booking flow, end to end

This is what a customer-facing booking page calls, in order — no auth
needed for any of it:

```
GET  /public/business/{slug}                     business info
GET  /public/business/{slug}/categories
GET  /public/business/{slug}/services?categoryId=...
GET  /public/business/{slug}/staff?serviceId=...
GET  /public/business/{slug}/availability?serviceId=...&date=...
POST /public/business/{slug}/appointments         { serviceId, staffId, startAt, customer }
POST /payments/create-intent                      { appointmentId }  -> { clientSecret }
                                                    (hand clientSecret to Stripe.js)
```

The appointment is created as `PENDING`; Stripe's webhook flips it to
`CONFIRMED` once the card payment actually succeeds.

## Regenerating this doc

`docs/openapi.yaml` is hand-maintained, not generated from code — when you
add or change an endpoint, update the matching path in that file too. It's
plain YAML with `$ref`s into `components/schemas`; copy the shape of a
similar existing endpoint rather than starting from scratch.
