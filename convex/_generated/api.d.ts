/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiEmbeddings from "../aiEmbeddings.js";
import type * as aiEnrichment from "../aiEnrichment.js";
import type * as aiParsing from "../aiParsing.js";
import type * as ingest from "../ingest.js";
import type * as match from "../match.js";
import type * as sampleData from "../sampleData.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiEmbeddings: typeof aiEmbeddings;
  aiEnrichment: typeof aiEnrichment;
  aiParsing: typeof aiParsing;
  ingest: typeof ingest;
  match: typeof match;
  sampleData: typeof sampleData;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
