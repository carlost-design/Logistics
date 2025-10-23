"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Package, FileUp, ClipboardCheck, Database } from "lucide-react";

export default function Home() {
  const summary = useQuery(api.ingest.getDashboardSummary);
  const seed = useMutation(api.ingest.seed);

  const handleSeed = async () => {
    try {
      const result = await seed();
      alert(`Successfully seeded ${result.inserted} products!`);
    } catch (error) {
      console.error("Seed error:", error);
      alert("Error seeding database. Check console for details.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Supplier Offer Management</h1>
            <p className="text-muted-foreground mt-2">
              Intelligent product matching and offer processing system
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/upload">
              <Button size="lg" className="gap-2">
                <FileUp className="h-5 w-5" />
                Upload Offers
              </Button>
            </Link>
            <Link href="/review">
              <Button size="lg" variant="secondary" className="gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Review Queue
              </Button>
            </Link>
            <Link href="/products">
              <Button size="lg" variant="outline" className="gap-2">
                <Package className="h-5 w-5" />
                Products
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary?.products ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Items in catalog
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
              <FileUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary?.totalOffers ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Supplier offers received
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Matched</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {summary?.matched ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully matched offers
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
              <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {summary?.needsReview ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting manual review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">Seed Sample Products</h3>
                <p className="text-sm text-muted-foreground">
                  Load 24 sample products into the database for testing
                </p>
              </div>
              <Button onClick={handleSeed} variant="outline">
                Seed Database
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">Upload Supplier Offers</h3>
                <p className="text-sm text-muted-foreground">
                  Process CSV, XLSX, or email text files with supplier offers
                </p>
              </div>
              <Link href="/upload">
                <Button>Upload Now</Button>
              </Link>
            </div>

            {summary && summary.needsReview > 0 && (
              <div className="flex items-center justify-between p-4 border rounded-lg border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                <div>
                  <h3 className="font-semibold">Review Pending Matches</h3>
                  <p className="text-sm text-muted-foreground">
                    {summary.needsReview} offer{summary.needsReview !== 1 ? 's' : ''} need manual review
                  </p>
                </div>
                <Link href="/review">
                  <Button variant="default">Review Now</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Multi-Format Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Supports CSV, XLSX, and plain text email formats. Automatically parses and normalizes data from multiple suppliers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Smart Matching</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Uses SKU matching, text similarity, and brand recognition to automatically link offers to products with confidence scoring.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Low-confidence matches queue for human review. Approve, reject, or create new products directly from the interface.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
