import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/crawler";

export const maxDuration = 300; // 5 minutes for bulk scanning

interface BulkScanRequest {
  urls: string[];
}

interface UrlScanResult {
  url: string;
  brands: string[];
  pagesScanned: number;
  success: boolean;
  error?: string;
}

// POST /api/scan/bulk - Scan multiple URLs and return brand matrix
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as BulkScanRequest;
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of URLs to scan" },
        { status: 400 }
      );
    }

    // Validate and normalize URLs
    const validatedUrls: string[] = [];
    const invalidUrls: string[] = [];

    for (const url of urls) {
      try {
        const normalized = new URL(url.trim()).toString();
        validatedUrls.push(normalized);
      } catch {
        invalidUrls.push(url);
      }
    }

    if (validatedUrls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs provided" },
        { status: 400 }
      );
    }

    console.log(`Starting bulk scan of ${validatedUrls.length} URLs`);
    if (invalidUrls.length > 0) {
      console.log(`Skipping ${invalidUrls.length} invalid URLs:`, invalidUrls);
    }

    // Scan each URL
    const results: UrlScanResult[] = [];
    const allBrands = new Set<string>();

    for (let i = 0; i < validatedUrls.length; i++) {
      const url = validatedUrls[i];
      console.log(`[${i + 1}/${validatedUrls.length}] Scanning: ${url}`);

      try {
        const crawlResult = await crawlWebsite(url, {
          maxPages: 10,
          maxDepth: 2,
          delayMs: 1000,
          timeout: 10000,
        });

        crawlResult.brands.forEach((brand) => allBrands.add(brand));

        results.push({
          url,
          brands: crawlResult.brands,
          pagesScanned: crawlResult.totalPages,
          success: true,
        });

        console.log(
          `  ✓ Found ${crawlResult.brands.length} brands across ${crawlResult.totalPages} pages`
        );
      } catch (error) {
        console.error(`  ✗ Error scanning ${url}:`, error);
        results.push({
          url,
          brands: [],
          pagesScanned: 0,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Small delay between different websites
      if (i < validatedUrls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const uniqueBrands = Array.from(allBrands).sort();

    console.log(
      `Bulk scan complete: ${results.length} URLs scanned, ${uniqueBrands.length} unique brands found`
    );

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalUrls: validatedUrls.length,
        successfulScans: results.filter((r) => r.success).length,
        failedScans: results.filter((r) => !r.success).length,
        uniqueBrands: uniqueBrands.length,
        invalidUrls,
      },
      brands: uniqueBrands,
    });
  } catch (error) {
    console.error("Error in bulk scan:", error);
    return NextResponse.json(
      {
        error: "Failed to process bulk scan",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
