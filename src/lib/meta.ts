export async function fetchTags(): Promise<string[]> {
    const res = await fetch("/api/meta/tags", { cache: "no-store" });
    const data = await res.json();
    return data.tags as string[];
}

export async function fetchCities(): Promise<string[]> {
    const res = await fetch("/api/meta/cities", { cache: "no-store" });
    const data = await res.json();
    return data.cities as string[];
}
