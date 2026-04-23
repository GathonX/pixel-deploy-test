import { createContext, useContext, ReactNode } from 'react';
import { usePlatformStoreAPI } from '../hooks/usePlatformStoreAPI';

type PlatformContextType = ReturnType<typeof usePlatformStoreAPI>;

const PlatformContext = createContext<PlatformContextType | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const store = usePlatformStoreAPI();

  return (
    <PlatformContext.Provider value={store}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
