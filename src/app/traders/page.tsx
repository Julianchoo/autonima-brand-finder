"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type Trader = {
  id: string;
  name: string;
  url: string;
  status: string;
  lastScannedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type Brand = {
  id: string;
  name: string;
  traderCount: number;
};

export default function TradersPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchTraders();
    }
  }, [session]);

  const fetchTraders = async () => {
    try {
      const response = await fetch("/api/traders");
      if (response.ok) {
        const data = await response.json();
        setTraders(data);
      }
    } catch (error) {
      console.error("Error fetching traders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/traders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({ name: "", url: "" });
        fetchTraders();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add trader");
      }
    } catch (error) {
      console.error("Error adding trader:", error);
      alert("Failed to add trader");
    } finally {
      setSubmitting(false);
    }
  };

  const handleScan = async (traderId: string) => {
    setScanningIds((prev) => new Set(prev).add(traderId));

    try {
      const response = await fetch(`/api/traders/${traderId}/scan`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `Scan completed! Found ${result.count || 0} brand${result.count !== 1 ? "s" : ""}.`
        );
        fetchTraders();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to scan website");
      }
    } catch (error) {
      console.error("Error scanning trader:", error);
      alert("Failed to scan website");
    } finally {
      setScanningIds((prev) => {
        const next = new Set(prev);
        next.delete(traderId);
        return next;
      });
    }
  };

  const fetchBrandsForTrader = async (traderId: string) => {
    setLoadingBrands(true);
    try {
      const response = await fetch(`/api/traders/${traderId}/brands`);
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      }
    } catch (error) {
      console.error("Error fetching brands for trader:", error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleTraderClick = (trader: Trader) => {
    setSelectedTrader(trader);
    fetchBrandsForTrader(trader.id);
  };

  const handleDelete = async (traderId: string, traderName: string) => {
    if (!confirm(`Are you sure you want to delete "${traderName}"? This will also remove it from all brand counts.`)) {
      return;
    }

    setDeletingIds((prev) => new Set(prev).add(traderId));

    try {
      const response = await fetch(`/api/traders/${traderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTraders();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete trader");
      }
    } catch (error) {
      console.error("Error deleting trader:", error);
      alert("Failed to delete trader");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(traderId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "processing":
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Traders</h1>
          <p className="text-muted-foreground mt-1">
            Manage electronics traders and scan for brands
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Trader
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New Trader</DialogTitle>
                <DialogDescription>
                  Add a new electronics trader website to scan for brands.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Trader Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Electronics Mexico"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Trader
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {traders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">
              No traders yet. Add your first trader to get started!
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Trader
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {traders.map((trader) => (
            <Card key={trader.id} className="cursor-pointer" onClick={() => handleTraderClick(trader)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{trader.name}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <a
                        href={trader.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {new URL(trader.url).hostname}
                      </a>
                    </CardDescription>
                  </div>
                  {getStatusBadge(trader.status)}
                </div>
              </CardHeader>
              <CardContent>
                {trader.errorMessage && (
                  <p className="text-sm text-destructive mb-3">
                    {trader.errorMessage}
                  </p>
                )}
                {trader.lastScannedAt && (
                  <p className="text-sm text-muted-foreground mb-3">
                    Last scanned:{" "}
                    {new Date(trader.lastScannedAt).toLocaleDateString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScan(trader.id);
                    }}
                    disabled={
                      scanningIds.has(trader.id) ||
                      trader.status === "processing" ||
                      deletingIds.has(trader.id)
                    }
                  >
                    {scanningIds.has(trader.id) ||
                    trader.status === "processing" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {trader.status === "pending" ? "Start Scan" : "Rescan"}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(trader.id, trader.name);
                    }}
                    disabled={deletingIds.has(trader.id)}
                  >
                    {deletingIds.has(trader.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedTrader} onOpenChange={() => setSelectedTrader(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTrader?.name}</DialogTitle>
            <DialogDescription>
              Brands carried by this trader
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {loadingBrands ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : brands.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No brands found for this trader yet. Try scanning first.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {brands.map((brand) => (
                  <Card key={brand.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{brand.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {brand.traderCount} trader{brand.traderCount !== 1 && "s"}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
