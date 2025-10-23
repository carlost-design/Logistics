# Quick Setup Guide

Follow these steps to get the Supplier Offer Management System running.

## Step 1: Install Dependencies

```bash
npm install
```

This installs:

- Next.js 16
- Convex (database)
- shadcn/ui components
- papaparse (CSV parsing)
- xlsx (Excel parsing)
- zod (validation)

## Step 2: Initialize Convex

```bash
npx convex dev
```

This will:

1. Open your browser to sign in to Convex
2. Ask you to create a new project or select existing
3. Generate `convex/_generated/` files
4. Start the Convex development server
5. Print your deployment URL (looks like `https://xyz.convex.cloud`)

**Important**: Keep this terminal open! The Convex dev server must stay running.

## Step 3: Configure Environment

Create a file called `.env.local` in the project root:

```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Replace `your-deployment.convex.cloud` with the URL from Step 2.

## Step 4: Start Next.js

In a **new terminal** (keep Convex running in the first one):

```bash
npm run dev
```

The app will start at [http://localhost:3000](http://localhost:3000)

## Step 5: Seed Sample Data

1. Open [http://localhost:3000](http://localhost:3000)
2. Click the **"Seed Database"** button
3. You should see "Successfully seeded 24 products!"

## Step 6: Upload Sample Offers

1. Click **"Upload Offers"** in the top right
2. Click the file input and select all three files from `sample_data/`:
   - `supplier_alpha_offer.csv`
   - `supplier_beta_offer.csv`
   - `supplier_charlie_email.txt`
3. Review the preview table
4. Click **"Ingest Offers"**
5. Wait for processing (should take ~2 seconds)
6. You'll be redirected to the Review Queue

## Step 7: Review Matches

1. You should see offers that need manual review
2. For each offer:
   - **Green check** = approve the match
   - **Red X** = reject the match
   - **"Create New Product"** = add a new product for this offer

Try these actions:

- Approve high-confidence matches (>70%)
- Reject obviously wrong matches
- Create a new product for "Logitech M185 Wireless Mouse"

## Step 8: View Results

- Click **"Matched Offers"** to see approved matches
- Click **"Products"** to browse the product catalog
- Use the search bar to find specific products

## Troubleshooting

### "Cannot find module 'convex/react'"

- Make sure you ran `npm install`
- Check that `node_modules/convex` exists

### "NEXT_PUBLIC_CONVEX_URL is not defined"

- Create `.env.local` with your Convex URL
- Restart the Next.js dev server (`npm run dev`)

### "No products seeded"

- Check that Convex dev is running (`npx convex dev`)
- Check browser console for errors
- Try seeding again

### Upload errors

- Make sure files are in `sample_data/` directory
- Check that file extensions are `.csv` or `.txt`
- For Excel, save as `.xlsx` (not `.xls`)

### Port already in use

- Next.js default port is 3000
- If blocked, it will suggest 3001
- Or specify: `npm run dev -- -p 3001`

## Architecture Overview

```
┌─────────────┐
│  Next.js    │  ← React UI (App Router)
│  Frontend   │
└──────┬──────┘
       │
       │ Convex React Client
       │
┌──────▼──────┐
│   Convex    │  ← Real-time database
│   Backend   │
└─────────────┘
```

### Data Flow

1. **Upload**: Parse CSV/XLSX/TXT → validate with Zod
2. **Ingest**: Send to Convex → `ingestOffers` mutation
3. **Match**: For each offer → find top 3 product candidates
4. **Score**: SKU match + name similarity + brand → confidence %
5. **Auto-approve**: If score ≥88% → status = "matched"
6. **Queue**: If score <88% → status = "needs_review"
7. **Review**: Human approves/rejects/creates product
8. **Done**: Status = "matched" → visible in Matched Offers

## Next Steps

### Customize Matching

Edit `convex/match.ts`:

- Adjust scoring weights
- Add custom rules
- Change auto-approve threshold

### Add Products

Two ways:

1. Seed more data in `convex/sampleData.ts`
2. Create products from the Review Queue UI

### Connect to ERP

Future: Add API endpoints in `convex/` to:

- Export matched offers
- Sync products from ERP
- Push orders back to ERP

### Deploy to Production

1. **Convex**:

```bash
npx convex deploy
```

This creates a production deployment.

2. **Vercel** (or any Next.js host):

```bash
npm run build
```

Set `NEXT_PUBLIC_CONVEX_URL` to your production Convex URL.

3. **Environment variables**:

- Add `NEXT_PUBLIC_CONVEX_URL` in your hosting dashboard
- Point to production Convex deployment

## Support

- Convex docs: [docs.convex.dev](https://docs.convex.dev)
- Next.js docs: [nextjs.org/docs](https://nextjs.org/docs)
- shadcn/ui: [ui.shadcn.com](https://ui.shadcn.com)

---

**Ready to process supplier offers at scale!** 🚀

