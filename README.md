This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backend API & Functions

The WizFriends backend is implemented with Next.js App Router API routes, Firebase Admin, and Cloud Functions. All routes live under `/api/*` and expect Firebase Authentication ID tokens for mutating requests (`Authorization: Bearer <idToken>`). Server-side role checks mirror the Firestore rules.

### Core Collections

- `users`, `groups`, `groupMembers`
- `activities`, `userActivityJoin`, `userActivitySave`, `posts`
- `ideas`, `ideaEndorse`
- `featuredAds`, `adAppears`
- `tickets`, `userDevices`

### Key Endpoints

- Activities: `/api/activities`, `/api/activities/[id]`, `/api/activities/[id]/join`, `/api/activities/[id]/save`, `/api/activities/[id]/posts`
- Groups: `/api/groups`, `/api/groups/[id]`, `/api/groups/[id]/members`, `/api/groups/[id]/activities`
- Ideas: `/api/ideas`, `/api/ideas/[id]`, `/api/ideas/[id]/endorse`
- Featured ads: `/api/featured-ads`, `/api/featured-ads/[id]`, `/api/featured-ads/[id]/submit`, `/api/featured-ads/[id]/review`, `/api/featured-ads/[id]/groups`
- Support: `/api/support/tickets`, `/api/support/tickets/[id]`, `/api/notifications/token`, `/api/me`

### Example Requests

```bash
# Create an activity
curl -X POST https://your-host/api/activities \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Board Game Night","description":"Casual night with snacks.","startTime":"2025-11-01T18:00:00.000Z","endTime":"2025-11-01T21:00:00.000Z","city":"Toronto","lat":43.6532,"lng":-79.3832,"visibility":"public"}'

# List nearby activities
curl "https://your-host/api/activities?lat=43.65&lng=-79.38&radius_km=10"

# Endorse an idea
curl -X POST https://your-host/api/ideas/idea123/endorse \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"endorse": true}'

# Approve a featured ad (customer_service/admin only)
curl -X POST https://your-host/api/featured-ads/ad123/review \
  -H "Authorization: Bearer $CS_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve"}'
```

### Cloud Functions

Located in `functions/` (Node 20):

- `notifyUpcomingActivities` – sends reminders 24h and 2h before start.
- `convertEligibleIdeas` – promotes endorsed ideas into activities.
- `syncFeaturedAds` – activates/expires featured ad placements.

Build locally with:

```bash
cd functions
npm install
npm run build
```

Use the root scripts to emulate or deploy:

- `npm run emulate:functions`
- `npm run deploy:functions`

### Configuration Notes

- Admin SDK uses `GOOGLE_APPLICATION_CREDENTIALS` or Application Default credentials.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` must be set for media validation.
- Optional `EMAIL_PROVIDER_API_KEY` enables email sends (logged otherwise).

### Firestore Indexes

Create composite indexes when prompted, notably:

- `activities` on `(city asc, startTime asc)` and `(geohash asc)`
- `ideas` on `(status asc, endorsementCount desc)`
- `featuredAds` on `(status asc, startsAt asc)`
