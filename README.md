# Booking SaaS API (v1)

Multi-tenant booking API for barbershops, salons, gyms, and clinics — Node.js
+ Express 5 + Prisma 7 + PostgreSQL.

## Quick start

```bash
pnpm install
cp .env.example .env        # already done for you locally — see .env
pnpm exec prisma generate   # regenerates the client with the new User fields
pnpm exec prisma migrate dev --name add_user_auth_fields
pnpm dev                    # nodemon, http://localhost:3000
```

`.env` already has working local values for everything except Stripe — fill
in `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` from your Stripe dashboard
(test mode) when you get to payments. For local webhook testing, use the
[Stripe CLI](https://stripe.com/docs/stripe-cli): `stripe listen --forward-to
localhost:3000/api/payments/webhook`.

## Structure

```
app.js                  Express app: middleware, route mounting, error handling
server.js               Boot: DB connectivity check, listen, graceful shutdown
src/
  config/                env.js (validated env vars), prisma.js (client singleton)
  middlewares/           auth, authorize (RBAC), tenant, rate limiters, validation, errors
  utils/                 ApiError, JWT helpers, password hashing, slugify, time helpers, ...
  validators/            zod schemas shared across modules (id params, pagination)
  modules/<name>/        one folder per resource:
    <name>.route.js       Express router — path + middleware wiring only
    <name>.controller.js  parses req, calls the service, sends the response
    <name>.service.js     business logic + Prisma calls (all tenant-scoped)
    <name>.validator.js   zod request schemas
```

Every module follows this same route → controller → service shape, so once
you're familiar with one (e.g. `customers`), the rest read the same way.

## Auth

JWT access + refresh, not Firebase (the ERD had a `firebaseId` column staged
for it — left in place, now optional, in case you want social login later).

- **Access token** — 15 min, `Authorization: Bearer <token>`, never in a cookie.
- **Refresh token** — 30 days, httpOnly cookie scoped to `/api/auth`, rotated
  on every use.
- **Revocation** — `User.tokenVersion` is bumped on logout and on password
  change, which instantly invalidates every refresh token issued before that
  point. No separate token-blacklist table needed.
- Passwords are hashed with bcrypt (12 rounds). `POST /api/auth/register`
  creates a **business + its OWNER user** together, in one transaction.

## Multi-tenancy & security

- Every authenticated request carries `businessId` in the signed access
  token (set at login, never trusted from the request body/query). All
  service-layer queries filter by it — that's what makes cross-tenant data
  access structurally impossible rather than something each handler has to
  remember to check.
- Role-based route guards (`OWNER > ADMIN > MANAGER > RECEPTIONIST/STAFF`,
  see `authorize.middleware.js`); `STAFF` is additionally restricted to
  their own appointments in the controller layer.
- `helmet`, `cors` (with `credentials: true` for the refresh cookie),
  rate limiting (general + stricter limits on login/register/public booking),
  `zod` validation on every route that takes input, centralized error
  handling that never leaks stack traces or raw DB errors outside development.

## The availability engine

`src/modules/availability/availability.helpers.js` is pure, dependency-free
logic (given some numbers, returns some numbers) and is unit-testable
without a database — that's deliberate, since this is the part worth being
most confident about. `availability.service.js` wraps it with the actual
Prisma queries (working hours → overrides → blocked time → existing
appointments → candidate slots).

Precedence, most-specific wins: a staff member's own `ScheduleOverride` for
that date beats a business-wide override, which beats their own
`WorkingHours` for that day of week, which beats the business default.

Buffer is modeled as trailing time after a booking (existing or candidate) —
two bookings' `[start, end + buffer)` windows must not overlap. All day/time
math is done in the **business's own timezone** (`Business.timezone`), not
UTC or the server's local time, then converted to UTC for storage/comparison.

`appointments.service.js` reuses this exact same window-resolution logic
(`resolveStaffWindow`) to reject a booking outside working hours, and wraps
creation/rescheduling in a `SERIALIZABLE` transaction with automatic retry
(`withSerializableRetry`) so that two people booking the same slot at the
same moment can't both succeed — Postgres itself catches the race, not just
an availability check the client saw a second earlier.

## Payments (Stripe)

- `POST /api/payments/create-intent` is intentionally **unauthenticated** —
  the customer paying from the public booking page has no staff account.
  It only works against a real, unpaid `appointmentId` and is rate-limited.
- `POST /api/payments/webhook` is registered in `app.js` **before** the
  global `express.json()`, with its own `express.raw()` — Stripe signature
  verification needs the exact raw request bytes. This is the *only* place a
  card payment is ever marked `PAID`; nothing else trusts client input for that.
- Webhook handling is idempotent (Stripe can deliver an event more than once).
- CASH payments are recorded directly by staff via `POST /api/payments`.
  Refunds call the Stripe API for CARD payments; CASH refunds just update
  the record.

## Deliberately out of scope for v1

- `GET /api/search` — spec marks it optional for MVP; each resource already
  has its own filtering (e.g. `GET /api/customers/search`).
- Email/SMS notifications, background jobs, caching — spec's own phase plan
  puts these after the core booking flow.
- A bulk "replace business default hours" endpoint — the spec only calls
  this out for staff (`PUT /api/working-hours/staff/:staffId`); business
  defaults use the same POST/PATCH/DELETE per-day endpoints.
- `business-settings.prisma` is still an empty stub — nothing in the spec
  defines its shape yet, so it's untouched rather than guessed at.

## Schema changes made

`prisma/schema/models/user.prisma`: added `passwordHash` (required) and
`tokenVersion` (default 0); changed `firebaseId` from required to optional.
Run the migrate command above to apply it — this repo's sandbox couldn't
reach Prisma's engine-binary host to do it for you.
