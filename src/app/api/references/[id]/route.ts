import { NextResponse } from "next/server";

// ⚠️ Хранилище должно быть общим для /api/references и /api/references/[id].
// Вынеси REFERENCES в общий модуль и импортируй оттуда.
// Пример: src/app/api/references/store.ts
import { REFERENCES } from "../../_store"; // подкорректируй путь под себя

type RefStatus = "open" | "matched" | "closed";

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ id: string }> }  // Next 15: params — Promise
) {
    const { id } = await ctx.params;
    const ref = REFERENCES.find(r => r.id === id);
    if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ref);
}

export async function PATCH(
    req: Request,
    ctx: { params: Promise<{ id: string }> }  // Next 15: обязательно await
) {
    const { id } = await ctx.params;

    const ref = REFERENCES.find(r => r.id === id);
    if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({} as Partial<{ status: RefStatus }>));
    if (!body?.status || !["open", "matched", "closed"].includes(body.status)) {
        return NextResponse.json({ error: "Bad status" }, { status: 400 });
    }

    ref.status = body.status as RefStatus;
    return NextResponse.json(ref, { status: 200 });
}
