import { CITIES } from "@/lib/domain";
import type { City, Tag, Work, ClientReference, Offer } from "@/lib/domain";

// Re-export types/constants for backwards compatibility
export { CITIES, TAGS } from "@/lib/domain";
export type { City, Tag, Work, ClientReference, Offer } from "@/lib/domain";

// ---------- Локальные моки (fallback на ранний этап) ----------
let worksMem: Work[] = [
    { id: "w1", imageUrl: "/vercel.svg", tags: ["french","nude"], city: "Kraków", proId: "p1", createdAt: new Date().toISOString(), caption: null },
    { id: "w2", imageUrl: "/next.svg",   tags: ["red","chrome"],  city: "Warszawa", proId: "p2", createdAt: new Date().toISOString(), caption: null },
];

let referencesMem: ClientReference[] = [];

// имитация аплоада (до UploadThing/R2)
export async function fakeUpload(file: File): Promise<string> {
    return Promise.resolve(URL.createObjectURL(file)); // только для демо
}

// ---------- Works ----------
export type WorkDto = {
    id: string;
    proId: string;
    imageUrl: string;
    caption: string | null;
    tags: string[] | null;
    city: string | null;
    createdAt: string;
};

// Унифицированный список работ: сначала пробуем серверный API, иначе — локальный mock
export async function listWorks(params?: { city?: City; tags?: Tag[]; proId?: string; limit?: number }): Promise<Work[]> {
    let rows: WorkDto[] = [];

    try {
        const url = new URL("/api/works", window.location.origin);
        if (params?.city)  url.searchParams.set("city", params.city);
        if (params?.proId) url.searchParams.set("proId", params.proId);
        if (params?.limit) url.searchParams.set("limit", String(params.limit));
        // простую фильтрацию по тегу можно дописать как ?tag=...
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error("works api not ok");
        const json = await res.json();
        rows = (json.data ?? []) as WorkDto[];
    } catch (error) {
        console.warn("Failed to fetch works from DB API, attempting inspiration fallback", error);
    }

    if (rows.length) {
        return rows.map((r): Work => ({
            id: r.id,
            imageUrl: r.imageUrl,
            tags: (r.tags ?? []) as Tag[],
            city: ((r.city ?? CITIES[0]) as City),
            proId: r.proId,
            caption: r.caption,
            createdAt: r.createdAt,
        }));
    }

    const inspiration = await fetchWorksInspiration(params);
    if (inspiration.length) {
        return inspiration;
    }

    // fallback: локальные моки + простая фильтрация
    const city = params?.city;
    const tags = params?.tags;
    let data = worksMem;
    if (city) data = data.filter(w => w.city === city);
    if (tags?.length) data = data.filter(w => tags.every(t => w.tags.includes(t)));
    return data;
}

// создать работу (mock-вариант для демо; реальный API можешь добавить аналогично)
export async function createWork(input: {
    file: File;
    tags: Tag[];
    city: City;
    caption?: string;
    proId: string; // на MVP можно подставлять session.user.id (role=pro)
}) {
    const imageUrl = await fakeUpload(input.file);
    const w: Work = {
        id: `w_${Math.random().toString(36).slice(2, 9)}`,
        imageUrl,
        tags: input.tags,
        city: input.city,
        caption: input.caption ?? null,
        proId: input.proId,
        createdAt: new Date().toISOString(),
    };
    worksMem = [w, ...worksMem];
    return w;
}

export async function createWorkViaApi(input: {
    imageUrl: string;
    caption?: string | null;
    city?: string | null;
    tags?: string[];
}) {
    const res = await fetch("/api/works/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()).data;
}

// ---------- References ----------
/**
 * Совместимая сигнатура для createReference:
 * ✅ вариант А: { imageUrl, city, tags, note }
 * ✅ вариант Б: { file,     city, tags, note }  (файл будет загружен через fakeUpload)
 */
type CreateReferenceA = { imageUrl: string; city: City; tags?: Tag[]; note?: string | null };
type CreateReferenceB = { file: File;      city: City; tags?: Tag[]; note?: string | null };
export async function createReference(input: CreateReferenceA | CreateReferenceB) {
    // если пришёл файл — сначала получаем imageUrl
    const imageUrl = "file" in input ? await fakeUpload(input.file) : input.imageUrl;
    const city = input.city;
    const tags = (input.tags ?? []) as Tag[];
    const note = input.note ?? null;

    // пробуем серверный API
    try {
        const res = await fetch("/api/references", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl, city, tags, note }),
        });
        if (!res.ok) throw new Error("references api not ok");
        return res.json(); // сервер вернёт реальную запись
    } catch {
        // fallback: локальный mock
        const r: ClientReference = {
            id: `r_${Math.random().toString(36).slice(2, 9)}`,
            clientId: "mock-client",
            imageUrl,
            tags,
            city,
            note,
            createdAt: new Date().toISOString(),
        };
        referencesMem = [r, ...referencesMem];
        return r;
    }
}

