import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trader, brand, traderBrand } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// DELETE /api/traders/[id] - Delete a trader and clean up brands
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the trader belongs to the user
    const [traderRecord] = await db
      .select()
      .from(trader)
      .where(and(eq(trader.id, id), eq(trader.userId, session.user.id)))
      .limit(1);

    if (!traderRecord) {
      return NextResponse.json({ error: "Trader not found" }, { status: 404 });
    }

    // Get all brands associated with this trader before deletion
    const associatedBrands = await db
      .select({ brandId: traderBrand.brandId })
      .from(traderBrand)
      .where(eq(traderBrand.traderId, id));

    const brandIds = associatedBrands.map((b) => b.brandId);

    // Delete the trader (this will cascade delete traderBrand relationships)
    await db.delete(trader).where(eq(trader.id, id));

    // Update trader counts for affected brands and delete brands with count 0
    for (const brandId of brandIds) {
      // Update the trader count
      await db.execute(sql`
        UPDATE ${brand}
        SET trader_count = (
          SELECT COUNT(DISTINCT trader_id)
          FROM ${traderBrand}
          WHERE brand_id = ${brandId}
        )
        WHERE id = ${brandId}
      `);

      // Check if count is now 0 and delete if so
      const [brandRecord] = await db
        .select()
        .from(brand)
        .where(eq(brand.id, brandId))
        .limit(1);

      if (brandRecord && brandRecord.traderCount === 0) {
        await db.delete(brand).where(eq(brand.id, brandId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trader:", error);
    return NextResponse.json(
      { error: "Failed to delete trader" },
      { status: 500 }
    );
  }
}
