// app/api/race/weather/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface WeatherHour {
  time: string;
  temp: number;
  icon: string; // 'sun' | 'moon' | 'cloud' | 'rain' | 'cloud-sun' | 'cloud-moon'
  description: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Get active race location
    const { data: activeRace } = await supabase
      .from("race_info")
      .select("location_latitude, location_longitude, start_date")
      .eq("is_active", true)
      .single();

    if (!activeRace) {
      return NextResponse.json(
        { error: "No active race found" },
        { status: 404 }
      );
    }

    const { location_latitude, location_longitude } = activeRace;

    if (!location_latitude || !location_longitude) {
      return NextResponse.json(
        { error: "Race location coordinates not configured" },
        { status: 400 }
      );
    }

    // Check for weather API key
    const apiKey =
      process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;

    if (!apiKey) {
      // Return mock data if no API key
      const mockData = generateMockWeather();
      return NextResponse.json(mockData);
    }

    // Fetch from OpenWeatherMap (or other weather API)
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${location_latitude}&lon=${location_longitude}&units=metric&appid=${apiKey}`;

    const response = await fetch(url, {
      next: { revalidate: 10800 }, // Cache for 3 hours
    });

    if (!response.ok) {
      throw new Error("Weather API request failed");
    }

    const data = await response.json();

    // Transform to our format (24 hourly forecasts)
    const hourlyForecast: WeatherHour[] = data.list
      .slice(0, 24)
      .map((item: any) => {
        const time = new Date(item.dt * 1000);
        const hour = time.getHours();
        const isNight = hour < 6 || hour > 20;

        const weatherMain = item.weather[0].main.toLowerCase();
        let icon = "cloud";

        if (weatherMain.includes("rain")) {
          icon = "rain";
        } else if (weatherMain.includes("clear")) {
          icon = isNight ? "moon" : "sun";
        } else if (weatherMain.includes("cloud")) {
          icon = isNight ? "cloud-moon" : "cloud-sun";
        }

        return {
          time: time.toISOString(),
          temp: Math.round(item.main.temp),
          icon,
          description: item.weather[0].description,
        };
      });

    return NextResponse.json({ forecast: hourlyForecast });
  } catch (error) {
    console.error("Error fetching weather:", error);

    // Return mock data on error
    const mockData = generateMockWeather();
    return NextResponse.json(mockData);
  }
}

function generateMockWeather(): { forecast: WeatherHour[] } {
  const now = new Date();
  const forecast: WeatherHour[] = [];

  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    const hour = time.getHours();
    const isNight = hour < 6 || hour > 20;

    // Simple temperature model
    const baseTemp = 18;
    const variation = Math.sin(((hour - 6) * Math.PI) / 12) * 8;
    const temp = Math.round(baseTemp + variation);

    // Simple weather pattern
    let icon = "cloud-sun";
    if (hour >= 2 && hour <= 6) icon = isNight ? "cloud-moon" : "rain";
    else if (hour >= 12 && hour <= 15) icon = "sun";
    else if (isNight) icon = "moon";

    forecast.push({
      time: time.toISOString(),
      temp,
      icon,
      description: icon.includes("rain")
        ? "Light rain"
        : icon.includes("sun")
        ? "Clear"
        : "Partly cloudy",
    });
  }

  return { forecast };
}

