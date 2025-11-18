import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brand, traderBrand, trader } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/brands - List all brands with trader counts
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all brands that are associated with the user's traders
    const brands = await db
      .select({
        id: brand.id,
        name: brand.name,
        traderCount: brand.traderCount,
        createdAt: brand.createdAt,
      })
      .from(brand)
      .innerJoin(traderBrand, eq(brand.id, traderBrand.brandId))
      .innerJoin(trader, eq(traderBrand.traderId, trader.id))
      .where(eq(trader.userId, session.user.id))
      .groupBy(brand.id, brand.name, brand.traderCount, brand.createdAt)
      .orderBy(desc(brand.traderCount), brand.name);

    return NextResponse.json(brands);
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
