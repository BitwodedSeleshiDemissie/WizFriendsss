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

## Supabase Setup

The app now uses [Supabase](https://supabase.com) for authentication and data storage. Seed data is still bundled for a zero-config preview, but production deployments should provision the following credentials in `.env.local` (or the Vercel dashboard):

```
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Optional (server-side automation, not currently required by the web app):

```
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Recommended Tables

Create the tables below with matching column names (camelCase is fine—snake_case is used in the Supabase inserts). Each table should have `id uuid primary key default uuid_generate_v4()` unless noted.

| Table | Purpose | Notable Columns |
|-------|---------|-----------------|
| `profiles` | User profile data for app views | `name`, `tagline`, `interests[]`, `current_city`, `photo_url` |
| `activities` | Activities surfaced in the discover tab | `title`, `description`, `category`, `start_time`, `end_time`, `city`, `location_name`, `attendee_count`, `is_virtual`, `is_featured`, `tags[]` |
| `user_activity_join` | Attendance records | `activity_id` (fk), `user_id` (fk), `status`, `joined_at` |
| `user_activity_save` | Saved activities | `activity_id` (fk), `user_id` (fk), `saved_at` |
| `ideas` | Brainstorm ideas | `prompt_text`, `ai_suggestion`, `category`, `tags[]`, `supporters[]`, `endorsement_count`, `endorsement_threshold`, `status` |
| `idea_endorse` | Per-user endorsements | `idea_id` (fk), `user_id` (fk), `endorsed_at` |
| `groups` | Community groups | `name`, `description`, `tags[]`, `owner_id`, `admin_ids[]`, `member_ids[]`, `members_count`, `is_private` |
| `group_members` | Group membership / roles | `group_id` (fk), `user_id` (fk), `role`, `joined_at` |
| `group_bulletins` | Notices & polls surfaced in the groups tab | `group_id`, `type`, `title`, `message`, `question`, `options jsonb`, `voters jsonb` |
| `notifications` | In-app notifications for the user toast area | `recipient_id`, `title`, `message`, `read`, `created_at` |

Enable Realtime for the tables you want to auto-refresh (e.g. `group_bulletins`) so the client subscription stays healthy.

### Local Development Tips

1. Copy `.env.local.example` (or create one) and populate the Supabase credentials.
2. Run `npm run dev` and sign in with the Google provider configured in Supabase.
3. With env vars unset, the app falls back to the bundled seed data for demo mode.

### Migration Notes

- Firebase dependencies, emulators, and Cloud Functions have been removed.
- `AuthContext` now relies on `supabase-js` and syncs the Supabase session into an `authToken` cookie for the existing middleware guard.
- `AppDataContext` reads/writes Supabase tables and gracefully degrades to the in-memory seed data when credentials are missing or queries fail.
- When introducing new tables, mirror the camelCase fields used by the React components or extend the normalisers in `src/context/AppDataContext.jsx`.
