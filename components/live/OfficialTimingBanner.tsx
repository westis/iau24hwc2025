"use client";

import { ExternalLink, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function OfficialTimingBanner() {
  const { t } = useLanguage();

  return (
    <div className="bg-blue-500/10 border-b border-blue-500/30 py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400">
          <Clock className="h-5 w-5 flex-shrink-0" />
          <a
            href="https://live.breizhchrono.com/external/live5/monitor.jsp?reference=1384568432549-14"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline flex items-center gap-2 transition-colors hover:text-blue-700 dark:hover:text-blue-300"
          >
            {t.live?.officialTimingLink || "View Official Timing Results"}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
