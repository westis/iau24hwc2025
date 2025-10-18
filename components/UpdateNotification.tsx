"use client";

import { useEffect, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Component that checks for new app versions and prompts users to refresh
 * Checks every 5 minutes and shows a banner when a new version is deployed
 */
export function UpdateNotification() {
  const [showBanner, setShowBanner] = useState(false);
  const [initialBuildId, setInitialBuildId] = useState<string | null>(null);

  useEffect(() => {
    // Get initial build ID when component mounts
    const fetchInitialBuildId = async () => {
      try {
        const response = await fetch("/api/version");
        const data = await response.json();
        setInitialBuildId(data.buildId);
      } catch (error) {
        console.error("Failed to fetch initial build ID:", error);
      }
    };

    fetchInitialBuildId();

    // Check for updates every 5 minutes
    const checkForUpdates = async () => {
      if (!initialBuildId) return;

      try {
        const response = await fetch("/api/version", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        const data = await response.json();

        // If build ID changed, show update banner
        if (data.buildId !== initialBuildId && data.buildId !== "unknown" && data.buildId !== "error") {
          setShowBanner(true);
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    // Check every 5 minutes (300000 ms)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [initialBuildId]);

  if (!showBanner) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5" />
            <div>
              <p className="font-semibold text-sm">
                New version available! 🎉
              </p>
              <p className="text-xs opacity-90">
                Click refresh to get the latest updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="secondary"
              className="whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Now
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
