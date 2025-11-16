// Утилита для работы с избранным через localStorage
const FAVORITES_KEY = "saved_designs_v1";
const MAX_SAVED_DESIGNS = 100; // Ограничение на количество сохраненных дизайнов

export function getFavoritesFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addFavoriteToStorage(designId: string): void {
  if (typeof window === "undefined") return;
  try {
    const favorites = getFavoritesFromStorage();
    if (!favorites.includes(designId)) {
      // Ограничение: максимум MAX_SAVED_DESIGNS дизайнов
      if (favorites.length >= MAX_SAVED_DESIGNS) {
        // Удаляем самый старый (первый в массиве)
        favorites.shift();
      }
      favorites.push(designId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch {
    // Ignore errors
  }
}

export function removeFavoriteFromStorage(designId: string): void {
  if (typeof window === "undefined") return;
  try {
    const favorites = getFavoritesFromStorage();
    const filtered = favorites.filter((id: string) => id !== designId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore errors
  }
}

export function isFavoriteInStorage(designId: string): boolean {
  const favorites = getFavoritesFromStorage();
  return favorites.includes(designId);
}

