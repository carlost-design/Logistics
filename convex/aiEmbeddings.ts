"use node";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import type { Doc } from "./_generated/dataModel";

// Lazy initialize OpenAI client to avoid errors when OPENAI_API_KEY is not set
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Generate embedding vector for text using OpenAI
 */
export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    try {
      const openai = getOpenAI();
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: args.text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Embedding generation failed:", error);
      throw error;
    }
  },
});

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Find semantically similar products using embeddings
 * Returns top matches sorted by semantic similarity
 */
export const semanticMatchOffer = action({
  args: {
    offerText: v.string(),
    productTexts: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        embedding: v.optional(v.array(v.number())),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      const openai = getOpenAI();

      // Generate embedding for offer
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: args.offerText,
      });

      const offerEmbedding = response.data[0].embedding;

      // Calculate similarity scores
      const scores = args.productTexts
        .map((product) => {
          let similarity = 0;

          if (product.embedding) {
            // Use pre-computed embedding if available
            similarity = cosineSimilarity(offerEmbedding, product.embedding);
          }

          return {
            productId: product.id,
            semanticScore: similarity,
          };
        })
        .filter((x) => x.semanticScore > 0); // Only include positive matches

      // Sort by similarity (highest first)
      scores.sort((a, b) => b.semanticScore - a.semanticScore);

      return scores;
    } catch (error) {
      console.error("Semantic matching failed:", error);
      throw error;
    }
  },
});

/**
 * Batch generate embeddings for multiple texts
 * More efficient than calling generateEmbedding multiple times
 */
export const batchGenerateEmbeddings = action({
  args: { texts: v.array(v.string()) },
  handler: async (ctx, args) => {
    try {
      const openai = getOpenAI();
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: args.texts,
      });

      return response.data.map((item) => ({
        index: item.index,
        embedding: item.embedding,
      }));
    } catch (error) {
      console.error("Batch embedding generation failed:", error);
      throw error;
    }
  },
});

/**
 * Hybrid scoring: combines heuristic matching with semantic similarity
 */
export function hybridScore(
  heuristicScore: number,
  semanticScore: number,
  hasSKUMatch: boolean = false
): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  // If SKU match: trust heuristic more (SKUs are reliable)
  // If no SKU: trust semantic more (text-based)
  const finalScore = hasSKUMatch
    ? heuristicScore * 0.8 + semanticScore * 0.2
    : heuristicScore * 0.4 + semanticScore * 0.6;

  if (semanticScore > 0) {
    reasons.push(`Semantic similarity: ${(semanticScore * 100).toFixed(0)}%`);
  }

  return {
    score: Math.min(finalScore, 1.2),
    reasons,
  };
}
