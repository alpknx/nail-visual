import { NextResponse } from "next/server";
import type { ProProfile } from "@/lib/api";

// пример стораджа
const profiles = new Map<string, ProProfile>();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: proId } = await params;
    const data = profiles.get(proId) ?? { proId };
    return NextResponse.json(data);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: proId } = await params;
    const body = await req.json().catch(() => ({}));
    const next: ProProfile = {
        proId,
        minPricePln: body.minPricePln ?? undefined,
        instagram: body.instagram ?? undefined,
        city: body.city ?? undefined,
        bio: body.bio ?? undefined,
    };
    profiles.set(proId, next);
    return NextResponse.json(next);
}
