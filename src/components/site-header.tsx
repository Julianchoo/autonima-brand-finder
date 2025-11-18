import Link from "next/link";
import { UserProfile } from "@/components/auth/user-profile";
import { ModeToggle } from "./ui/mode-toggle";
import { Search, Package, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Search className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Brand Finder
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/traders">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Traders
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/brands">
                  <Package className="mr-2 h-4 w-4" />
                  Brands
                </Link>
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <UserProfile />
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
