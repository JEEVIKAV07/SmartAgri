# SmartAgri | Vayal Connect

Bilingual Tamil-English marketplace connecting Tamil Nadu farmers and buyers, with product management, orders, messaging, reviews, weather reports, and report moderation. Built with Next.js App Router, React, TypeScript, PostgreSQL, and Prisma.

## Local setup

1. Install Node.js 22 or later and PostgreSQL 15 or later.
2. Create a database named `smartagri`, copy `.env.example` to `.env`, set `DATABASE_URL`, and replace `AUTH_SECRET` with a random value of at least 32 characters.
3. Install dependencies and set up the local schema and example accounts:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. The seed provides `farmer@vayal.test`, `buyer@vayal.test`, `admin@vayal.test`, `kannan@vayal.test`, `murugan@vayal.test`, and `thenmozhi@vayal.test`, all with the default local password `Harvest!2026`. Set `DEMO_PASSWORD` before seeding to override it. These synthetic accounts are for local development only.

Without PostgreSQL, the app opens in an explicitly labeled demo preview. Preview changes live only in browser memory. Signed-in actions use the PostgreSQL APIs.

## Workflows

- Buyers can search and filter produce, place and track orders, message farmers, and review completed orders.
- Buyers and farmers can add listings to browser-stored favourites and use a separate marketplace button to view them; favourites are kept separate for each signed-in account.
- Farmers can publish, edit, pause, resume, and remove their own listings, including a required JPEG, PNG, or WebP product photo (up to 5 MB), quality grade, harvest date, and availability end date. Advance, cancel, dispatch, and coordinate pickup for orders.
- Orders use cash on pickup. Buyers mark when they have handed over cash, then farmers confirm receipt; both parties see whether payment is complete or incomplete.
- Pickup confirmations are shared in both parties' order lists and refresh automatically. Buyers see reports they submitted, farmers see reports about them, and administrators can review and resolve all reports.
- Buyers can view published ratings and completed-order counts; open a farmer profile, contact a grower, and report a product or farmer with a reason and details.
- Administrators can review and manage products and member accounts, inspect activity, moderate reviews, and resolve or dismiss reports.
- English and Tamil are available throughout the interface; the choice is saved locally and INR values use locale-aware formatting.
- The Help center provides bilingual FAQs and direct navigation to marketplace, orders, messages, and weather.
- Buyers and farmers can create accounts, sign in, and exchange persistent messages in a live-refreshing, chat-style inbox. Account and message storage requires PostgreSQL.
- Orders follow explicit status transitions. Cash payment confirmations are recorded for both parties; this MVP does not collect payment.
- Product quantity is reserved atomically when a farmer accepts an order. If an accepted or ready order is cancelled, its quantity is returned to stock; unaccepted cancellations do not affect inventory.
- Current weather and a three-day forecast are fetched server-side from Open-Meteo, including location search, and do not require an API key. Market-price features are deferred and are not shown in the application interface.
- New listings start with an empty marketplace. Uploaded product images are stored under `.data/product-images`; use persistent object storage instead when deploying to an environment with ephemeral local filesystems.

## Database and release

The PostgreSQL models are in `prisma/schema.prisma`. `npm run db:migrate` creates and applies local development migrations. Commit generated migration files for production releases. Run `npm test`, `npm run lint`, and `npm run build` before release.

The database rate limit uses hashed client addresses; configure the deployment proxy to set trusted forwarding headers. This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
