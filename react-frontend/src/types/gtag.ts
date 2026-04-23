// src/types/gtag.ts - Types partagés pour Google Analytics

export interface GtagFunction {
  (command: "js", param: Date): void;
  (command: "config", param: string, params?: Record<string, unknown>): void;
  (command: "event", param: string, params?: Record<string, unknown>): void;
  (command: string, param: string | Date, params?: Record<string, unknown>): void;
}

declare global {
  interface Window {
    gtag?: GtagFunction;
    dataLayer: unknown[];
  }
}

export {};