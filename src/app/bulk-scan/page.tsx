"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Link2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UrlScanResult {
  url: string;
  brands: string[];
  pagesScanned: number;
  success: boolean;
  error?: string;
}

interface BulkScanResponse {
  success: boolean;
  results: UrlScanResult[];
  summary: {
    totalUrls: number;
    successfulScans: number;
    failedScans: number;
    uniqueBrands: number;
    invalidUrls: string[];
  };
  brands: string[];
}

export default function BulkScanPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [urlsText, setUrlsText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<BulkScanResponse | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  const handleScan = async () => {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      alert("Please enter at least one URL");
      return;
    }

    setScanning(true);
    setResults(null);

    try {
      const response = await fetch("/api/scan/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to scan URLs");
      }

      const data = (await response.json()) as BulkScanResponse;
      setResults(data);
    } catch (error) {
      console.error("Error scanning URLs:", error);
      alert(error instanceof Error ? error.message : "Failed to scan URLs");
    } finally {
      setScanning(false);
    }
  };

  const handleExportCSV = () => {
    if (!results) return;

    const csvRows: string[] = [];

    // Header row: "Brand" followed by URLs (shortened to domain)
    const header = [
      "Brand",
      ...results.results.map((r) => {
        try {
          return new URL(r.url).hostname;
        } catch {
          return r.url;
        }
      }),
    ];
    csvRows.push(header.map((h) => `"${h}"`).join(","));

    // Data rows: each brand with X marks for URLs that have it
    results.brands.forEach((brand) => {
      const row = [brand];

      results.results.forEach((result) => {
        row.push(result.brands.includes(brand) ? "X" : "");
      });

      csvRows.push(row.map((cell) => `"${cell}"`).join(","));
    });

    // Create and download the CSV file
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bulk-scan-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bulk URL Scanner</h1>
        <p className="text-muted-foreground mt-1">
          Scan multiple websites at once and export brand matrix to CSV
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Enter URLs
            </CardTitle>
            <CardDescription>
              Paste one URL per line. Each website will be crawled to find brands.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full h-64 p-3 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://example1.com&#x0a;https://example2.com&#x0a;https://example3.com"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              disabled={scanning}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleScan}
                disabled={scanning || urlsText.trim().length === 0}
                className="flex-1"
              >
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  "Scan URLs"
                )}
              </Button>
              {results && (
                <Button onClick={handleExportCSV} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Each URL will be crawled up to 10 pages deep to find brands.
              This may take several minutes.
            </p>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Scan Results</CardTitle>
            <CardDescription>
              {scanning
                ? "Scanning websites..."
                : results
                  ? "Scan completed"
                  : "Results will appear here"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scanning ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This may take a few minutes...
                </p>
              </div>
            ) : results ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {results.summary.uniqueBrands}
                    </div>
                    <p className="text-xs text-muted-foreground">Unique Brands</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {results.summary.totalUrls}
                    </div>
                    <p className="text-xs text-muted-foreground">URLs Scanned</p>
                  </div>
                </div>

                {/* Invalid URLs Warning */}
                {results.summary.invalidUrls.length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">
                        {results.summary.invalidUrls.length} invalid URL(s) skipped
                      </p>
                    </div>
                  </div>
                )}

                {/* URL Results */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <p className="text-sm font-medium">Scanned Websites:</p>
                  {results.results.map((result, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg space-y-1 text-sm"
                    >
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" title={result.url}>
                            {new URL(result.url).hostname}
                          </p>
                          {result.success ? (
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {result.brands.length} brands
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {result.pagesScanned} pages
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-xs text-destructive mt-1">
                              {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Brand List Preview */}
                {results.brands.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Brands Found ({results.brands.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-muted rounded-lg">
                      {results.brands.map((brand, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {brand}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Enter URLs and click &quot;Scan URLs&quot; to begin
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CSV Export Info */}
      {results && results.brands.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>CSV Export Format</CardTitle>
            <CardDescription>
              The exported CSV contains a brand × website matrix
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                • Each row represents a brand
              </p>
              <p>
                • Each column represents a website (shown as domain name)
              </p>
              <p>
                • Cells marked with &quot;X&quot; indicate the brand was found on that website
              </p>
              <p className="text-muted-foreground mt-3">
                Perfect for importing into Excel, Google Sheets, or any data analysis tool.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
