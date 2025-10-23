# System Architecture

Visual guide to how the Supplier Offer Management System works.

## 🏗️ High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │Dashboard │  │  Upload  │  │  Review  │  │ Products │       │
│  │  page    │  │   page   │  │   page   │  │   page   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │              │             │              │
│       └─────────────┴──────────────┴─────────────┘              │
│                      │                                           │
│              ┌───────▼────────┐                                 │
│              │ ConvexProvider │ (React Context)                 │
│              │  useQuery()    │                                 │
│              │  useMutation() │                                 │
│              └───────┬────────┘                                 │
└──────────────────────┼──────────────────────────────────────────┘
                       │ WebSocket (real-time)
                       │ HTTPS (mutations)
┌──────────────────────▼──────────────────────────────────────────┐
│                    Convex Cloud                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   Database Tables                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │    │
│  │  │  products   │  │   offers    │  │   matches   │   │    │
│  │  │             │  │             │  │             │   │    │
│  │  │ • sku       │  │ • supplier  │  │ • offerId   │   │    │
│  │  │ • name      │  │ • desc      │  │ • productId │   │    │
│  │  │ • brand     │  │ • price     │  │ • score     │   │    │
│  │  │ • altSkus[] │  │ • status    │  │ • status    │   │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                 Convex Functions                        │    │
│  │  ┌──────────────────┐  ┌──────────────────┐           │    │
│  │  │   Mutations      │  │     Queries      │           │    │
│  │  │                  │  │                  │           │    │
│  │  │ • seed()         │  │ • getSummary()   │           │    │
│  │  │ • ingestOffers() │  │ • getReview()    │           │    │
│  │  │ • approveMatch() │  │ • getMatched()   │           │    │
│  │  │ • rejectMatch()  │  │ • getProducts()  │           │    │
│  │  │ • createProduct()│  │                  │           │    │
│  │  └──────────────────┘  └──────────────────┘           │    │
│  │                                                         │    │
│  │  ┌────────────────────────────────────────────────┐   │    │
│  │  │         Matching Engine (match.ts)             │   │    │
│  │  │  • tokenize()         • skuHit()               │   │    │
│  │  │  • jaccard()          • scoreOfferProduct()    │   │    │
│  │  │  • proposeCandidates()                         │   │    │
│  │  └────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow

### 1. Upload Flow

```
User selects files
       ↓
┌──────────────────┐
│ Browser parses   │ ← PapaParse (CSV)
│ files locally    │ ← xlsx (Excel)
└────────┬─────────┘ ← Regex (email text)
         ↓
┌──────────────────┐
│ Validate with    │
│ Zod schemas      │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Show preview     │
│ table to user    │
└────────┬─────────┘
         ↓
   Click "Ingest"
         ↓
┌──────────────────┐
│ POST to Convex   │
│ ingestOffers()   │
└────────┬─────────┘
         ↓
   See "Ingestion Flow"
```

### 2. Ingestion Flow

```
Receive offer array
       ↓
┌────────────────────────┐
│ For each offer:        │
│                        │
│ 1. Tokenize desc       │ → ["wd", "blue", "1tb", "hdd"]
│                        │
│ 2. Insert into DB      │ → offers table (status="new")
│                        │
│ 3. Fetch all products  │ → Query products table
│                        │
│ 4. Run matching        │ ┐
│    algorithm           │ │
└────────┬───────────────┘ │
         ↓                  │
┌────────────────────────┐ │
│ Matching Algorithm:    │ │
│                        │ │
│ For each product:      │ │
│  • Check SKU match     │ ← Match Engine
│  • Calculate Jaccard   │ │
│  • Check brand         │ │
│  • Check pack size     │ │
│  • Compute score       │ │
└────────┬───────────────┘ │
         ↓                  │
┌────────────────────────┐ │
│ Sort by score,         │ │
│ take top 3 candidates  │ │
└────────┬───────────────┘ │
         ↓                  ┘
┌────────────────────────┐
│ Insert matches into DB │ → matches table
│ (status="candidate")   │
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│ Check best match score │
└────────┬───────────────┘
         ↓
    Score >= 88%?
    /          \
   YES          NO
   ↓            ↓
Auto-approve    Queue for review
   ↓            ↓
status:       status:
"matched"     "needs_review"
```

### 3. Review Flow

