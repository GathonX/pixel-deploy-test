/**
 * Store module-level pour la langue active du site Luxios.
 * Utilisé à la fois dans l'éditeur (via usePlatformStoreAPI) et sur le site public.
 * La langue active est persistée dans localStorage par siteId pour survivre aux rechargements.
 */

export interface StoredSiteLang {
  code: string;
  name: string;
  flag: string;
  isDefault: boolean;
}

const LS_KEY = (siteId: string) => `luxios_lang_${siteId}`;

let _lang = '';
let _siteId = '';
let _langs: StoredSiteLang[] = [];
const _listeners = new Set<() => void>();

export const luxiosLangStore = {
  get: (): string => _lang,

  set: (lang: string): void => {
    if (_lang === lang) return;
    _lang = lang;
    // Persister dans localStorage si on connaît le siteId
    if (_siteId) {
      try { localStorage.setItem(LS_KEY(_siteId), lang); } catch {}
    }
    _listeners.forEach(fn => fn());
  },

  setSiteId: (siteId: string): void => {
    _siteId = siteId;
  },

  getLangs: (): StoredSiteLang[] => _langs,

  setLangs: (langs: StoredSiteLang[]): void => {
    _langs = langs;
    _listeners.forEach(fn => fn());
  },

  /** Retourne la langue persistée pour ce site (ou '' si aucune). */
  getPersistedLang: (siteId: string): string => {
    try { return localStorage.getItem(LS_KEY(siteId)) ?? ''; } catch { return ''; }
  },

  subscribe: (fn: () => void): (() => void) => {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },
};
