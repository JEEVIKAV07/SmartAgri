# Vayal Connect

A bilingual marketplace for Tamil Nadu growers, buyers, and platform administrators. Built with Next.js App Router, React, TypeScript, PostgreSQL, and Prisma.

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

Open http://localhost:3000. The seed provides `farmer@vayal.test`, `buyer@vayal.test`, and `admin@vayal.test`, all with the default local password `Harvest!2026`. Set `DEMO_PASSWORD` before seeding to override it. These synthetic accounts are for local development only.

Without PostgreSQL, the app opens in an explicitly labeled demo preview. Preview changes live only in browser memory. Signed-in actions use the PostgreSQL APIs.

## Workflows

- Buyers can search and filter produce, place and track orders, message farmers, and review completed orders.
- Farmers can publish, edit, pause, resume, and remove their own listings, advance incoming orders, message buyers, and submit farm details for review.
- Buyers can report a product with a reason and details; administrators can review, resolve, or dismiss reports.
- Administrators can approve or reject verification submissions, inspect activity, and moderate reviews.
- English and Tamil are available throughout the interface; the choice is saved locally and INR values use locale-aware formatting.
- Orders follow explicit status transitions. Settlement is agreed directly; this MVP does not collect payments.
- Product cards may show illustrative sample price references. They are not live market prices; the crop-price and weather panels remain unavailable until real providers are configured.

## Database and release

The PostgreSQL models are in `prisma/schema.prisma`. `npm run db:migrate` creates and applies local development migrations. Commit generated migration files for production releases. Run `npm test`, `npm run lint`, and `npm run build` before release.

Verification stores a private document reference only. The MVP does not upload files; configure private object storage and access controls before accepting real identity or farm documents. The database rate limit uses hashed client addresses; configure the deployment proxy to set trusted forwarding headers.This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
