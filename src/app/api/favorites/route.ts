import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { favorites, designCatalog } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Получить избранное пользователя
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userFavorites = await db
    .select({
      id: favorites.id,
      designId: favorites.designId,
      createdAt: favorites.createdAt,
      design: {
        id: designCatalog.id,
        imageUrl: designCatalog.imageUrl,
        description: designCatalog.description,
        tags: designCatalog.tags,
        createdAt: designCatalog.createdAt,
      },
    })
    .from(favorites)
    .innerJoin(designCatalog, eq(favorites.designId, designCatalog.id))
    .where(eq(favorites.userId, session.user.id))
    .orderBy(desc(favorites.createdAt));

  return NextResponse.json({ data: userFavorites });
}

// Добавить в избранное
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { designId } = await req.json();

  if (!designId) {
    return NextResponse.json({ error: "designId is required" }, { status: 400 });
  }

  try {
    const [favorite] = await db
      .insert(favorites)
      .values({
        userId: session.user.id,
        designId: designId,
      })
      .returning();

    return NextResponse.json({ data: favorite });
  } catch (error: any) {
    // Если уже существует (unique constraint violation)
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already in favorites" }, { status: 409 });
    }
    throw error;
  }
}

// Удалить из избранного
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const designId = searchParams.get("designId");

  if (!designId) {
    return NextResponse.json({ error: "designId is required" }, { status: 400 });
  }

  await db
    .delete(favorites)
    .where(
      and(
        eq(favorites.userId, session.user.id),
        eq(favorites.designId, designId)
      )
    );

  return NextResponse.json({ success: true });
}

