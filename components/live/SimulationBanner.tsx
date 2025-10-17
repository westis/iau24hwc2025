"use client";

import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function SimulationBanner() {
  const { t } = useLanguage();

  return (
    <div className="bg-orange-500/10 border-b border-orange-500/30 py-2">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            {t.live?.simulationMode || "SIMULATION MODE"} -{" "}
            {t.live?.simulationModeDesc ||
              "This is not live race data. The race clock and data are simulated for testing purposes."}
          </span>
        </div>
      </div>
    </div>
  );
}