```
┌────────────────────────┐
│ Query offers with      │
│ status="needs_review"  │
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│ For each offer:        │
│  • Fetch top match     │
│  • Fetch product       │
│  • Show side-by-side   │
└────────┬───────────────┘
         ↓
    User decides
    /    |    \
   /     |     \
Approve Reject Create
   ↓     ↓      ↓
Update  Update  Insert
match   match   product
status  status    +
  ↓       ↓     create
Update  Check   match
offer   other     ↓
status  matches Update
  ↓       ↓     offer
"matched" ...   status
```

---

## 🔄 State Machine

### Offer Status Flow

```
    ┌─────┐
    │ NEW │ (just created)
    └──┬──┘
       │
       │ After matching
       ↓
   ┌───────────┐
   │ Condition │
   └─────┬─────┘
     /       \
    /         \
Score≥88%   Score<88%
   ↓           ↓
┌─────────┐ ┌───────────────┐
│ MATCHED │ │ NEEDS_REVIEW  │
└─────────┘ └───────┬───────┘
               /    |    \
              /     |     \
          Approve Reject Create
             ↓      ↓     ↓
         ┌─────────┐   ┌─────────┐
         │ MATCHED │   │ MATCHED │
         └─────────┘   └─────────┘
```

### Match Status Flow

```
    ┌───────────┐
    │ CANDIDATE │ (suggested match)
    └─────┬─────┘
      /       \
     /         \
Approve      Reject
   ↓            ↓
┌──────────┐ ┌──────────┐
│ APPROVED │ │ REJECTED │
└──────────┘ └──────────┘
```

---

## 🧮 Matching Algorithm Detail

```
Input: Offer + Product List
       ↓
┌──────────────────────────────────┐
│ STAGE 1: Tokenization            │
│                                   │
│ "WD Blue 1TB HDD"                │
│   ↓ lowercase                    │
│ "wd blue 1tb hdd"                │
│   ↓ remove punctuation           │
│ ["wd", "blue", "1tb", "hdd"]    │
│   ↓ remove unit suffixes         │
│ ["wd", "blue", "1", "hdd"]      │
└───────────────┬──────────────────┘
                ↓
┌──────────────────────────────────┐
│ STAGE 2: SKU Exact Match         │
│                                   │
│ Normalize offer.supplierSku      │
│ "WD-10EZEX" → "wd10ezex"         │
│                                   │
│ Compare against:                 │
│  • product.sku                   │
│  • product.altSkus[]             │
│  • product.upc                   │
│                                   │
│ If match: score += 1.0 (or 0.95) │
└───────────────┬──────────────────┘
                ↓
┌──────────────────────────────────┐
│ STAGE 3: Text Similarity         │
│                                   │
│ Offer tokens:                    │
│   ["wd", "blue", "1", "hdd"]    │
│                                   │
│ Product tokens:                  │
│   ["western", "digital", "blue", │
│    "1", "tb", "hdd", "sata"]    │
│                                   │
│ Jaccard = |A ∩ B| / |A ∪ B|     │
│         = 4 / 9                  │
│         = 0.44                   │
│                                   │
│ score += 0.44 × 0.8 = 0.35       │
└───────────────┬──────────────────┘
                ↓
┌──────────────────────────────────┐
│ STAGE 4: Brand Boost             │
│                                   │
│ if "western digital" in offer:   │
│   score += 0.1                   │
└───────────────┬──────────────────┘
                ↓
┌──────────────────────────────────┐
│ STAGE 5: Package Match           │
│                                   │
│ if offer.pack == product.pkgSize:│
│   score += 0.05                  │
└───────────────┬──────────────────┘
                ↓
┌──────────────────────────────────┐
│ FINAL SCORE                       │
│                                   │
│ Total: 1.0 + 0.35 + 0.1 + 0.05   │
│      = 1.5 (capped at 1.2)       │
│      = 1.2                        │
│                                   │
│ Confidence: 120% → Auto-approve  │
└──────────────────────────────────┘
```

---

## 🗄️ Database Schema

### products Table

```typescript
{
  _id: Id<"products">,
  sku: string,              // Primary SKU
  name: string,             // Full product name
  brand: string,            // Manufacturer
  category?: string,        // Hierarchical category
  unit?: string,            // EA, BOX, CASE, etc.
  pkgSize?: number,         // Items per package
  attributes?: object,      // Flexible attributes
  altSkus?: string[],       // Alternative SKUs
  synonyms?: string[],      // Common names
  upc?: string,             // Barcode
  createdAt: number         // Timestamp
}
```