export async function getReference(id: string) {
    try {
        const url = new URL("/api/references", window.location.origin);
        url.searchParams.set("id", id);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error("ref api not ok");
        const json = await res.json();
        return (json.data?.[0]) ?? null;
    } catch {
        return referencesMem.find(r => r.id === id) ?? null;
    }
}

// Список офферов по референсу
export async function listOffersByReference(referenceId: string): Promise<Offer[]> {
    const url = new URL("/api/offers", window.location.origin);
    url.searchParams.set("referenceId", referenceId);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch offers");
    return (await res.json()).data as Offer[];
}

// Патч статуса оффера (у тебя, возможно, уже есть — просто убедись в сигнатуре)
export async function patchOfferStatus(id: string, status: "accepted" | "declined") {
    const res = await fetch(`/api/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to patch offer");
    return res.json();
}

export async function createOffer(input: {
    refId: string;
    message?: string | null;
    pricePln?: number | null;
}) {
    const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to create offer");
    return res.json();
}

// Удалить референс (может только создатель - клиент)
export async function deleteReference(id: string) {
    const res = await fetch(`/api/references/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to delete reference");
    return res.json();
}

// Удалить оффер (может только создатель - мастер)
export async function deleteOffer(id: string) {
    const res = await fetch(`/api/offers/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to delete offer");
    return res.json();
}

// ---- PROS ----
export type Pro = {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    city: string | null;
    instagram: string | null;
    minPricePln: number | null;
    isVerified: boolean;
    worksCount: number;
    lastWorkAt: string | null; // приведём к ISO строке
};

export type ProSummary = {
    proId: string;
    worksCount: number;
    sampleUrl: string | null;
    cities: string[];
    tags: string[];
};

export async function listPros(params?: { city?: string; limit?: number }): Promise<ProSummary[]> {
    const url = new URL("/api/pros", window.location.origin);
    if (params?.city) url.searchParams.set("city", params.city);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    return (json.data ?? []) as ProSummary[];
}

export type ProProfile = {
    id: string;
    name: string | null;
    // email не включен - это приватная информация
    image: string | null;
    city: string | null;
    instagram: string | null;
    facebook: string | null;
    whatsapp: string | null;
    telegram: string | null;
    phone: string | null;
    externalLink: string | null;
    minPricePln: number | null;
    isVerified: boolean;
    worksCount: number;
    sampleUrl: string | null;
    lastWorkAt: string | null;
    cities: string[];
    tags: string[];
};

export async function getProProfile(id: string): Promise<ProProfile | null> {
    const res = await fetch(`/api/pros/${id}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    return json.data as ProProfile;
}

// ===== References (list) =====
export async function listReferences(params?: { city?: string; limit?: number }) {
    const url = new URL("/api/references", window.location.origin);
    if (params?.city) url.searchParams.set("city", params.city);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));

    try {
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (res.ok) {
            const json = await res.json();
            const data = (json.data ?? []) as ClientReference[];
            if (data.length) {
                return data;
            }
        }
    } catch (error) {
        console.warn("Failed to fetch references from DB API, falling back to Unsplash", error);
    }

    return fetchReferenceInspiration(params);
}

async function fetchReferenceInspiration(params?: { city?: string; limit?: number }) {
    const url = new URL("/api/reference-inspiration", window.location.origin);
    if (params?.city) url.searchParams.set("city", params.city);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));

    try {
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) {
            throw new Error(`Failed to fetch reference inspiration: ${res.status}`);
        }
        const json = await res.json();
        return (json.data ?? []) as ClientReference[];
    } catch (error) {
        console.error("Unable to load reference inspiration", error);
        return [];
    }
}

async function fetchWorksInspiration(params?: { city?: City; tags?: Tag[]; limit?: number }) {
    const url = new URL("/api/works/inspiration", window.location.origin);
    if (params?.city) url.searchParams.set("city", params.city);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    if (params?.tags?.length) url.searchParams.set("tags", params.tags.join(","));

    try {
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) {
            throw new Error(`Failed to fetch works inspiration: ${res.status}`);
        }
        const json = await res.json();
        return (json.data ?? []) as Work[];
    } catch (error) {
        console.error("Unable to load works inspiration", error);
        return [];
    }
}

// ===== Pro profile (me) =====
export type ProProfileInput = {
    bio?: string | null;
    instagram?: string | null;
    minPricePln?: number | null;
    city?: string | null;
};

// GET чужого профиля по id (/api/pros/[id])
export async function getProProfileById(id: string): Promise<ProProfile | null> {
    const res = await fetch(`/api/pros/${id}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    // поддержим оба варианта ответа: {data: ...} или просто объект
    return (json.data ?? json) as ProProfile;
}

// GET моего профиля (/api/pros/me)
export async function getMyProProfile(): Promise<ProProfile> {
    const res = await fetch("/api/pros/me", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch pro profile");
    return await res.json();
}

// UPSERT моего профиля (/api/pros/me)
export async function upsertProProfile(input: ProProfileInput) {
    const res = await fetch("/api/pros/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to upsert pro profile");
    return await res.json();
}
