## Zest

Modern platform to discover, create, and book events and activities. Built with Next.js 14 App Router, Firebase, and Razorpay. Includes robust authentication, booking flows, ticketing with QR codes, and production-ready API routes.


## Features
- **Authentication**: Google sign-in and phone login with unified profile creation and account linking
- **Guardrails**: Global `ProfileGuard` enforces complete profiles before accessing protected pages; SSR login protection for user/org flows
- **Events & Activities**: Creation, editing, dashboards, booking flows, and confirmations
- **Payments**: Razorpay checkout, server-side order creation and signature verification
- **Ticketing**: Individual ticket issuance with QR payloads, validation history, and user ticket APIs
- **Guides**: Public guides with Firestore-backed listing and detail pages
- **Design system**: Tailwind CSS 4, custom components, and responsive UI
- **Deploy-ready**: Vercel configuration and image domains pre-configured; linting and type safety

## Tech stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript, React 18
- **Styling**: Tailwind CSS 4
- **Data**: Firebase (Auth, Firestore, Storage) + Firebase Admin (server)
- **Payments**: Razorpay
- **Notifications**: SMS (mock in dev; Twilio adapter ready)
- **Build/Deploy**: Vercel

## Getting started
### Prerequisites
- Node.js 18+ and npm 9+
- Firebase project with Firestore and Storage enabled
- Razorpay account and API keys

### Install
```bash
npm install
```

### Local development
1) Create `.env.local` (see Environment variables below)
2) Run dev server
```bash
npm run dev
```
3) Open `http://localhost:3000`

## Environment variables
Create `.env.local` with the following keys. Do not commit real values.

```env
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin (server)
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Twilio (optional; used only if NODE_ENV=production and SMS APIs are enabled)
NEXT_PUBLIC_TWILIO_ACCOUNT_SID=
NEXT_PUBLIC_TWILIO_VERIFY_SERVICE_SID=
TWILIO_AUTH_TOKEN=
```

Notes
- For `FIREBASE_PRIVATE_KEY` on Vercel, keep newlines escaped (\n). Locally you can use a multiline value.
- Never expose `RAZORPAY_KEY_SECRET`, `FIREBASE_PRIVATE_KEY`, or `TWILIO_AUTH_TOKEN` to the client.

## Firebase setup
1) Create a Firebase project and enable:
   - Authentication providers: Google and Phone (or use Twilio-based OTP endpoints)
   - Firestore (in production mode)
   - Storage
2) Get client config and place in `.env.local` under the `NEXT_PUBLIC_FIREBASE_*` keys
3) Generate a service account (Editor or custom least-privilege) and set:
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
4) Optionally apply rules and indexes
   - Firestore rules: `firestore.rules`
   - Indexes: `firestore.indexes.json` (import in Firestore > Indexes)
   - Storage rules: `storage.rules`

## Run and build
```bash
# Start dev server
npm run dev

# Type-check and lint
npm run lint

# Build production bundle
npm run build

# Start production server (after build)
npm run start
```

## Payments (Razorpay)
Client loads Razorpay checkout and calls server routes for order creation and verification.

Flow
1) Client requests `POST /api/payment/create-order` with amount and metadata
2) Client opens Razorpay with returned `order_id`
3) On success, client calls `POST /api/payment/verify` with signature payload
4) Server verifies HMAC using `RAZORPAY_KEY_SECRET`, persists booking, and issues tickets

See `RAZORPAY_SETUP.md` for step-by-step setup and testing cards.

## API endpoints
- `POST /api/payment/create-order`
  - Body: `{ amount: number, currency?: string, receipt?: string, notes?: any }`
  - Returns: `{ success: true, order: { id, amount, currency, receipt } }`

- `POST /api/payment/verify`
  - Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData, bookingType: 'event'|'activity' }`
  - Verifies signature, saves booking to Firestore (`eventAttendees` or `activity_bookings`), updates activity capacity when relevant, and creates tickets
  - Returns: `{ success: true, bookingId, ticketIds? }`

- `GET /api/tickets?userId=<uid>`
  - Returns the user’s tickets ordered by `createdAt` (server uses Firebase Admin)

## Ticketing
- Individual tickets issued per unit purchased
- Ticket model includes QR payload, validation history, and status transitions
- Utilities in `src/utils/ticketGenerator.ts` handle creation, listing, and validation

## Project structure
```text
src/
  app/                   # Next.js App Router pages, layouts, and API routes
    api/
      payment/create-order/route.ts
      payment/verify/route.ts
      tickets/route.ts
  components/            # Reusable UI and feature components
  lib/                   # Firebase client/admin, guides, SMS adapters
  utils/                 # Auth helpers, Razorpay helpers, ticket utilities
```

Notable pages and flows
- `login/` and `login/organisation/` separate user vs org logins
- `create/event` and `create/activity` flows with slide-based UI
- `event-profile/`, `activity-profile/`, and dashboards under `*-dashboard/[id]`
- `ProfileGuard` enforces profile completeness globally for protected routes

## Deployment (Vercel)
1) Push repository to GitHub/GitLab/Bitbucket
2) Import into Vercel
3) Set Environment Variables from the Environment section above
4) Build command: `next build` (already specified in `vercel.json`)
5) Start command: `next start` (Vercel handles automatically for Next.js)

Image domains are configured in `next.config.js` for Firebase Storage.

## Security checklist
- Set all secrets in environment variables; never commit service account JSON
- Use different Firebase projects and Razorpay keys for dev vs prod
- Keep `RAZORPAY_KEY_SECRET`, `FIREBASE_PRIVATE_KEY`, and `TWILIO_AUTH_TOKEN` server-only
- Review Firestore and Storage rules before going live
- Monitor server logs for failed verifications and capacity updates

## Troubleshooting
- "Firebase Admin SDK requires service account credentials in production"
  - Ensure `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` are set
  - On Vercel, keep newlines escaped (\n)
- Payment signature mismatch
  - Confirm the same `RAZORPAY_KEY_SECRET` is used for both order creation and verification
  - Check that your client passes the exact `razorpay_order_id` and `razorpay_payment_id`
- Firestore index errors
  - Import `firestore.indexes.json` or create indexes suggested by Firestore error messages
- Activity capacity not updating
  - Ensure `bookingType='activity'` and `selectedDate`, `selectedTimeSlot`, `tickets` are present


