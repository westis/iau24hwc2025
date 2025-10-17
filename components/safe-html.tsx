"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface SafeHtmlProps {
  html: string;
  className?: string;
  hideImages?: boolean; // New prop to hide images in preview mode
}

export function SafeHtml({ html, className = "", hideImages = false }: SafeHtmlProps) {
  const [sanitizedHtml, setSanitizedHtml] = useState("");

  useEffect(() => {
    // Only run DOMPurify on client side
    if (typeof window !== "undefined") {
      const allowedTags = [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "s",
        "a",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
      ];

      // Only include img tag if we're not hiding images
      if (!hideImages) {
        allowedTags.push("img");
      }

      const clean = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: [
          "href",
          "target",
          "rel",
          "src",
          "alt",
          "style",
          "width",
          "class",
        ],
      });
      setSanitizedHtml(clean);
    }
  }, [html, hideImages]);

  return (
    <div
      className={`prose prose-sm max-w-none [&_img]:mx-auto [&_img]:block [&_img]:rounded-lg [&_img]:my-4 [&_strong]:text-foreground [&_strong]:font-bold ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
