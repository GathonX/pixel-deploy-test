import { Loader2 } from 'lucide-react';

const Spinner = ({ size = 24, className = '' }: { size?: number; className?: string }) => {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <Loader2 className="animate-spin text-gray-500" size={size} />
    </div>
  );
};

export default Spinner;
