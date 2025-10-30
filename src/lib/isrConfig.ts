/**
 * Экспортируй это из page.tsx для включения ISR:
 * 
 * export const revalidate = 3600; // 1 час
 * export const dynamicParams = true; // разрешить динамические routes
 */

// Для /pros/[id]/page.tsx:
export const proDetailRevalidate = 3600; // 1 час

// Для /pro/[id]/portfolio/page.tsx:
export const proPortfolioRevalidate = 3600; // 1 час

// Для /references/[id]/page.tsx (изменяется часто):
export const referenceDetailRevalidate = 300; // 5 минут

/**
 * Для generateStaticParams (pregenerate popular pages):
 * 
 * export async function generateStaticParams() {
 *   const topPros = await fetch('/api/pros?limit=100').then(r => r.json());
 *   return topPros.data.map((pro) => ({
 *     id: pro.proId,
 *   }));
 * }
 */
