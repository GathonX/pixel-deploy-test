import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import BookingPage from '@/components/mada-booking/src/pages/BookingPage';

// QueryClient isolé pour le formulaire public de réservation
const queryClient = new QueryClient();

export default function PublicBookingWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BookingPage />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
