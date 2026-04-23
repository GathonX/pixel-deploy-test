import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PreviewViewportContext } from '../../contexts/PreviewViewportContext';

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

interface DeviceFrameProps {
  viewport: ViewportSize;
  children: ReactNode;
}

const viewportConfig = {
  desktop: { 
    width: '100%', 
    maxWidth: '100%',
    height: 'auto',
    label: 'Desktop',
    resolution: '1920 × 1080'
  },
  tablet: { 
    width: '768px', 
    maxWidth: '768px',
    height: '1024px',
    label: 'iPad',
    resolution: '768 × 1024'
  },
  mobile: { 
    width: '375px', 
    maxWidth: '375px',
    height: '812px',
    label: 'iPhone',
    resolution: '375 × 812'
  }
};

export function DeviceFrame({ viewport, children }: DeviceFrameProps) {
  const config = viewportConfig[viewport];
  const isDevice = viewport !== 'desktop';

  if (!isDevice) {
    return (
      <PreviewViewportContext.Provider value={viewport}>
        <div className="w-full h-full bg-background shadow-lg rounded-lg overflow-y-auto overflow-x-hidden section-container">
          {children}
        </div>
      </PreviewViewportContext.Provider>
    );
  }

  return (
    <PreviewViewportContext.Provider value={viewport}>
      <div className="flex flex-col items-center">
        {/* Device Label */}
        <div className="mb-3 text-center">
          <span className="text-xs font-medium text-muted-foreground">
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground/60 ml-2">
            {config.resolution}
          </span>
        </div>

        {/* Device Frame */}
        <div
          className={cn(
            "relative bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl transition-all duration-300",
            viewport === 'mobile' && "rounded-[2rem]"
          )}
          style={{
            width: `calc(${config.width} + 24px)`,
            maxWidth: `calc(${config.maxWidth} + 24px)`
          }}
        >
          {/* Notch (for mobile) */}
          {viewport === 'mobile' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-xl z-10 flex items-center justify-center">
              <div className="w-16 h-4 bg-gray-800 rounded-full" />
            </div>
          )}

          {/* Camera (for tablet) */}
          {viewport === 'tablet' && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-700 rounded-full" />
          )}

          {/* Screen */}
          <div
            className={cn(
              "bg-white rounded-[2rem] overflow-hidden flex flex-col",
              viewport === 'mobile' && "rounded-[1.5rem]"
            )}
            style={{
              width: config.width,
              height: config.height,
              maxHeight: 'calc(100vh - 180px)'
            }}
          >
            <div className="w-full flex-1 overflow-y-auto overflow-x-hidden section-container">
              {children}
            </div>
          </div>

          {/* Home Button (for tablet) */}
          {viewport === 'tablet' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-gray-800 rounded-full border border-gray-700" />
          )}

          {/* Bottom Bar (for mobile) */}
          {viewport === 'mobile' && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
          )}
        </div>
      </div>
    </PreviewViewportContext.Provider>
  );
}
