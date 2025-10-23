import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { sampleProducts } from "./sampleData";
import { proposeCandidates, offerTokens } from "./match";

/**
 * Seed the database with sample products
 */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    for (const p of sampleProducts) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_sku", (q) => q.eq("sku", p.sku))
        .unique();
      if (existing) continue;
      await ctx.db.insert("products", {
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category,
        unit: p.unit,
        pkgSize: p.pkgSize,
        attributes: p.attributes,
        altSkus: p.altSkus,
        synonyms: p.synonyms,
        upc: p.upc,
        createdAt: Date.now(),
      });
      inserted++;
    }
    return { inserted };
  },
});

/**
 * Ingest supplier offers and automatically match them to products
 */
export const ingestOffers = mutation({
  args: {
    offers: v.array(
      v.object({
        supplier: v.string(),
        supplierSku: v.optional(v.string()),
        description: v.string(),
        pack: v.optional(v.number()),
        uom: v.optional(v.string()),
        price: v.optional(v.number()),
        currency: v.optional(v.string()),
        notes: v.optional(v.string()),
        raw: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    const created: Id<"offers">[] = [];
    
    for (const o of args.offers) {
      const tokens = offerTokens({
        supplierSku: o.supplierSku,
        description: o.description,
        supplier: o.supplier,
        uom: o.uom,
      });
      
      const offerId = await ctx.db.insert("offers", {
        supplier: o.supplier,
        supplierSku: o.supplierSku,
        description: o.description,
        pack: o.pack,
        uom: o.uom,
        price: o.price,
        currency: o.currency,
        notes: o.notes,
        raw: o.raw,
        tokens,
        status: "new",
        createdAt: Date.now(),
      });
      created.push(offerId);

      // Find candidate matches
      const candidates = proposeCandidates(
        { supplierSku: o.supplierSku, description: o.description, uom: o.uom, pack: o.pack ?? null },
        products
      );
      
      let bestId: Id<"matches"> | undefined;
      for (const c of candidates) {
        const matchId = await ctx.db.insert("matches", {
          offerId,
          productId: c.productId,
          score: c.score,
          method: c.method,
          reasons: c.reasons,
          status: "candidate",
          createdAt: Date.now(),
        });
        if (!bestId) bestId = matchId;
      }
      
      // Auto-approve high-confidence matches
      if (bestId) {
        const best = await ctx.db.get(bestId);
        if (best && best.score >= 0.88) {
          await ctx.db.patch(bestId, { status: "approved" });
          await ctx.db.patch(offerId, {
            bestMatchId: bestId,
            status: "matched",
          });
        } else {
          await ctx.db.patch(offerId, {
            bestMatchId: bestId,
            status: "needs_review",
          });
        }
      }
    }
    
    return { created };
  },
});

/**
 * Get dashboard summary statistics
 */
export const getDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("offers").collect();
    const matched = all.filter(o => o.status === "matched").length;
    const needs = all.filter(o => o.status === "needs_review").length;
    const products = await ctx.db.query("products").collect();
    
    return {
      totalOffers: all.length,
      matched,
      needsReview: needs,
      products: products.length,
    };
  },
});

/**
 * Get offers that need manual review
 */
export const getReviewQueue = query({
  args: {},
  handler: async (ctx) => {
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_status", (q) => q.eq("status", "needs_review"))
      .collect();

    const enriched = [];
    for (const o of offers) {
      const cand = await ctx.db
        .query("matches")
        .withIndex("by_offer", (q) => q.eq("offerId", o._id))
        .collect();
      cand.sort((a, b) => b.score - a.score);
      const top = cand[0];
      const product = top ? await ctx.db.get(top.productId) : null;
      enriched.push({ offer: o, topMatch: top, product, allCandidates: cand });
    }
    
    return enriched;
  },
});

/**
 * Get all matched offers with product details
 */
export const getMatchedOffers = query({
  args: {},
  handler: async (ctx) => {
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_status", (q) => q.eq("status", "matched"))
      .collect();

    const enriched = [];
    for (const o of offers) {
      if (!o.bestMatchId) continue;
      const match = await ctx.db.get(o.bestMatchId);
      const product = match ? await ctx.db.get(match.productId) : null;
      if (product && match) {
        enriched.push({ offer: o, match, product });
      }
    }
    
    return enriched;
  },
});

/**
 * Approve a match candidate
 */
export const approveMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.matchId);
    if (!m) return;
    
    await ctx.db.patch(args.matchId, { status: "approved" });
    await ctx.db.patch(m.offerId, { status: "matched", bestMatchId: args.matchId });
    
    // Reject other candidates for this offer
    const others = await ctx.db
      .query("matches")
      .withIndex("by_offer", (q) => q.eq("offerId", m.offerId))
      .collect();
    
    for (const other of others) {
      if (other._id !== args.matchId && other.status === "candidate") {
        await ctx.db.patch(other._id, { status: "rejected" });
      }
    }
  },
});

/**
 * Reject a match candidate
 */
export const rejectMatch = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.matchId);
    if (!m) return;
    
    await ctx.db.patch(args.matchId, { status: "rejected" });
    
    // Check if there are other open candidates
    const others = await ctx.db
      .query("matches")
      .withIndex("by_offer", (q) => q.eq("offerId", m.offerId))
      .collect();
    
    const open = others.filter(x => x.status === "candidate");
    
    if (open.length === 0) {
      // No more candidates, set back to new
      await ctx.db.patch(m.offerId, { status: "new" });
    }
  },
});

/**
 * Create a new product from an offer
 */
export const createProductFromOffer = mutation({
  args: {
    offerId: v.id("offers"),
    product: v.object({
      sku: v.string(),
      name: v.string(),
      brand: v.string(),
      category: v.optional(v.string()),
      unit: v.optional(v.string()),
      pkgSize: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const o = await ctx.db.get(args.offerId);
    if (!o) return;
    
    const pid = await ctx.db.insert("products", {
      ...args.product,
      attributes: {},
      altSkus: args.product.sku ? [args.product.sku] : [],
      synonyms: [o.description],
      createdAt: Date.now(),
    });
    
    const matchId = await ctx.db.insert("matches", {
      offerId: o._id,
      productId: pid,
      score: 0.9,
      method: "manual_create",
      reasons: ["Created product from offer"],
      status: "approved",
      createdAt: Date.now(),
    });
    
    await ctx.db.patch(o._id, { status: "matched", bestMatchId: matchId });
    
    return { productId: pid, matchId };
  },
});

/**
 * Get all products
 */
export const getProducts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

