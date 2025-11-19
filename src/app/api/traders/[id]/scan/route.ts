import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trader, brand, traderBrand } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/crawler";

export const maxDuration = 300; // 5 minutes for web scraping

// POST /api/traders/[id]/scan - Scan a trader website for brands
export async function POST(
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

    // Get the trader
    const [traderRecord] = await db
      .select()
      .from(trader)
      .where(and(eq(trader.id, id), eq(trader.userId, session.user.id)))
      .limit(1);

    if (!traderRecord) {
      return NextResponse.json({ error: "Trader not found" }, { status: 404 });
    }

    // Update status to processing
    await db
      .update(trader)
      .set({
        status: "processing",
        errorMessage: null,
      })
      .where(eq(trader.id, id));

    try {
      // Note: In a production app, this should be done in a background job
      // For now, we'll do it synchronously with a timeout

      // Use smart crawler to scan multiple pages
      const crawlResult = await crawlWebsite(traderRecord.url, {
        maxPages: 10,      // Scan up to 10 pages
        maxDepth: 2,       // Go up to 2 levels deep
        delayMs: 1000,     // 1 second delay between requests
        timeout: 10000,    // 10 second timeout per page
      });

      const brands = crawlResult.brands;

      console.log(`Crawl summary: ${crawlResult.totalPages} pages scanned, ${brands.length} unique brands found`);

      if (brands.length === 0) {
        await db
          .update(trader)
          .set({
            status: "completed",
            lastScannedAt: new Date(),
            errorMessage: `No brands found after scanning ${crawlResult.totalPages} pages`,
          })
          .where(eq(trader.id, id));

        return NextResponse.json({
          success: true,
          brands: [],
          pagesScanned: crawlResult.totalPages,
          message: "No brands found",
        });
      }

      // Insert or update brands and create relationships
      for (const brandName of brands) {
        const normalizedName = brandName.toLowerCase().trim();

        // Check if brand exists
        const existingBrand = await db
          .select()
          .from(brand)
          .where(eq(brand.name, brandName))
          .limit(1);

        let brandRecord;
        if (existingBrand.length > 0) {
          // Brand exists, just use it
          brandRecord = existingBrand[0];
        } else {
          // Create new brand
          const [newBrand] = await db
            .insert(brand)
            .values({
              name: brandName,
              normalizedName,
              traderCount: 0,
            })
            .returning();
          brandRecord = newBrand;
        }

        // Create trader-brand relationship if it doesn't exist
        try {
          await db.insert(traderBrand).values({
            traderId: id,
            brandId: brandRecord.id,
          });

          // Update brand trader count
          await db.execute(sql`
            UPDATE ${brand}
            SET trader_count = (
              SELECT COUNT(DISTINCT trader_id)
              FROM ${traderBrand}
              WHERE brand_id = ${brandRecord.id}
            )
            WHERE id = ${brandRecord.id}
          `);
        } catch (error) {
          // Relationship might already exist, that's ok
          console.log(`Relationship already exists for brand ${brandName}`);
        }
      }

      // Mark trader as completed
      await db
        .update(trader)
        .set({
          status: "completed",
          lastScannedAt: new Date(),
        })
        .where(eq(trader.id, id));

      return NextResponse.json({
        success: true,
        brands,
        count: brands.length,
        pagesScanned: crawlResult.totalPages,
        crawlDetails: crawlResult.pagesScanned,
      });
    } catch (scanError) {
      console.error("Error scanning website:", scanError);

      // Mark trader as failed
      await db
        .update(trader)
        .set({
          status: "failed",
          errorMessage:
            scanError instanceof Error
              ? scanError.message
              : "Failed to scan website",
        })
        .where(eq(trader.id, id));

      return NextResponse.json(
        {
          error: "Failed to scan website",
          details:
            scanError instanceof Error ? scanError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in scan endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process scan request" },
      { status: 500 }
    );
  }
}