**Indexes:**

- `by_sku` on `sku` (fast lookups)

### offers Table

```typescript
{
  _id: Id<"offers">,
  supplier: string,         // Supplier name
  supplierSku?: string,     // Their SKU code
  description: string,      // Product description
  pack?: number,            // Package quantity
  uom?: string,             // Unit of measure
  price?: number,           // Unit price
  currency?: string,        // USD, EUR, etc.
  notes?: string,           // Additional info
  raw?: any,                // Original row data
  tokens: string[],         // Tokenized for search
  status: string,           // "new" | "matched" | "needs_review"
  bestMatchId?: Id<"matches">, // Link to best match
  createdAt: number         // Timestamp
}
```

**Indexes:**

- `by_status` on `status` (fast queue queries)

### matches Table

```typescript
{
  _id: Id<"matches">,
  offerId: Id<"offers">,    // Which offer
  productId: Id<"products">, // Which product
  score: number,            // 0-1 confidence
  method: string,           // "heuristic" | "manual_create"
  reasons: string[],        // Why matched
  status: string,           // "candidate" | "approved" | "rejected"
  createdAt: number         // Timestamp
}
```

**Indexes:**

- `by_offer` on `offerId` (find matches for offer)
- `by_product` on `productId` (find matches for product)

---

## 🔌 API Surface

### Queries (Read Data)

```typescript
// Get dashboard summary
getDashboardSummary(): {
  totalOffers: number,
  matched: number,
  needsReview: number,
  products: number
}

// Get review queue
getReviewQueue(): Array<{
  offer: Offer,
  topMatch: Match,
  product: Product,
  allCandidates: Match[]
}>

// Get matched offers
getMatchedOffers(): Array<{
  offer: Offer,
  match: Match,
  product: Product
}>

// Get all products
getProducts(): Product[]
```

### Mutations (Write Data)

```typescript
// Seed sample products
seed(): { inserted: number }

// Ingest supplier offers
ingestOffers(offers: OfferRow[]): { created: Id<"offers">[] }

// Approve a match
approveMatch(matchId: Id<"matches">): void

// Reject a match
rejectMatch(matchId: Id<"matches">): void

// Create product from offer
createProductFromOffer(
  offerId: Id<"offers">,
  product: NewProduct
): { productId: Id<"products">, matchId: Id<"matches"> }
```

---

## 🎨 Component Hierarchy

```
app/
├── layout.tsx (Root)
│   └── ConvexClientProvider
│       ├── page.tsx (Dashboard)
│       │   ├── Card (stats)
│       │   ├── Card (quick actions)
│       │   └── Card (features)
│       │
│       ├── upload/page.tsx
│       │   ├── Card (upload form)
│       │   └── Card (preview table)
│       │       └── Table (offers)
│       │
│       ├── review/page.tsx
│       │   └── Card[] (offer cards)
│       │       ├── Badge (metadata)
│       │       ├── Card (best match)
│       │       ├── Button (approve)
│       │       ├── Button (reject)
│       │       └── Dialog (create product)
│       │           └── CreateProductForm
│       │
│       ├── products/page.tsx
│       │   ├── Card (search)
│       │   └── Card (table)
│       │       └── Table (products)
│       │
│       └── matched/page.tsx
│           └── Card (table)
│               └── Table (matched offers)
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Production                           │
│                                                          │
│  ┌────────────────┐            ┌────────────────┐      │
│  │  Vercel Edge   │            │ Convex Cloud   │      │
│  │   Network      │            │   Production   │      │
│  │                │            │   Deployment   │      │
│  │ • Next.js app  │◄─────────►│                │      │
│  │ • CDN caching  │  WebSocket │ • Database     │      │
│  │ • Auto-scale   │    HTTPS   │ • Functions    │      │
│  └────────────────┘            │ • Auto-scale   │      │
│         ▲                       └────────────────┘      │
│         │                                               │
│         │ HTTPS                                         │
│         ↓                                               │
│  ┌────────────┐                                         │
│  │   Users    │                                         │
│  │  (global)  │                                         │
│  └────────────┘                                         │
└─────────────────────────────────────────────────────────┘
```

---

This architecture provides:

- ✅ **Real-time updates** via Convex subscriptions
- ✅ **Scalability** with serverless architecture
- ✅ **Low latency** with edge deployment
- ✅ **Type safety** end-to-end TypeScript
- ✅ **Simple ops** no servers to manage

