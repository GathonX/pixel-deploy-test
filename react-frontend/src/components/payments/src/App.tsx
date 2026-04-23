// rect-frontend/src/components/payments/src/App.tsx
import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useSearchParams } from "react-router-dom";
import PaymentWrapper from "../PaymentWrapper";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./components/PaymentSuccess";
import { useToast } from './hooks/use-toast';
import paymentService, { ValidatePaymentResponse } from '@/services/paymentService';

const queryClient = new QueryClient();

const PaymentAppContent = () => {
  const [searchParams] = useSearchParams();
  const [paymentResult, setPaymentResult] = useState<ValidatePaymentResponse['data']['paymentResult'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔍 PaymentAppContent chargé, URL:', window.location.href);
    const token = searchParams.get("token");
    const payerId = searchParams.get("PayerID");

    console.log("🔍 Token:", token, "PayerID:", payerId);

    if (token && payerId) {
      const validatePayment = async () => {
        try {
          console.log('📤 Appel de validatePayment avec:', { token, payerId });
          const result: ValidatePaymentResponse = await paymentService.validatePayment({ token, payerId });
          console.log("✅ Résultat de validatePayment:", result);
          if (result.success && result.data && result.data.paymentResult) {
            setPaymentResult(result.data.paymentResult);
          } else {
            setError(result.message || "Impossible de valider le paiement.");
            toast({
              title: "Erreur",
              description: result.message || "Impossible de valider le paiement.",
              variant: "destructive",
            });
          }
        } catch (error: any) {
          console.error("❌ Erreur API:", error.message);
          setError(error.message || "Une erreur s'est produite lors de la validation.");
          toast({
            title: "Erreur",
            description: error.message || "Une erreur s'est produite lors de la validation.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      validatePayment();
    } else {
      console.warn("⚠️ Token ou PayerID manquant");
      setError("Paramètres de paiement manquants.");
      setIsLoading(false);
    }
  }, [searchParams, toast]);

  const handleContinue = () => {
    console.log('🔄 Redirection vers /workspace');
    window.location.href = "/workspace";
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/credits" element={<Index />} />
      <Route path="/subscription" element={<Index />} />
      <Route
        path="/payment/success"
        element={
          paymentResult ? (
            <PaymentSuccess paymentResult={paymentResult} onContinue={handleContinue} />
          ) : (
            <div>
              <h2>Erreur de paiement</h2>
              <p>{error || "Paiement non validé. Veuillez réessayer ou contacter le support."}</p>
            </div>
          )
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <PaymentWrapper>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PaymentAppContent />
      </TooltipProvider>
    </QueryClientProvider>
  </PaymentWrapper>
);

export default App;