"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { useState } from "react";

export default function ProductsPage() {
  const products = useQuery(api.ingest.getProducts) || [];
  const [search, setSearch] = useState("");

  const filtered = products.filter(p => {
    const term = search.toLowerCase();
    return (
      p.sku.toLowerCase().includes(term) ||
      p.name.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  });

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
            <h1 className="text-3xl font-bold">Product Catalog</h1>
            <p className="text-muted-foreground">
              {products.length} products in database
            </p>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU, name, brand, or category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {search ? `${filtered.length} of ${products.length} products` : `${products.length} products`}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">SKU</TableHead>
                  <TableHead className="min-w-96">Product Name</TableHead>
                  <TableHead className="w-32">Brand</TableHead>
                  <TableHead className="w-48">Category</TableHead>
                  <TableHead className="w-24">Unit</TableHead>
                  <TableHead className="w-24">Pkg Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.brand}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.category || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.unit || "—"}</Badge>
                    </TableCell>
                    <TableCell>{p.pkgSize || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {search ? "No products match your search" : "No products in catalog"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

