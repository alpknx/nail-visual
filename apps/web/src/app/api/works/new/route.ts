import { NextResponse } from "next/server";
import { createWork, type City, type Tag } from "@/lib/api";

export async function POST(req: Request) {
    const body = await req.json();
    const w = await createWork({
        imageUrl: body.imageUrl as string,
        caption: body.caption as string | undefined,
        city: body.city as City,
        tags: body.tags as Tag[],
        proId: body.proId as string,
    });
    return NextResponse.json(w);
}
