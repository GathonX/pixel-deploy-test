import { useParams } from 'react-router-dom';

/**
 * Hook pour récupérer le siteId depuis l'URL /dashboard/site/:siteId/*
 * Retourne null si utilisé hors d'une route site-specific.
 */
export function useSite(): string | null {
  const { siteId } = useParams<{ siteId: string }>();
  return siteId ?? null;
}
