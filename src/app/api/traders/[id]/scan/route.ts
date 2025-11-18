import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trader, brand, traderBrand } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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
      const brands = await extractBrandsFromWebsite(traderRecord.url);

      if (brands.length === 0) {
        await db
          .update(trader)
          .set({
            status: "completed",
            lastScannedAt: new Date(),
            errorMessage: "No brands found on this website",
          })
          .where(eq(trader.id, id));

        return NextResponse.json({
          success: true,
          brands: [],
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

async function extractBrandsFromWebsite(url: string): Promise<string[]> {
  console.log("Scanning homepage:", url);
  const brands = await extractBrandsFromPage(url);
  console.log(`Found ${brands.length} brands`);
  return brands;
}

async function extractBrandsFromPage(url: string): Promise<string[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const html = await response.text();

  // Extract text content from HTML, including alt attributes and meta tags
  const cleanedText = extractTextFromHTML(html);

  // Use OpenAI to extract brand names from the text
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Please add it to your .env file."
    );
  }

  const openAIResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a brand extraction specialist for electronics traders. Your job is to analyze website content and extract ALL electronics brand names mentioned anywhere on the page. Look for: camera brands (Canon, Nikon, Sony, Fujifilm, Panasonic, Olympus, Leica), phone brands (Samsung, Apple, iPhone, Xiaomi, OnePlus, Google, Motorola, Nokia, Huawei), computer brands (Dell, HP, Lenovo, Asus, Acer, MSI, Apple, MacBook), TV brands (LG, Samsung, Sony, TCL, Hisense, Vizio), audio brands (Bose, JBL, Sennheiser, Audio-Technica, Sony, Beats), storage brands (SanDisk, Kingston, Samsung, Western Digital, Seagate, Crucial), smartwatch brands (Apple Watch, Garmin, Fitbit, Samsung Galaxy Watch), accessory brands (Otterbox, Spigen, Anker), camera accessory brands (GoPro, DJI, Manfrotto), and ANY other electronics brands you can find. Be thorough and include all brands, even if mentioned only once. Return ONLY a JSON array of brand names, nothing else.",
          },
          {
            role: "user",
            content: `Extract ALL electronics brand names from this website content. Be very thorough - include every brand you can find in product names, descriptions, links, navigation menus, footers, and anywhere else. Return only a JSON array of unique brand names in proper capitalization, for example: ["Canon", "Nikon", "Sony", "SanDisk", "Apple", "Samsung"]. If no brands are found, return an empty array [].\n\nWebsite content (first 40000 chars):\n${cleanedText.slice(0, 40000)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    }
  );

  if (!openAIResponse.ok) {
    const errorText = await openAIResponse.text();
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const aiResult = await openAIResponse.json();
  const content = aiResult.choices?.[0]?.message?.content || "[]";

  // Parse the JSON array from the AI response
  try {
    // Try to extract JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const brands = JSON.parse(jsonMatch[0]) as string[];
      // Remove duplicates and return
      return [...new Set(brands.map((b) => b.trim()).filter((b) => b.length > 0))];
    }
    return [];
  } catch (error) {
    console.error("Failed to parse AI response:", content);
    return [];
  }
}

function extractTextFromHTML(html: string): string {
  // Extract text from HTML tags, including alt attributes and meta content
  let text = html;

  // Extract alt attributes from images
  const altMatches = html.matchAll(/alt=["']([^"']+)["']/gi);
  for (const match of altMatches) {
    text += ` ${match[1]}`;
  }

  // Extract title attributes
  const titleMatches = html.matchAll(/title=["']([^"']+)["']/gi);
  for (const match of titleMatches) {
    text += ` ${match[1]}`;
  }

  // Extract meta content
  const metaMatches = html.matchAll(/content=["']([^"']+)["']/gi);
  for (const match of metaMatches) {
    text += ` ${match[1]}`;
  }

  // Remove script and style tags
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Remove extra whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
