import { createHash } from "node:crypto";
import { z } from "zod";

const locationSchema = z.string().trim().min(2).max(100);
const geocodingSchema = z.object({
  results: z.array(z.object({
    name: z.string(),
    country: z.string(),
    admin1: z.string().nullish(),
    latitude: z.number(),
    longitude: z.number(),
  })).optional(),
});
const forecastSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    precipitation: z.number(),
    wind_speed_10m: z.number(),
    weather_code: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()).min(3),
    temperature_2m_max: z.array(z.number()).min(3),
    temperature_2m_min: z.array(z.number()).min(3),
    precipitation_probability_max: z.array(z.number().nullish()).min(3),
    weather_code: z.array(z.number()).min(3),
  }),
});

const weatherRateLimits = new Map<string, { count: number; windowStartedAt: number }>();

function describeWeather(code: number) {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather conditions unavailable";
}

function allowWeatherRequest(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const id = createHash("sha256").update(address).digest("hex");
  const now = Date.now();
  const previous = weatherRateLimits.get(id);
  if (!previous || now - previous.windowStartedAt >= 60_000) {
    weatherRateLimits.set(id, { count: 1, windowStartedAt: now });
    return true;
  }
  if (previous.count >= 30) return false;
  previous.count += 1;
  return true;
}

export async function GET(request: Request) {
  const parsedLocation = locationSchema.safeParse(new URL(request.url).searchParams.get("location") ?? "Coimbatore");
  if (!parsedLocation.success) return Response.json({ error: "Enter a location between 2 and 100 characters." }, { status: 400 });
  if (!allowWeatherRequest(request)) {
    return Response.json({ error: "Too many weather requests. Try again in a minute." }, { status: 429 });
  }

  try {
    const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodingUrl.searchParams.set("name", parsedLocation.data);
    geocodingUrl.searchParams.set("count", "1");
    geocodingUrl.searchParams.set("language", "en");
    geocodingUrl.searchParams.set("format", "json");
    const geocodingResponse = await fetch(geocodingUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!geocodingResponse.ok) {
      return Response.json({ error: "The weather location service is temporarily unavailable." }, { status: 502 });
    }
    const geocoding = geocodingSchema.safeParse(await geocodingResponse.json());
    if (!geocoding.success) {
      return Response.json({ error: "The weather location service returned an unexpected response." }, { status: 502 });
    }
    const location = geocoding.data.results?.[0];
    if (!location) return Response.json({ error: "No matching weather location was found." }, { status: 404 });

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(location.latitude));
    forecastUrl.searchParams.set("longitude", String(location.longitude));
    forecastUrl.searchParams.set("timezone", "auto");
    forecastUrl.searchParams.set("forecast_days", "3");
    forecastUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code");
    forecastUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");
    forecastUrl.searchParams.set("temperature_unit", "celsius");
    forecastUrl.searchParams.set("wind_speed_unit", "kmh");
    const forecastResponse = await fetch(forecastUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!forecastResponse.ok) {
      return Response.json({ error: "The weather provider could not return a forecast for this location." }, { status: 502 });
    }
    const forecastResult = forecastSchema.safeParse(await forecastResponse.json());
    if (!forecastResult.success) {
      return Response.json({ error: "The weather provider returned an unexpected response." }, { status: 502 });
    }

    const { current, daily } = forecastResult.data;
    return Response.json({
      weather: {
        provider: "Open-Meteo",
        location: `${location.name}${location.admin1 ? `, ${location.admin1}` : ""}`,
        country: location.country,
        localTime: current.time,
        current: {
          updatedAt: current.time,
          temperatureC: current.temperature_2m,
          condition: describeWeather(current.weather_code),
          humidity: current.relative_humidity_2m,
          rainfallMm: current.precipitation,
          windKph: current.wind_speed_10m,
        },
        forecast: daily.time.map((date, index) => ({
          date,
          highC: daily.temperature_2m_max[index],
          lowC: daily.temperature_2m_min[index],
          chanceOfRain: daily.precipitation_probability_max[index] ?? 0,
          condition: describeWeather(daily.weather_code[index]),
        })),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The weather provider is temporarily unavailable. Retry shortly." }, { status: 502 });
  }
}
