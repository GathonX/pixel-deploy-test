// * src/components/marketplace/MarketplaceWrapper.tsx */
import React from 'react';
import './marketplace-isolated.css';

interface MarketplaceWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const MarketplaceWrapper: React.FC<MarketplaceWrapperProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`marketplace-isolated ${className}`}>
      {children}
    </div>
  );
};

export default MarketplaceWrapper;
