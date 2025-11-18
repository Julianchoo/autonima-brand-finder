import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brand, traderBrand, trader } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the trader belongs to the user
    const traderData = await db
      .select()
      .from(trader)
      .where(and(eq(trader.id, id), eq(trader.userId, session.user.id)))
      .limit(1);

    if (traderData.length === 0) {
      return Response.json({ error: "Trader not found" }, { status: 404 });
    }

    // Get all brands for this trader
    const brands = await db
      .select({
        id: brand.id,
        name: brand.name,
        traderCount: brand.traderCount,
      })
      .from(brand)
      .innerJoin(traderBrand, eq(brand.id, traderBrand.brandId))
      .where(eq(traderBrand.traderId, id))
      .orderBy(brand.name);

    return Response.json(brands);
  } catch (error) {
    console.error("Error fetching brands for trader:", error);
    return Response.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
