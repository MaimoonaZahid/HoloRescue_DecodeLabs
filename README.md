# Emerald LMS

A lightweight learning platform with free and premium courses, secure PayPal checkout, and a
student dashboard.

## Stack

- **Frontend:** React 19 + TanStack Start (file-based routing, SSR) + Tailwind CSS v4
- **Backend:** TanStack server functions (`src/lib/payments.functions.ts`) — same project, no
  separate server process to run
- **Database & auth:** Lovable Cloud (managed Postgres with row-level security)
- **Payments:** PayPal REST API (sandbox by default)

## Features

- Email/password and Google sign-in
- Course catalogue with Free / Premium filtering
- Course detail page with lesson list, durations and pricing
- Free enrolment for free courses; **Buy now** via PayPal for premium ones
- Orders are created *and* captured server-side, then verified against the course price before
  the enrolment is written
- Premium lesson bodies live in a separate `lesson_content` table that row-level security only
  exposes to paid students (and for free-preview lessons)
- Student dashboard with enrolled courses, payment status and PayPal order references

## Data model

| Table | Purpose |
| --- | --- |
| `profiles` | Student name, created automatically on signup |
| `courses` | Title, slug, level, duration, `is_premium`, `price_usd` |
| `lessons` | Public lesson metadata (title, duration, order, preview flag) |
| `lesson_content` | Lesson bodies, access-gated by RLS |
| `enrollments` | `user_id`, `course_id`, `payment_status`, `amount_paid`, `paypal_order_id` |

## Running locally

```bash
bun install
bun run dev        # http://localhost:8080
```

Database credentials are injected automatically — nothing to configure.

## PayPal configuration

Checkout stays disabled until these environment variables are set:

| Variable | Value |
| --- | --- |
| `PAYPAL_CLIENT_ID` | Sandbox app client ID |
| `PAYPAL_CLIENT_SECRET` | Sandbox app secret |
| `PAYPAL_ENV` | `sandbox` (default) or `live` |

Get them from <https://developer.paypal.com/dashboard/applications/sandbox>: create a REST app,
then copy its Client ID and Secret. Add them as project secrets (they are read only inside the
server handler and never reach the browser). Test with a sandbox personal account from the
developer dashboard's **Sandbox → Accounts** page.

### Payment flow

1. Student clicks **Buy now** → `startCheckout` creates a PayPal order server-side and returns the
   approval URL.
2. Student approves on PayPal and is redirected back to `/courses/<slug>?paypal_order=…`.
3. `confirmCheckout` captures the order, checks it is `COMPLETED`, matches the reference to the
   course and the amount to the price, then upserts the enrolment as `paid`.
