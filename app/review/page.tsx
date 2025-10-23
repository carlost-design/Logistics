"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, PlusCircle, Info, Sparkles, Loader2 } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

export default function ReviewPage() {
  const queue = useQuery(api.ingest.getReviewQueue) || [];
  const approve = useMutation(api.ingest.approveMatch);
  const reject = useMutation(api.ingest.rejectMatch);
  const createProd = useMutation(api.ingest.createProductFromOffer);

  const [createOpen, setCreateOpen] = useState<{ open: boolean; offerId?: Id<"offers">; defaults?: any }>({ 
    open: false 
  });
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (matchId: Id<"matches">) => {
    setProcessing(matchId);
    try {
      await approve({ matchId });
    } catch (error) {
      console.error("Approve error:", error);
      alert("Error approving match");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (matchId: Id<"matches">) => {
    setProcessing(matchId);
    try {
      await reject({ matchId });
    } catch (error) {
      console.error("Reject error:", error);
      alert("Error rejecting match");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Review Queue</h1>
            <p className="text-muted-foreground">
              {queue.length} offer{queue.length !== 1 ? 's' : ''} awaiting manual review
            </p>
          </div>
          <Link href="/matched">
            <Button variant="outline">View Matched Offers</Button>
          </Link>
        </div>

        {/* Queue */}
        {queue.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">All caught up!</h2>
              <p className="text-muted-foreground">No offers need review at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {queue.map(({ offer, topMatch, product, allCandidates }) => (
              <Card key={offer._id} className="border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {offer.description}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="secondary">{offer.supplier}</Badge>
                        {offer.supplierSku && (
                          <Badge variant="outline" className="font-mono">
                            SKU: {offer.supplierSku}
                          </Badge>
                        )}
                        {offer.pack && (
                          <Badge variant="outline">
                            Pack: {offer.pack} {offer.uom || ""}
                          </Badge>
                        )}
                        {offer.price && (
                          <Badge variant="outline">
                            {offer.currency || "USD"} {offer.price.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Top Match */}
                  {product && topMatch ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">Best Match</h3>
                            <Badge 
                              variant={topMatch.score >= 0.7 ? "default" : "secondary"}
                            >
                              {(topMatch.score * 100).toFixed(0)}% confidence
                            </Badge>
                          </div>
                          <p className="text-lg font-medium">{product.name}</p>
                          <div className="flex flex-wrap gap-2 mt-2 text-sm">
                            <span className="text-muted-foreground">SKU: {product.sku}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">Brand: {product.brand}</span>
                            {product.category && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{product.category}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <Info className="h-3 w-3 inline mr-1" />
                            {topMatch.reasons.join(" • ")}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(topMatch._id)}
                          disabled={processing === topMatch._id}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve Match
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReject(topMatch._id)}
                          disabled={processing === topMatch._id}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-lg p-4 text-center">
                      <p className="text-muted-foreground mb-2">No matching products found</p>
                    </div>
                  )}

                  {/* Alternative Candidates */}
                  {allCandidates && allCandidates.length > 1 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Other Candidates ({allCandidates.length - 1})
                      </h4>
                      <div className="space-y-2">
                        {allCandidates.slice(1, 3).map((cand) => (
                          <div key={cand._id} className="text-xs text-muted-foreground border rounded p-2">
                            Score: {(cand.score * 100).toFixed(0)}% - {cand.reasons.join(", ")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create New Product */}
                  <Dialog 
                    open={createOpen.open && createOpen.offerId === offer._id} 
                    onOpenChange={(open) => setCreateOpen({ open, offerId: open ? offer._id : undefined })}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="secondary"
                        className="w-full gap-2"
                        onClick={() => setCreateOpen({ 
                          open: true, 
                          offerId: offer._id, 
                          defaults: offer 
                        })}
                      >
                        <PlusCircle className="h-4 w-4" />
                        Create New Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Product from Offer</DialogTitle>
                      </DialogHeader>
                      <CreateProductForm
                        defaults={{
                          sku: offer.supplierSku || "",
                          name: offer.description,
                          brand: "",
                          category: "",
                          unit: offer.uom || "EA",
                          pkgSize: offer.pack || 1,
                        }}
                        onSubmit={async (p) => {
                          try {
                            await createProd({ offerId: offer._id, product: p });
                            setCreateOpen({ open: false });
                          } catch (error) {
                            console.error("Create product error:", error);
                            alert("Error creating product");
                          }
                        }}
                        onCancel={() => setCreateOpen({ open: false })}
                      />
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CreateProductForm({
  defaults,
  onSubmit,
  onCancel,
}: {
  defaults: { sku: string; name: string; brand: string; category: string; unit: string; pkgSize: number };
  onSubmit: (p: { sku: string; name: string; brand: string; category?: string; unit?: string; pkgSize?: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [p, setP] = useState(defaults);
  const [submitting, setSubmitting] = useState(false);
  const [aiEnriching, setAiEnriching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const enrichProduct = useAction(api.aiEnrichment.enrichProductFromOffer);

  const handleAIResearch = async () => {
    setAiEnriching(true);
    setAiError(null);
    try {
      const result = await enrichProduct({
        description: defaults.name,
        supplierSku: defaults.sku,
        supplier: "Unknown",
      });

      if (result.error) {
        setAiError(result.error);
      } else if (result.confidence && result.confidence > 0.5) {
        // Pre-fill form with AI data
        setP({
          sku: defaults.sku || result.upc || defaults.sku,
          name: result.name || defaults.name,
          brand: result.brand || defaults.brand,
          category: result.category || defaults.category,
          unit: result.unit || defaults.unit,
          pkgSize: result.pkgSize || defaults.pkgSize,
        });
        setAiError(null);
      } else {
        setAiError("Low confidence AI research. Please verify manually.");
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI research failed");
    } finally {
      setAiEnriching(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(p);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Research Button */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleAIResearch}
          disabled={aiEnriching}
          className="gap-2"
        >
          {aiEnriching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              AI Research Product
            </>
          )}
        </Button>
      </div>

      {/* AI Results */}
      {aiError && (
        <Alert variant="destructive">
          <AlertDescription>{aiError}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label>SKU *</Label>
        <Input
          placeholder="Product SKU"
          value={p.sku}
          onChange={e => setP({ ...p, sku: e.target.value })}
        />
      </div>
      <div>
        <Label>Product Name *</Label>
        <Input 
          placeholder="Full product name" 
          value={p.name} 
          onChange={e => setP({ ...p, name: e.target.value })} 
        />
      </div>
      <div>
        <Label>Brand *</Label>
        <Input 
          placeholder="Manufacturer brand" 
          value={p.brand} 
          onChange={e => setP({ ...p, brand: e.target.value })} 
        />
      </div>
      <div>
        <Label>Category</Label>
        <Input 
          placeholder="e.g., Electronics > Storage" 
          value={p.category} 
          onChange={e => setP({ ...p, category: e.target.value })} 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Unit</Label>
          <Input 
            placeholder="EA, BOX, CASE" 
            value={p.unit} 
            onChange={e => setP({ ...p, unit: e.target.value })} 
          />
        </div>
        <div>
          <Label>Package Size</Label>
          <Input 
            placeholder="1" 
            type="number" 
            value={p.pkgSize} 
            onChange={e => setP({ ...p, pkgSize: Number(e.target.value) })} 
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !p.sku || !p.name || !p.brand}>
          {submitting ? "Creating..." : "Create & Link"}
        </Button>
      </DialogFooter>
    </div>
  );
}

