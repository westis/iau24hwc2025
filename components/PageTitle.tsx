"use client";

import { useEffect } from "react";

interface PageTitleProps {
  title: string;
  suffix?: string;
}

export function PageTitle({ title, suffix = "IAU 24h WC 2025" }: PageTitleProps) {
  useEffect(() => {
    const fullTitle = suffix ? `${title} | ${suffix}` : title;
    document.title = fullTitle;
  }, [title, suffix]);

  return null;
}



