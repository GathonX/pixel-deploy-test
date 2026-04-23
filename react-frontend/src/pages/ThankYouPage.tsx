import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const ThankYouContent = () => {
  
  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl md:text-3xl">Merci pour votre paiement !</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700 text-lg mb-6">
              Votre paiement a été traité avec succès. Votre abonnement est maintenant actif.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-medium mb-4">Détails de votre abonnement :</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500 text-left">Plan :</span>
                <span className="font-medium text-right">Plan Pro</span>
                <span className="text-gray-500 text-left">Montant payé :</span>
                <span className="font-medium text-right">49€</span>
                <span className="text-gray-500 text-left">Date de début :</span>
                <span className="font-medium text-right">{new Date().toLocaleDateString()}</span>
                <span className="text-gray-500 text-left">Prochaine facturation :</span>
                <span className="font-medium text-right">
                  {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Une confirmation de votre paiement a été envoyée à votre adresse e-mail.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button className="bg-blue-500 hover:bg-blue-600" asChild>
              <Link to="/workspace">
                Aller au tableau de bord <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

const ThankYouPage = () => {
  return (
    <SidebarProvider>
      <DashboardLayout>
        <ThankYouContent />
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default ThankYouPage;
