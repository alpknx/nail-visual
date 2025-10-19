import { NextResponse } from "next/server";
import { CITIES } from "@/lib/api";
export async function GET() {
    return NextResponse.json({ cities: CITIES });
}
