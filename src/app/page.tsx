"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, TrendingUp, Package, Sparkles, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { SignInButton } from "@/components/auth/sign-in-button";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
              <Search className="h-9 w-9 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
              Brand Finder
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            AI-Powered Electronics Brand Discovery
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Automatically scan electronics trader websites and extract all brand
            names using AI. Build your comprehensive brand catalog across
            multiple traders.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            {session ? (
              <>
                <Button asChild size="lg" className="text-lg px-8">
                  <Link href="/traders">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    View Traders
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-lg px-8">
                  <Link href="/brands">
                    <Package className="mr-2 h-5 w-5" />
                    Browse Brands
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <SignInButton />
                <Button size="lg" variant="outline" asChild className="text-lg px-8">
                  <a href="#features">Learn More</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to build your electronics brand catalog
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>1. Add Traders</CardTitle>
                <CardDescription>
                  Input URLs of electronics trader websites you want to analyze
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Simply paste the website URL and name. We support any
                  electronics trader or distributor website.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>2. AI Scanning</CardTitle>
                <CardDescription>
                  Our AI automatically extracts all brand names from each website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Advanced AI technology analyzes website content and identifies
                  electronics brands with high accuracy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>3. View Catalog</CardTitle>
                <CardDescription>
                  Browse all discovered brands with trader relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  See which brands appear across multiple traders and track your
                  complete brand inventory.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Example Traders Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Example Traders
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Some examples of electronics trader websites you can scan
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { name: "Boolchand", url: "https://boolchand.com/" },
              {
                name: "Electronics Mexico",
                url: "https://www.electronicsmexico.com/",
              },
              {
                name: "Atacado Connect",
                url: "https://atacadoconnect.com/",
              },
              {
                name: "B2B Mayoristas",
                url: "https://www.b2bmayoristas.com/",
              },
            ].map((trader) => (
              <Card key={trader.url} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">{trader.name}</CardTitle>
                  <CardDescription className="text-xs truncate">
                    {new URL(trader.url).hostname}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!session && (
        <section className="bg-primary/5 py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Get Started?
              </h2>
              <p className="text-lg text-muted-foreground">
                Sign in to start building your electronics brand catalog today
              </p>
              <SignInButton />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
