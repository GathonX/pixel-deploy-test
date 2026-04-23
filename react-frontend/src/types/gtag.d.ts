// src/types/gtag.d.ts
declare global {
    interface Window {
        dataLayer: unknown[];
        gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
    }
}

export {};