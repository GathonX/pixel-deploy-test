import { createContext, useContext } from 'react';

// Provides the simulated viewport when content is rendered inside a DeviceFrame.
// null = no override → components use window.innerWidth as usual (public preview, live site).
export type PreviewViewport = 'desktop' | 'tablet' | 'mobile' | null;

export const PreviewViewportContext = createContext<PreviewViewport>(null);

export const usePreviewViewport = () => useContext(PreviewViewportContext);
