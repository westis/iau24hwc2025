"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Footer() {
  const { t } = useLanguage();

  // Obfuscated email to prevent spam bots
  const emailUser = "daniel";
  const emailDomain = "ultramarathon.se";
  const email = `${emailUser}@${emailDomain}`;

  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground md:flex-row md:gap-4">
          <div className="flex items-center gap-1">
            <span>{t.footer.siteBy}</span>
            <a
              href="https://ultramarathon.se"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              ultramarathon.se
            </a>
          </div>
          <span className="hidden md:inline">•</span>
          <div className="flex items-center gap-1">
            <span>{t.footer.contact}:</span>
            <span className="font-medium">{t.footer.contactName}</span>
            <span>-</span>
            <a
              href={`mailto:${email}`}
              className="font-medium text-foreground hover:underline"
              aria-label={`Email ${t.footer.contactName}`}
            >
              {email}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
