import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trader, traderBrand } from "@/lib/schema";
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

    // Get all traders that carry this brand and belong to the user
    const traders = await db
      .select({
        id: trader.id,
        name: trader.name,
        url: trader.url,
        status: trader.status,
        lastScannedAt: trader.lastScannedAt,
      })
      .from(trader)
      .innerJoin(traderBrand, eq(trader.id, traderBrand.traderId))
      .where(
        and(
          eq(traderBrand.brandId, id),
          eq(trader.userId, session.user.id)
        )
      )
      .orderBy(trader.name);

    return Response.json(traders);
  } catch (error) {
    console.error("Error fetching traders for brand:", error);
    return Response.json(
      { error: "Failed to fetch traders" },
      { status: 500 }
    );
  }
}
