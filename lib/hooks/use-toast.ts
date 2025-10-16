// Simple toast hook implementation
import { useState, useCallback } from "react";

export interface Toast {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

// Simple implementation - in production you might want to use a toast library
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((props: Toast) => {
    setToasts((prev) => [...prev, props]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
  }, []);

  return { toast, toasts };
}


