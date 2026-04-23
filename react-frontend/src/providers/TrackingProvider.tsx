// src/providers/TrackingProvider.tsx
import { ReactNode } from "react";

interface TrackingProviderProps {
  children: ReactNode;
}

export const TrackingProvider = ({ children }: TrackingProviderProps) => {
  // Plus besoin de logique de tracking ici, car le middleware s'en charge
  return <>{children}</>;
};