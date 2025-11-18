import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trader, brand, traderBrand } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/traders - List all traders for the current user
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const traders = await db
      .select()
      .from(trader)
      .where(eq(trader.userId, session.user.id))
      .orderBy(desc(trader.createdAt));

    return NextResponse.json(traders);
  } catch (error) {
    console.error("Error fetching traders:", error);
    return NextResponse.json(
      { error: "Failed to fetch traders" },
      { status: 500 }
    );
  }
}

// POST /api/traders - Create a new trader
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, url } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: "Name and URL are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const [newTrader] = await db
      .insert(trader)
      .values({
        name,
        url,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json(newTrader, { status: 201 });
  } catch (error) {
    console.error("Error creating trader:", error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json(
        { error: "A trader with this URL already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create trader" },
      { status: 500 }
    );
  }
}
