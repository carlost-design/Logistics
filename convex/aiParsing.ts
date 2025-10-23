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
 * Parse unstructured supplier text (emails, PDFs, etc.) using AI
 * Extracts structured offer data from any format
 */
export const parseUnstructuredOffer = action({
  args: {
    text: v.string(),
    supplierName: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = `You are a data extraction expert. Extract supplier offer information from this text.

Supplier: ${args.supplierName}

Text:
${args.text}

Extract ALL offers/products mentioned. For each, extract:
- supplierSku: Their product code/SKU (if present)
- description: Product name/description
- pack: Package quantity (e.g., "24-pack" → 24, "case of 12" → 12)
- uom: Unit of measure (EA, BOX, CASE, L, KG, etc.)
- price: Unit price (convert to decimal number)
- currency: Currency code (USD, EUR, GBP, etc.)
- notes: Any additional info (delivery time, MOQ, etc.)

Handle variations:
- "€45" or "45 EUR" or "45 euros" → price: 45, currency: "EUR"
- "24-pack" or "case of 24" or "24 units" → pack: 24
- "per box" → uom: "BOX"
- "1L" or "1000ml" → normalize to larger unit
- "forty-five dollars" → price: 45

Return as JSON array:
{
  "offers": [
    {
      "supplierSku": "SKU123",
      "description": "Product name",
      "pack": 24,
      "uom": "CASE",
      "price": 12.50,
      "currency": "USD",
      "notes": "Additional notes"
    }
  ],
  "confidence": 0.9,
  "warnings": ["Any data quality issues"]
}

If information is missing, use null. If text doesn't contain offers, return empty array.`;

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a precise data extraction assistant. Always return valid JSON. Be conservative - if unsure, use null.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return {
          offers: [],
          confidence: 0,
          error: "No response from AI",
        };
      }

      const result = JSON.parse(content);

      // Validate and normalize
      if (result.offers && Array.isArray(result.offers)) {
        result.offers = result.offers.map((offer: any) => ({
          supplier: args.supplierName,
          supplierSku: offer.supplierSku || undefined,
          description: offer.description || "Unknown product",
          pack: offer.pack || undefined,
          uom: offer.uom || undefined,
          price: offer.price || undefined,
          currency: offer.currency || "USD",
          notes: offer.notes || undefined,
          raw: offer,
        }));
      }

      return result;
    } catch (error) {
      console.error("AI parsing failed:", error);
      return {
        offers: [],
        confidence: 0,
        error: error instanceof Error ? error.message : "Failed to parse text",
      };
    }
  },
});

/**
 * Extract supplier name from email text
 */
export const extractSupplierFromEmail = action({
  args: { emailText: v.string() },
  handler: async (ctx, args) => {
    const prompt = `Extract the supplier/sender company name from this email:

${args.emailText.substring(0, 500)}

Return JSON: { "supplier": "Company Name", "confidence": 0.9 }`;

    try {
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return { supplier: "Unknown", confidence: 0 };
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("Supplier extraction failed:", error);
      return { supplier: "Unknown", confidence: 0 };
    }
  },
});
