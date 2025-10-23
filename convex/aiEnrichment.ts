"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

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
 * Enrich product data by researching the product using OpenAI
 * Useful for creating new products from supplier offers
 */
export const enrichProductFromOffer = action({
  args: {
    description: v.string(),
    supplierSku: v.optional(v.string()),
    supplier: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = `You are a product research assistant. Given this supplier offer, research and extract structured product information.

Supplier: ${args.supplier}
SKU: ${args.supplierSku || "N/A"}
Description: ${args.description}

Research and provide:
1. Full product name (manufacturer + model)
2. Brand/Manufacturer
3. Category (be specific, e.g., "Electronics > Storage > External HDD")
4. Standard unit (EA, BOX, CASE, etc.)
5. Package size (items per package)
6. UPC/Barcode if available
7. Typical market price range (USD)
8. Key specifications (bullet points)

Return as JSON:
{
  "name": "Full product name",
  "brand": "Manufacturer",
  "category": "Category path",
  "unit": "EA",
  "pkgSize": 1,
  "upc": "123456789",
  "priceRange": { "min": 10.00, "max": 15.00 },
  "specifications": ["spec1", "spec2"],
  "confidence": 0.9,
  "sources": ["url1", "url2"]
}

If you cannot find reliable information, set confidence < 0.5 and leave fields null.`;

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a product research expert. Always return valid JSON. Be conservative - if unsure, use null.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return {
          error: "No response from AI",
          confidence: 0,
        };
      }

      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error("AI enrichment failed:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to enrich product data",
        confidence: 0,
      };
    }
  },
});
