import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    sku: v.string(),
    name: v.string(),
    brand: v.string(),
    category: v.optional(v.string()),
    unit: v.optional(v.string()),
    pkgSize: v.optional(v.number()),
    attributes: v.optional(v.any()),
    altSkus: v.optional(v.array(v.string())),
    synonyms: v.optional(v.array(v.string())),
    upc: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_sku", ["sku"]),
  
  offers: defineTable({
    supplier: v.string(),
    supplierSku: v.optional(v.string()),
    description: v.string(),
    pack: v.optional(v.number()),
    uom: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
    raw: v.optional(v.any()),
    tokens: v.array(v.string()),
    status: v.string(), // 'new' | 'matched' | 'needs_review'
    bestMatchId: v.optional(v.id("matches")),
    createdAt: v.number(),
  }).index("by_status", ["status"]),
  
  matches: defineTable({
    offerId: v.id("offers"),
    productId: v.id("products"),
    score: v.number(),
    method: v.string(),
    reasons: v.array(v.string()),
    status: v.string(), // 'candidate' | 'approved' | 'rejected'
    createdAt: v.number(),
  })
    .index("by_offer", ["offerId"])
    .index("by_product", ["productId"]),
});

