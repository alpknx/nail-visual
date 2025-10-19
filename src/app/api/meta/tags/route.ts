import { NextResponse } from "next/server";
import { TAGS } from "@/lib/api";
export async function GET() {
    return NextResponse.json({ tags: TAGS });
}