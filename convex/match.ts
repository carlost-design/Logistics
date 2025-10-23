import type { Doc } from "./_generated/dataModel";

/**
 * Tokenize a string into normalized tokens for matching
 */
function tokenize(s: string): string[] {
  const norm = s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  const raw = norm.split(/\s+/).filter(Boolean);
  // Remove common unit suffixes from tokens
  return raw.map(t => t.replace(/(gb|tb|ml|l|g|kg|mm|cm|in|inch|\"|')$/g, "")).filter(Boolean);
}

/**
 * Calculate Jaccard similarity between two token sets
 */
function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 0 : inter / uni;
}

/**
 * Check if offer SKU matches product SKU/altSKU/UPC
 */
function skuHit(offerSku: string | undefined, p: Doc<"products">): { hit: boolean; method?: string } {
  if (!offerSku) return { hit: false };
  const s = offerSku.toLowerCase().replace(/[\s\-_]/g, "");
  
  // Check main SKU
  if (s === p.sku.toLowerCase().replace(/[\s\-_]/g, "")) {
    return { hit: true, method: "sku" };
  }
  
  // Check alternative SKUs
  if (p.altSkus && p.altSkus.some(a => a.toLowerCase().replace(/[\s\-_]/g, "") === s)) {
    return { hit: true, method: "altSku" };
  }
  
  // Check UPC
  if (p.upc && p.upc.toLowerCase().replace(/[\s\-_]/g, "") === s) {
    return { hit: true, method: "upc" };
  }
  
  return { hit: false };
}

/**
 * Extract tokens from offer for matching
 */
export function offerTokens(offer: {
  supplierSku?: string;
  description: string;
  supplier?: string;
  uom?: string | null;
}): string[] {
  const base = [offer.description, offer.supplierSku || "", offer.supplier || "", offer.uom || ""]
    .filter(Boolean)
    .join(" ");
  return tokenize(base);
}

/**
 * Extract tokens from product for matching
 */
function productTokens(p: Doc<"products">): string[] {
  const extra = [
    p.name,
    p.brand,
    p.category || "",
    (p.altSkus || []).join(" "),
    (p.synonyms || []).join(" "),
    p.upc || "",
  ].join(" ");
  return tokenize(extra);
}

/**
 * Score an offer against a product using multiple heuristics
 */
export function scoreOfferProduct(
  offer: { supplierSku?: string; description: string; uom?: string | null; pack?: number | null },
  p: Doc<"products">
) {
  const reasons: string[] = [];
  let score = 0;

  // SKU matching (highest weight)
  const sHit = skuHit(offer.supplierSku, p);
  if (sHit.hit) {
    score += sHit.method === "sku" ? 1.0 : 0.95;
    reasons.push(`SKU match: ${sHit.method}`);
  }

  // Name/description token similarity
  const ot = offerTokens(offer);
  const pt = productTokens(p);
  const nameSim = jaccard(ot, pt);
  if (nameSim > 0) {
    score += nameSim * 0.8;
    reasons.push(`Name similarity: ${(nameSim * 100).toFixed(0)}%`);
  }

  // Brand mention bonus
  if (p.brand && offer.description.toLowerCase().includes(p.brand.toLowerCase())) {
    score += 0.1;
    reasons.push("Brand mention");
  }

  // Package size matching
  if (offer.pack && p.pkgSize && offer.pack === p.pkgSize) {
    score += 0.05;
    reasons.push("Package size matches");
  }

  // Cap maximum score
  if (score > 1.2) score = 1.2;
  
  return { score, reasons };
}

/**
 * Find top N candidate products for an offer
 */
export function proposeCandidates(
  offer: { supplierSku?: string; description: string; uom?: string | null; pack?: number | null },
  products: Doc<"products">[],
  topN = 3
) {
  const scored = products.map(p => {
    const { score, reasons } = scoreOfferProduct(offer, p);
    return { productId: p._id, score, reasons, method: "heuristic" };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Return top N
  return scored.slice(0, topN);
}

