export function genId(prefix = ""): string {
    // Если есть crypto — возьмём часть uuid, иначе fallback на Math.random
    const rand =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
            : Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);

    // Немного читаемости: вставим подчёркивание после 4х символов
    const pretty = rand.slice(0, 4) + "_" + rand.slice(4, 10);
    return prefix ? `${prefix}${pretty}` : pretty;
}