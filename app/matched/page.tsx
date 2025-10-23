"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function MatchedPage() {
  const matched = useQuery(api.ingest.getMatchedOffers) || [];

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
            <h1 className="text-3xl font-bold">Matched Offers</h1>
            <p className="text-muted-foreground">
              {matched.length} successfully matched offer{matched.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Matched Offers */}
        {matched.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No matched offers yet</h2>
              <p className="text-muted-foreground">Upload supplier offers to get started</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Matched Offers ({matched.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Offer Description</TableHead>
                    <TableHead>Matched Product</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matched.map(({ offer, match, product }) => (
                    <TableRow key={offer._id}>
                      <TableCell>
                        <Badge variant="secondary">{offer.supplier}</Badge>
                      </TableCell>
                      <TableCell className="max-w-96">
                        <div className="font-medium">{offer.description}</div>
                        {offer.supplierSku && (
                          <div className="text-xs text-muted-foreground font-mono">
                            SKU: {offer.supplierSku}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-96">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.sku} • {product.brand}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {(match.score * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {offer.price ? (
                          <div>
                            <span className="font-semibold">
                              {offer.currency || "USD"} {offer.price.toFixed(2)}
                            </span>
                            {offer.pack && offer.pack > 1 && (
                              <div className="text-xs text-muted-foreground">
                                Pack of {offer.pack}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

