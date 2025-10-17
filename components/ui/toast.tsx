import * as React from "react";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function Toast({ title, description, variant = "default" }: ToastProps) {
  return (
    <div
      className={`rounded-lg p-4 shadow-lg ${
        variant === "destructive"
          ? "bg-destructive text-destructive-foreground"
          : "bg-card text-card-foreground border"
      }`}
    >
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-sm opacity-90">{description}</div>}
    </div>
  );
}








