"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudRain, CloudMoon, CloudSun, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface WeatherHour {
  time: string;
  temp: number;
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
      return <Sun className={className} />;
    case "moon":
      return <Moon className={className} />;
    case "cloud":
      return <Cloud className={className} />;
    case "rain":
      return <CloudRain className={className} />;
    case "cloud-sun":
      return <CloudSun className={className} />;
    case "cloud-moon":
      return <CloudMoon className={className} />;
    default:
      return <Cloud className={className} />;
  }
};

export function WeatherForecast() {
  const [forecast, setForecast] = useState<WeatherHour[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

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
          {t.live?.weatherForecast || "Väderprognos"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              {forecast.map((hour, index) => {
                const time = new Date(hour.time);
                const hourLabel = time.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  hour12: false,
                });

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted/50 min-w-[60px]"
                  >
                    <div className="text-xs text-muted-foreground">
                      {hourLabel}:00
                    </div>
                    <WeatherIcon icon={hour.icon} className="h-6 w-6" />
                    <div className="text-sm font-medium">{hour.temp}°C</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
