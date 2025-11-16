import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ data: [] });
    }

    const { searchParams } = new URL(req.url);
    const designIds = searchParams.get("designIds")?.split(",").filter(Boolean) || [];

    if (designIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Используем inArray для проверки вхождения designId в массив
    const userFavorites = await db
      .select({
        designId: favorites.designId,
      })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, session.user.id),
          inArray(favorites.designId, designIds)
        )
      );

    return NextResponse.json({ 
      data: userFavorites.map(f => String(f.designId))
    });
  } catch (error: any) {
    console.error("Error checking favorites:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check favorites" },
      { status: 500 }
    );
  }
}

