# VenueHub — Local Event Venue Booking & Management System

A full-stack web application built with **Next.js 14** and **Supabase** for discovering, booking, and managing local event venues.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 14 (App Router), TypeScript |
| Styling     | Tailwind CSS                        |
| Backend     | Next.js API Routes + Supabase       |
| Database    | PostgreSQL (via Supabase)           |
| Auth        | Supabase Auth                       |
| Real-time   | Supabase Realtime                   |
| Storage     | Supabase Storage                    |
| Forms       | React Hook Form + Zod               |
| Icons       | Heroicons v2                        |
| Date utils  | date-fns                            |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, register, forgot-password
│   ├── dashboard/           # Organizer dashboard
│   ├── venues/              # Browse & venue detail + book
│   ├── bookings/            # Booking list, detail, cancel
│   ├── payments/            # Organizer payment history
│   ├── manager/
│   │   ├── dashboard/       # Booking request queue
│   │   ├── venues/          # Venue CRUD
│   │   ├── calendar/        # Calendar view
│   │   └── payments/        # Financial reports
│   ├── admin/
│   │   ├── users/           # User management
│   │   └── venues/          # All venues oversight
│   ├── notifications/       # Notifications center
│   └── settings/            # Profile & password
├── components/
│   ├── layout/              # Sidebar, MarkAllRead, Settings
│   ├── venues/              # VenueCard, VenueFilters, VenueForm
│   ├── bookings/            # BookingForm, BookingActions, MessageThread
│   ├── calendar/            # VenueAvailabilityCalendar, ManagerCalendar
│   └── payments/            # PaymentPanel
├── lib/
│   ├── supabase/            # client.ts + server.ts
│   └── utils.ts             # Helpers: cn, formatCurrency, etc.
└── types/
    └── index.ts             # All TypeScript types
supabase/
└── migrations/
    └── 001_initial_schema.sql  # Full DB schema
```

---

## Setup Instructions

### 1. Clone & install

```bash
git clone <repo>
cd venuehub
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the full contents of `supabase/migrations/001_initial_schema.sql`
3. Copy your **Project URL** and **Anon Key** from Project Settings → API

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## User Roles

| Role       | Access                                                                 |
|------------|------------------------------------------------------------------------|
| Organizer  | Search venues, submit bookings, track payments, message managers       |
| Manager    | Manage venue profiles, approve/reject bookings, view calendar          |
| Admin      | View all users, all venues, all bookings across the platform           |

To register as a **Manager**, select "Venue Manager" on the register page.  
To create an **Admin**, manually update the `role` column in the `profiles` table via Supabase dashboard.

---

## Key Features

### For Organizers
- **Venue Search** — Filter by city, date, capacity, type, amenities, price
- **Venue Comparison** — Side-by-side comparison on the venue detail page
- **Step-by-step Booking** — 4-step flow: event details → date/time → equipment → review
- **Real-time Cost Calculator** — Venue fee + equipment + tax + deposit breakdown
- **Booking Management** — Track status, pay balance, send messages, cancel
- **Payment Tracking** — History of deposits, balance payments, refunds

### For Managers
- **Venue Profile CRUD** — Full venue creation with photos, layouts, equipment, policies
- **Booking Queue** — Approve or reject with notes, filter by status
- **Calendar View** — Monthly calendar with all bookings colour-coded by status
- **Financial Reports** — Revenue, outstanding balances, transaction history
- **Real-time Messaging** — Chat with organizers per booking

### Platform Features
- **Conflict Prevention** — DB-level trigger prevents double-bookings
- **Buffer Times** — Setup/cleanup buffers automatically protected
- **Notifications** — Automated notifications for all booking events
- **Role-based Access** — Row Level Security on all Supabase tables
- **Mobile Responsive** — Works on all screen sizes

---

## Database Schema

12 tables with full RLS policies:

- `profiles` — User accounts (extends Supabase auth)
- `venues` — Venue listings
- `venue_blackouts` — Unavailable date ranges
- `venue_layouts` — Seating configurations
- `venue_equipment` — Add-on equipment items
- `bookings` — Booking records with status lifecycle
- `booking_equipment` — Junction table for selected equipment
- `booking_modifications` — Change requests
- `payments` — Payment transactions
- `messages` — Booking-scoped chat
- `notifications` — System notifications
- `reviews` — Venue reviews

---

## Environment Variables

| Variable                          | Description                          |
|-----------------------------------|--------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anonymous key               |
| `SUPABASE_SERVICE_ROLE_KEY`       | Service role key (server-side only)  |
| `NEXT_PUBLIC_APP_URL`             | App base URL (for email redirects)   |
| `RESEND_API_KEY`                  | Optional — for transactional email   |

---

## Deployment

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all environment variables in the Vercel dashboard.

### Build for production

```bash
npm run build
npm start
```

---

## Prepared By

Anushe Ali (26418), Fizza Zehra (26944), Hamna Usman (26990)  
Software Testing Project — VenueHub SRS Implementation
