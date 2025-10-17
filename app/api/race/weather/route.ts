// app/api/race/weather/route.ts
import { NextResponse } from "next/server";
import { getActiveRaceInfo } from "@/lib/db/database";

interface WeatherHour {
  time: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  icon: string; // 'sun' | 'moon' | 'cloud' | 'rain' | 'cloud-sun' | 'cloud-moon'
  description: string;
}

export async function GET() {
  try {
    // Get active race location and times
    const activeRace = await getActiveRaceInfo();

    if (!activeRace) {
      return NextResponse.json(
        { error: "No active race found" },
        { status: 404 }
      );
    }

    const { locationLatitude, locationLongitude, locationName, startDate, endDate } = activeRace;

    // Check for weather API key
    const apiKey =
      process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;

    if (!apiKey) {
      // Return mock data if no API key
      const mockData = generateMockWeather();
      return NextResponse.json(mockData);
    }

    // Build weather API URL - prefer coordinates, fallback to city name
    let url: string;
    if (locationLatitude && locationLongitude) {
      // Use coordinates (most accurate)
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${locationLatitude}&lon=${locationLongitude}&units=metric&appid=${apiKey}`;
    } else if (locationName) {
      // Fallback to city name (extract city from "City, Country" format)
      const cityName = locationName.split(',')[0].trim();
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&units=metric&appid=${apiKey}`;
    } else {
      return NextResponse.json(
        { error: "Race location not configured (need coordinates or city name)" },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      next: { revalidate: 10800 }, // Cache for 3 hours
    });

    if (!response.ok) {
      throw new Error("Weather API request failed");
    }

    const data = await response.json();

    // Calculate race hours to show
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Race start/end times not configured" },
        { status: 400 }
      );
    }

    const raceStart = new Date(startDate);
    const raceEnd = new Date(endDate);
    const now = new Date();

    // Determine effective forecast period
    // Strategy: Use race times if they overlap with the 5-day forecast window
    // Otherwise, show next 24 hours from now
    let effectiveStart: Date;
    let effectiveEnd: Date;
    let usingRaceTimes = false;

    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // Check if race overlaps with forecast window
    if (raceStart <= fiveDaysFromNow && raceEnd >= now) {
      // Race is within forecast window (current or upcoming)
      effectiveStart = raceStart < now ? now : raceStart;
      effectiveEnd = raceEnd;
      usingRaceTimes = true;
    } else {
      // Race is too far in future or past - show next 24 hours
      effectiveStart = now;
      effectiveEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      usingRaceTimes = false;
    }

    // Transform to our format - filter for effective period
    const hourlyForecast: WeatherHour[] = data.list
      .filter((item: any) => {
        const itemTime = new Date(item.dt * 1000);
        return itemTime >= effectiveStart && itemTime <= effectiveEnd;
      })
      .map((item: any) => {
        const time = new Date(item.dt * 1000);
        const hour = time.getHours();
        const isNight = hour < 6 || hour > 20;

        const weatherMain = item.weather[0].main.toLowerCase();
        let icon = "cloud";

        if (weatherMain.includes("rain") || weatherMain.includes("drizzle")) {
          icon = "rain";
        } else if (weatherMain.includes("clear")) {
          icon = isNight ? "moon" : "sun";
        } else if (weatherMain.includes("cloud")) {
          icon = isNight ? "cloud-moon" : "cloud-sun";
        }

        return {
          time: time.toISOString(),
          temp: Math.round(item.main.temp),
          feelsLike: Math.round(item.main.feels_like),
          humidity: item.main.humidity,
          windSpeed: Math.round(item.wind.speed * 10) / 10, // Keep in m/s, round to 1 decimal
          precipitation: item.rain ? Math.round(item.rain["3h"] || 0) : 0,
          icon,
          description: item.weather[0].description,
        };
      });

    return NextResponse.json({
      forecast: hourlyForecast,
      raceStart: raceStart.toISOString(),
      raceEnd: raceEnd.toISOString(),
      usingRaceTimes, // Indicates if showing race period or next 24h
      forecastStart: effectiveStart.toISOString(),
      forecastEnd: effectiveEnd.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching weather:", error);

    // Return mock data on error
    const mockData = generateMockWeather();
    return NextResponse.json(mockData);
  }
}

function generateMockWeather(): {
  forecast: WeatherHour[];
  raceStart: string;
  raceEnd: string;
} {
  const now = new Date();
  const raceStart = new Date(now);
  raceStart.setHours(10, 0, 0, 0); // 10 AM start
  const raceEnd = new Date(raceStart.getTime() + 24 * 60 * 60 * 1000); // +24 hours

  const forecast: WeatherHour[] = [];

  for (let i = 0; i < 24; i++) {
    const time = new Date(raceStart.getTime() + i * 60 * 60 * 1000);
    const hour = time.getHours();
    const isNight = hour < 6 || hour > 20;

    // Simple temperature model
    const baseTemp = 18;
    const variation = Math.sin(((hour - 6) * Math.PI) / 12) * 8;
    const temp = Math.round(baseTemp + variation);

    // Simple weather pattern
    let icon = "cloud-sun";
    let precipitation = 0;
    if (hour >= 2 && hour <= 6) {
      icon = isNight ? "cloud-moon" : "rain";
      precipitation = 2;
    } else if (hour >= 12 && hour <= 15) {
      icon = "sun";
    } else if (isNight) {
      icon = "moon";
    }

    forecast.push({
      time: time.toISOString(),
      temp,
      feelsLike: temp - 2,
      humidity: 65 + Math.round(Math.random() * 20),
      windSpeed: 10 + Math.round(Math.random() * 15),
      precipitation,
      icon,
      description: icon.includes("rain")
        ? "Light rain"
        : icon.includes("sun")
        ? "Clear"
        : "Partly cloudy",
    });
  }

  return {
    forecast,
    raceStart: raceStart.toISOString(),
    raceEnd: raceEnd.toISOString(),
  };
}








