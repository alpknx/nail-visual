import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from './index';
import { categories, tags } from './schema';
import { eq } from 'drizzle-orm';

const SEED_DATA = {
  technique: [
    { slug: 'gel', en: 'Gel', pl: 'Żel', ru: 'Гель' },
    { slug: 'acrylic', en: 'Acrylic', pl: 'Akryl', ru: 'Акрил' },
    { slug: 'natural', en: 'Natural', pl: 'Naturalne', ru: 'Натуральные' },
  ],
  shape: [
    { slug: 'almond', en: 'Almond', pl: 'Migdał', ru: 'Миндаль' },
    { slug: 'coffin', en: 'Coffin', pl: 'Trumienka', ru: 'Балерина' },
    { slug: 'stiletto', en: 'Stiletto', pl: 'Sztylet', ru: 'Стилет' },
    { slug: 'square', en: 'Square', pl: 'Kwadrat', ru: 'Квадрат' },
    { slug: 'oval', en: 'Oval', pl: 'Owal', ru: 'Овал' },
  ],
  style: [
    { slug: 'french', en: 'French', pl: 'French', ru: 'Френч' },
    { slug: 'ombre', en: 'Ombre', pl: 'Ombre', ru: 'Омбре' },
    { slug: 'marble', en: 'Marble', pl: 'Marmur', ru: 'Мрамор' },
    { slug: 'chrome', en: 'Chrome', pl: 'Efekt lustra', ru: 'Втирка' },
    { slug: '3d-art', en: '3D Art', pl: 'Zdobienia 3D', ru: '3D дизайн' },
    { slug: 'solid', en: 'Solid', pl: 'Jednolity', ru: 'Однотонный' },
  ],
  color: [
    { slug: 'red', en: 'Red', pl: 'Czerwony', ru: 'Красный' },
    { slug: 'pink', en: 'Pink', pl: 'Różowy', ru: 'Розовый' },
    { slug: 'nude', en: 'Nude', pl: 'Nude', ru: 'Нюд' },
    { slug: 'black', en: 'Black', pl: 'Czarny', ru: 'Черный' },
    { slug: 'blue', en: 'Blue', pl: 'Niebieski', ru: 'Синий' },
    { slug: 'green', en: 'Green', pl: 'Zielony', ru: 'Зеленый' },
    { slug: 'multi', en: 'Multi', pl: 'Wielokolorowy', ru: 'Мульти' },
    { slug: 'white', en: 'White', pl: 'Biały', ru: 'Белый' },
  ],
};

async function main() {
  console.log('🌱 Seeding database...');

  try {
    for (const [categorySlug, tagsData] of Object.entries(SEED_DATA)) {
      console.log(`Processing category: ${categorySlug}`);

      // 1. Create or Get Category
      let categoryId: number;
      const existingCategory = await db.query.categories.findFirst({
        where: eq(categories.slug, categorySlug),
      });

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const [newCategory] = await db.insert(categories).values({
          slug: categorySlug,
          nameTranslations: {
            en: categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1),
            pl: categorySlug, // Fallback
            ru: categorySlug, // Fallback
          },
        }).returning();
        categoryId = newCategory.id;
      }

      // 2. Create Tags
      for (const tag of tagsData) {
        await db.insert(tags).values({
          categoryId,
          slug: tag.slug,
          nameTranslations: {
            en: tag.en,
            pl: tag.pl,
            ru: tag.ru,
          },
        }).onConflictDoUpdate({
          target: [tags.categoryId, tags.slug],
          set: {
            nameTranslations: {
              en: tag.en,
              pl: tag.pl,
              ru: tag.ru,
            },
          },
        });
      }
    }

    console.log('✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
