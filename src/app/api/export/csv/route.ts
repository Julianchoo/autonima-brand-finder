import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trader, brand, traderBrand } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/export/csv - Export brand-trader matrix as CSV
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all traders for the user
    const traders = await db
      .select({
        id: trader.id,
        name: trader.name,
      })
      .from(trader)
      .where(eq(trader.userId, session.user.id))
      .orderBy(trader.name);

    // Get all brands for the user (brands that have relationships with user's traders)
    const brands = await db
      .select({
        id: brand.id,
        name: brand.name,
      })
      .from(brand)
      .innerJoin(traderBrand, eq(brand.id, traderBrand.brandId))
      .innerJoin(trader, eq(traderBrand.traderId, trader.id))
      .where(eq(trader.userId, session.user.id))
      .groupBy(brand.id, brand.name)
      .orderBy(brand.name);

    // Get all brand-trader relationships
    const relationships = await db
      .select({
        brandId: traderBrand.brandId,
        traderId: traderBrand.traderId,
      })
      .from(traderBrand)
      .innerJoin(trader, eq(traderBrand.traderId, trader.id))
      .where(eq(trader.userId, session.user.id));

    // Create a lookup map for quick access
    const relationshipMap = new Map<string, Set<string>>();
    relationships.forEach((rel) => {
      if (!relationshipMap.has(rel.brandId)) {
        relationshipMap.set(rel.brandId, new Set());
      }
      relationshipMap.get(rel.brandId)!.add(rel.traderId);
    });

    return NextResponse.json({
      traders,
      brands,
      relationshipMap: Object.fromEntries(
        Array.from(relationshipMap.entries()).map(([brandId, traderIds]) => [
          brandId,
          Array.from(traderIds),
        ])
      ),
    });
  } catch (error) {
    console.error("Error generating export data:", error);
    return NextResponse.json(
      { error: "Failed to generate export data" },
      { status: 500 }
    );
  }
}
