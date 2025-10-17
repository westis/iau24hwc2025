"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  CloudRain,
  CloudMoon,
  CloudSun,
  Sun,
  Moon,
  Wind,
  Droplets,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface WeatherHour {
  time: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  icon: string;
  description: string;
}

const WeatherIcon = ({
  icon,
  className = "h-6 w-6",
}: {
  icon: string;
  className?: string;
}) => {
  switch (icon) {
    case "sun":
      return <Sun className={`${className} text-yellow-500`} />;
    case "moon":
      return <Moon className={`${className} text-slate-400`} />;
    case "cloud":
      return <Cloud className={`${className} text-gray-400`} />;
    case "rain":
      return <CloudRain className={`${className} text-blue-500`} />;
    case "cloud-sun":
      return <CloudSun className={`${className} text-amber-500`} />;
    case "cloud-moon":
      return <CloudMoon className={`${className} text-slate-300`} />;
    default:
      return <Cloud className={`${className} text-gray-400`} />;
  }
};

export function WeatherForecast() {
  const [forecast, setForecast] = useState<WeatherHour[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch("/api/race/weather");
        const data = await res.json();
        setForecast(data.forecast || []);
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();

    // Refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t.live?.weatherForecast || "Väderprognos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t.live?.weatherForecast || "Väder"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t.live?.weatherDescription || "Timprognos för loppet"}
        </p>
      </CardHeader>
      <CardContent>
        {forecast.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            {t.live?.noWeatherData || "No weather data available"}
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-max">
                {forecast.map((hour, index) => {
                  const time = new Date(hour.time);
                  const locale = language === "sv" ? "sv-SE" : "en-US";
                  const hourLabel = time.toLocaleTimeString(locale, {
                    hour: "numeric",
                    hour12: false,
                  });
                  const dayLabel = time.toLocaleDateString(locale, {
                    weekday: "short",
                  });

                  // Show day label for first hour or when day changes
                  const prevTime = index > 0 ? new Date(forecast[index - 1].time) : null;
                  const showDay = index === 0 || (prevTime && time.getDate() !== prevTime.getDate());

                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted/50 border border-border/50 min-w-[85px]"
                    >
                      {showDay && (
                        <div className="text-xs font-semibold text-muted-foreground">
                          {dayLabel}
                        </div>
                      )}
                      <div className="text-sm font-medium">{hourLabel}:00</div>
                      <WeatherIcon icon={hour.icon} className="h-7 w-7" />
                      <div className="text-lg font-bold">{hour.temp}°</div>
                      <div className="text-xs text-muted-foreground">
                        {t.live?.feelsLike || "Feels"} {hour.feelsLike}°
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Wind className="h-3 w-3" />
                        <span>{hour.windSpeed} m/s</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Droplets className="h-3 w-3" />
                        <span>{hour.humidity}%</span>
                      </div>
                      {hour.precipitation > 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {hour.precipitation}mm
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground text-center">
              {t.live?.weatherNote ||
                "Hourly forecast for race period. Updated every 30 minutes."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
