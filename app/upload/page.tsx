"use client";

import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileSpreadsheet, FileText, Mail, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type OfferRow = {
  supplier: string;
  supplierSku?: string;
  description: string;
  pack?: number;
  uom?: string;
  price?: number;
  currency?: string;
  notes?: string;
  raw?: any;
};

const offerSchema = z.object({
  supplier: z.string(),
  supplierSku: z.string().optional(),
  description: z.string(),
  pack: z.number().optional(),
  uom: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  raw: z.any().optional(),
});

export default function UploadPage() {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [supplier, setSupplier] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const ingest = useMutation(api.ingest.ingestOffers);
  const parseWithAI = useAction(api.aiParsing.parseUnstructuredOffer);
  const extractSupplier = useAction(api.aiParsing.extractSupplierFromEmail);
  const router = useRouter();

  async function parseFile(file: File): Promise<OfferRow[]> {
    const ext = file.name.toLowerCase();

    if (ext.endsWith(".csv")) {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true
      }).data;
      return parsed.map(r => mapRow(r));
    }

    if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
      return data.map(r => mapRow(r));
    }

    if (ext.endsWith(".txt") || ext.endsWith(".eml")) {
      const txt = await file.text();

      // Use AI parsing if enabled
      if (useAI) {
        try {
          // Extract supplier name from email
          const supplierResult = await extractSupplier({ emailText: txt });
          const supplierName = supplierResult.supplier || supplier || "UnknownSupplier";

          // Parse with AI
          const result = await parseWithAI({
            text: txt,
            supplierName,
          });

          if (result.offers && Array.isArray(result.offers)) {
            return result.offers.map((o: any) => offerSchema.parse(o));
          }
        } catch (error) {
          console.error("AI parsing failed, falling back to regex:", error);
          // Fall back to regex parsing
        }
      }

      // Use regex parsing as fallback
      return parseEmailText(txt);
    }

    return [];
  }

  function num(n?: string): number | undefined {
    if (!n) return undefined;
    const s = String(n).replace(",", ".").replace(/[^\d.]/g, "");
    const v = Number(s);
    return Number.isFinite(v) ? v : undefined;
  }

  function mapRow(r: Record<string, string>): OfferRow {
    const s = supplier || r.Supplier || r.Vendor || r.supplier || r.vendor || "UnknownSupplier";
    const supplierSku = r.SupplierSKU || r.SKU || r["SupplierSku"] || r["Vendor SKU"] || 
                        r["VendorSku"] || r.supplierSku || r.sku || undefined;
    const description = r.Description || r.Item || r["Item Description"] || 
                       r["ItemName"] || r.description || r.item || "";
    const pack = num(r.Pack || r.CasePack || r["Pk"] || r.pack);
    const uom = r.UOM || r["UOM"] || r["Pk UOM"] || r["Uom"] || r.uom || undefined;
    const price = num(r.Price || r.UnitPrice || r["Price"] || r["Unit Price"] || r.price);
    const currency = r.Currency || r.currency || "USD";
    const notes = r.Notes || r.Comments || r.notes || r.comments || undefined;
    const raw = r;
    
    const row = { 
      supplier: s, 
      supplierSku, 
      description, 
      pack, 
      uom, 
      price, 
      currency, 
      notes, 
      raw 
    };
    
    return offerSchema.parse(row);
  }

  function parseEmailText(txt: string): OfferRow[] {
    const s = supplier || "EmailSupplier";
    const lines = txt.split(/\r?\n/).filter(l => l.trim().startsWith("- SKU:") || l.trim().startsWith("SKU:"));
    
    return lines.map(line => {
      const sku = /SKU:\s*([^|]+)/i.exec(line)?.[1]?.trim();
      const item = /Item:\s*([^|]+)/i.exec(line)?.[1]?.trim();
      const pk = /Pk:\s*([^|]+)/i.exec(line)?.[1]?.trim();
      const priceRaw = /Price:\s*\$?([\d.,]+)/i.exec(line)?.[1]?.trim();
      const currency = /EUR/i.test(line) ? "EUR" : "USD";
      
      return offerSchema.parse({
        supplier: s,
        supplierSku: sku,
        description: item || "",
        pack: num(pk),
        uom: /\bREAM\b/i.test(line) ? "REAM" : /\bCASE\b/i.test(line) ? "CASE" : undefined,
        price: num(priceRaw),
        currency,
        notes: "from email",
        raw: line,
      });
    });
  }

  async function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    if (useAI) {
      setAiParsing(true);
    }

    const all: OfferRow[] = [];
    for (const f of Array.from(files)) {
      try {
        const parsed = await parseFile(f);
        all.push(...parsed);
      } catch (error) {
        console.error(`Error parsing ${f.name}:`, error);
        alert(`Error parsing ${f.name}. Check console for details.`);
      }
    }
    setRows(all);
    setAiParsing(false);
  }

  async function handleIngest() {
    if (!rows.length) return;
    
    setUploading(true);
    try {
      await ingest({ offers: rows });
      alert(`Successfully ingested ${rows.length} offers! Redirecting to review page...`);
      setRows([]);
      router.push("/review");
    } catch (error) {
      console.error("Ingest error:", error);
      alert("Error ingesting offers. Check console for details.");
    } finally {
      setUploading(false);
    }
  }

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
          <div>
            <h1 className="text-3xl font-bold">Upload Supplier Offers</h1>
            <p className="text-muted-foreground">
              Support for CSV, XLSX, and email text formats
            </p>
          </div>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>File Upload</CardTitle>
            <CardDescription>
              Select one or more files containing supplier offers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {/* AI Toggle */}
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                <Switch
                  id="ai-mode"
                  checked={useAI}
                  onCheckedChange={setUseAI}
                />
                <Label htmlFor="ai-mode" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">Use AI-powered parsing</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Better for emails & unstructured text (cost: ~$0.01 per file)
                  </p>
                </Label>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Supplier Name (optional override)
                </label>
                <Input
                  placeholder="e.g., AlphaTraders, BetaSupply..."
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Upload Files
                </label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    multiple
                    accept=".csv,.xlsx,.xls,.txt,.eml"
                    onChange={onFilesChange}
                    disabled={aiParsing}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleIngest}
                    disabled={!rows.length || uploading}
                    size="lg"
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Processing..." : "Ingest Offers"}
                  </Button>
                </div>
              </div>
            </div>

            {aiParsing && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  AI is parsing your files... This may take a few seconds.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                CSV/XLSX
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Plain Text
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Format
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview ({rows.length} offers)</CardTitle>
                  <CardDescription>
                    Review parsed data before ingesting
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-base px-4 py-2">
                  {rows.length} rows
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Supplier</TableHead>
                    <TableHead className="w-40">Supplier SKU</TableHead>
                    <TableHead className="min-w-80">Description</TableHead>
                    <TableHead className="w-20">Pack</TableHead>
                    <TableHead className="w-20">UOM</TableHead>
                    <TableHead className="w-24">Price</TableHead>
                    <TableHead className="w-20">Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.supplier}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.supplierSku || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="max-w-96 truncate">{r.description}</TableCell>
                      <TableCell>{r.pack ?? "—"}</TableCell>
                      <TableCell>{r.uom ?? "—"}</TableCell>
                      <TableCell>{r.price?.toFixed(2) ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.currency || "USD"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 50 && (
                <div className="text-sm text-muted-foreground mt-4 text-center">
                  Showing first 50 rows. All {rows.length} rows will be ingested.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

