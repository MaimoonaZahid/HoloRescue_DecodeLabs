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
