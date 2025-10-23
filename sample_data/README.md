# Sample Supplier Data

This directory contains sample supplier offer files for testing the matching system.

## Files

### 1. supplier_alpha_offer.csv

- **Format**: CSV with standard headers
- **Supplier**: AlphaTraders
- **Records**: 18 offers
- **Challenges**:
  - Missing SKU fields
  - Unicode characters (g/m²)
  - Various naming conventions
  - Pack size variations
  - One unknown product (Logitech M185) to test new product creation

### 2. supplier_beta_offer.csv

- **Format**: CSV (can be converted to XLSX in Excel)
- **Supplier**: BetaSupply
- **Records**: 15 offers
- **Challenges**:
  - Different column names (Vendor, Item vs Supplier, Description)
  - Missing SKU fields
  - British spelling (litre vs liter)
  - Mixed currencies (USD/EUR)
  - Case variations
  - Extra whitespace

### 3. supplier_charlie_email.txt

- **Format**: Plain text email
- **Supplier**: CharlieWholesale
- **Records**: 10 offers
- **Challenges**:
  - Unstructured email format
  - Various SKU delimiters (hyphens, slashes, asterisks)
  - Comma as decimal separator (EUR price)
  - Mixed unit formats (Gb vs GB, L vs l)
  - Special characters (‑ en-dash vs - hyphen)

## Testing Strategy

1. **Start with seeding**: Use the "Seed Database" button to load 24 sample products
2. **Upload files**: Upload all three files through the upload page
3. **Review matches**: Check the review queue for low-confidence matches
4. **Test actions**:
   - Approve high-confidence matches
   - Reject incorrect matches
   - Create new product for Logitech M185

## Expected Matching Results

### High-Confidence Auto-Matches (≥88%)

- Exact SKU matches: WD10EZEX, Q2612A, SA400S37/960G, etc.
- Alternative SKU matches: MN1500-24, MB-MP128HA
- Strong name + brand matches

### Needs Manual Review (<88%)

- Partial matches with low similarity
- Missing SKUs with description-only matching
- New products not in database

### New Products to Create

- Logitech M185 Wireless Mouse (appears in AlphaTraders file)

## Data Quality Issues Demonstrated

- **Missing fields**: SKU, UOM, Pack
- **Format variations**: CSV, XLSX, email text
- **Naming inconsistencies**: "Coca Cola" vs "COKE", "G500" vs "5000"
- **Unit variations**: "ml" vs "ML", "0.5L" vs "500ml"
- **SKU formats**: Hyphens, slashes, no separators
- **Currencies**: USD, EUR with different decimal separators
- **Typos/spacing**: Extra spaces, unicode characters
