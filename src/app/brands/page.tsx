"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, ExternalLink, Download } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type Brand = {
  id: string;
  name: string;
  traderCount: number;
  createdAt: string;
};

type Trader = {
  id: string;
  name: string;
  url: string;
  status: string;
  lastScannedAt: string | null;
};

export default function BrandsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loadingTraders, setLoadingTraders] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchBrands();
    }
  }, [session]);

  const fetchBrands = async () => {
    try {
      const response = await fetch("/api/brands");
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTradersForBrand = async (brandId: string) => {
    setLoadingTraders(true);
    try {
      const response = await fetch(`/api/brands/${brandId}/traders`);
      if (response.ok) {
        const data = await response.json();
        setTraders(data);
      }
    } catch (error) {
      console.error("Error fetching traders for brand:", error);
    } finally {
      setLoadingTraders(false);
    }
  };

  const handleBrandClick = (brand: Brand) => {
    setSelectedBrand(brand);
    fetchTradersForBrand(brand.id);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/export/csv");
      if (!response.ok) {
        throw new Error("Failed to fetch export data");
      }

      const data = await response.json();
      const { traders, brands, relationshipMap } = data;

      // Build CSV
      const csvRows: string[] = [];

      // Header row: "Brand" followed by trader names
      const header = ["Brand", ...traders.map((t: { name: string }) => t.name)];
      csvRows.push(header.map((h) => `"${h}"`).join(","));

      // Data rows: each brand with X marks for traders that carry it
      brands.forEach((brand: { id: string; name: string }) => {
        const row = [brand.name];
        const brandTraderIds = relationshipMap[brand.id] || [];

        traders.forEach((trader: { id: string }) => {
          row.push(brandTraderIds.includes(trader.id) ? "X" : "");
        });

        csvRows.push(row.map((cell) => `"${cell}"`).join(","));
      });

      // Create and download the CSV file
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `brand-finder-export-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  if (isPending || loading) {
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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Brand Catalog</h1>
          <p className="text-muted-foreground mt-1">
            All electronics brands found across your traders
          </p>
        </div>
        {brands.length > 0 && (
          <Button onClick={handleExportCSV} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
        )}
      </div>

      {brands.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No brands found yet.</p>
            <p className="text-sm text-muted-foreground">
              Add traders and scan them to discover brands.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {brands.map((brand) => (
              <Card
                key={brand.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleBrandClick(brand)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg leading-tight">
                      {brand.name}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {brand.traderCount} trader{brand.traderCount !== 1 && "s"}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>
                Overview of your brand catalog
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-2xl font-bold">{brands.length}</div>
                  <p className="text-sm text-muted-foreground">
                    Total Brands
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {brands.reduce((acc, b) => acc + b.traderCount, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total Brand-Trader Relationships
                  </p>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {brands.length > 0
                      ? (
                          brands.reduce((acc, b) => acc + b.traderCount, 0) /
                          brands.length
                        ).toFixed(1)
                      : "0"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Average Traders per Brand
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!selectedBrand} onOpenChange={() => setSelectedBrand(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedBrand?.name}</DialogTitle>
            <DialogDescription>
              Traders that carry this brand
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {loadingTraders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : traders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No traders found for this brand.
              </p>
            ) : (
              traders.map((trader) => (
                <Card key={trader.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          {trader.name}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          <a
                            href={trader.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {new URL(trader.url).hostname}
                          </a>
                        </CardDescription>
                      </div>
                      {trader.lastScannedAt && (
                        <Badge variant="outline" className="text-xs">
                          Scanned{" "}
                          {new Date(trader.lastScannedAt).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
