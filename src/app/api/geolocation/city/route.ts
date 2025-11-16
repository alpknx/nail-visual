import { NextRequest, NextResponse } from "next/server";
import { CITIES } from "@/lib/domain";

/**
 * Определяет город по координатам используя Nominatim (OpenStreetMap)
 * Бесплатный сервис, но требует соблюдения rate limits
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    );
  }

  try {
    // Используем Nominatim для reverse geocoding
    // Важно: использовать User-Agent согласно их политике использования
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          "User-Agent": "NailVisual/1.0", // Требуется Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch location data");
    }

    const data = await response.json();

    // Логируем полный ответ для отладки
    console.log('Nominatim response:', JSON.stringify(data.address, null, 2));

    // Извлекаем город из ответа
    // Nominatim возвращает разные поля в зависимости от локации
    // Приоритет: city > town > municipality > village > county
    const detectedCity =
      data.address?.city ||
      data.address?.town ||
      data.address?.municipality ||
      data.address?.village ||
      data.address?.county;

    if (!detectedCity) {
      console.log('No city found in Nominatim response');
      return NextResponse.json(
        { error: "City not found in location data" },
        { status: 404 }
      );
    }

    console.log('Detected city from Nominatim:', detectedCity);

    // Нормализуем название города для сопоставления
    const normalizeCityName = (name: string) => {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Удаляем диакритические знаки
        .replace(/[^a-z0-9]/g, ""); // Удаляем все не-буквенно-цифровые символы
    };

    const normalizedDetected = normalizeCityName(detectedCity);

    // Ищем точное совпадение в списке доступных городов
    // Используем только точное совпадение, чтобы избежать ложных срабатываний
    const matchedCity = CITIES.find((city) => {
      const normalized = normalizeCityName(city);
      // Только точное совпадение или если обнаруженный город содержит название города из списка
      // (но не наоборот, чтобы избежать ложных совпадений)
      return normalized === normalizedDetected || 
             (normalizedDetected.length >= normalized.length && normalizedDetected.includes(normalized));
    });

    if (matchedCity) {
      console.log('Matched city:', matchedCity, 'from detected:', detectedCity);
      return NextResponse.json({ city: matchedCity, detectedCity, rawAddress: data.address });
    }

    console.log('No match found for detected city:', detectedCity);
    // Если точного совпадения нет, возвращаем null, чтобы пользователь выбрал вручную
    // Также проверяем страну - если это не Польша, то явно указываем это
    const isPoland = data.address?.country_code === 'pl' || 
                     data.address?.country?.toLowerCase().includes('poland') ||
                     data.address?.country?.toLowerCase().includes('polska');
    
    return NextResponse.json({ 
      city: null, 
      detectedCity, 
      rawAddress: data.address,
      country: data.address?.country,
      countryCode: data.address?.country_code,
      isPoland,
      message: isPoland 
        ? "Detected city is not in the available cities list" 
        : "Detected location is outside Poland. Please select a Polish city manually."
    });
  } catch (error) {
    console.error("Geolocation API error:", error);
    return NextResponse.json(
      { error: "Failed to determine city from coordinates" },
      { status: 500 }
    );
  }
}

