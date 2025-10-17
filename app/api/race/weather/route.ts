// app/api/race/weather/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();

    // Get active race location and times
    const { data: activeRace } = await supabase
      .from("race_info")
      .select("location_latitude, location_longitude, start_time, end_time")
      .eq("is_active", true)
      .single();

    if (!activeRace) {
      return NextResponse.json(
        { error: "No active race found" },
        { status: 404 }
      );
    }

    const { location_latitude, location_longitude, start_time, end_time } = activeRace;

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

    // Calculate race hours to show
    const raceStart = new Date(start_time);
    const raceEnd = new Date(end_time);
    const now = new Date();

    // Start showing forecast from race start or current time (whichever is earlier)
    const forecastStart = now < raceStart ? raceStart : now;

    // Transform to our format - filter for race period and add details
    const hourlyForecast: WeatherHour[] = data.list
      .filter((item: any) => {
        const itemTime = new Date(item.dt * 1000);
        return itemTime >= forecastStart && itemTime <= raceEnd;
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
          windSpeed: Math.round(item.wind.speed * 3.6), // Convert m/s to km/h
          precipitation: item.rain ? Math.round(item.rain["3h"] || 0) : 0,
          icon,
          description: item.weather[0].description,
        };
      });

    return NextResponse.json({
      forecast: hourlyForecast,
      raceStart: raceStart.toISOString(),
      raceEnd: raceEnd.toISOString(),
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






