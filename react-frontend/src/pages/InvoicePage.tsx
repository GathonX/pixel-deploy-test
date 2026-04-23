import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { default as api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Download, AlertCircle } from 'lucide-react';
import { getDualPrice } from '@/utils/currency';
interface Invoice {
  id: number;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  billing_period: string;
  due_date: string;
  payment_date?: string;
  is_paid: boolean;
  payment_reference: string;
  payment_method?: string;
  feature_id?: number; // ✅ ID de la fonctionnalité (clé étrangère)
  feature?: {
    id: number;
    name: string;
    description: string;
    category: string;
    pricing?: {
      monthly: {
        price: number;
        period: string;
        display: string;
      };
      yearly: {
        price: number;
        period: string;
        original_price: number;
        discount_percentage: number;
        savings: number;
        display: string;
        monthly_equivalent: number;
      };
    };
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
  payment_instructions?: {
    status: string;
    due_date: string;
    payment_reference: string;
    payment_methods: Record<string, string>;
    next_step_url: string;
  };
  pdf_path?: string;
  created_at?: string; // Added for new header
}

interface InvoiceSummary {
  base_amount: number;
  tax_rate: string;
  tax_amount: number;
  total_amount: number;
  payment_methods: Record<string, string>;
  status_details: {
    current_status: string;
    is_paid: boolean;
    due_date?: string;
    payment_date?: string;
  };
}

const InvoicePage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const hasGeneratedRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    let isCancelled = false;
    
    const fetchInvoiceDetails = async () => {
      if (isCancelled) return;
      
      try {
        let response;
        
        try {
          response = await api.get(`/features/invoices/${invoiceId}`);
        } catch (loadError: any) {
          const generationKey = `generate-${invoiceId}`;
          if (hasGeneratedRef.current.has(generationKey)) {
            setLoading(false);
            return;
          }
          
          hasGeneratedRef.current.add(generationKey);
          
          try {
            response = await api.post(`/features/invoices/generate-for-feature/${invoiceId}`, {
              billing_period: 'monthly'
            });
            
            toast({
              title: "Facture générée",
              description: "Votre facture a été créée avec succès",
            });
          } catch (generateError: any) {
            hasGeneratedRef.current.delete(generationKey);
            throw generateError;
          }
        }
        
        if (isCancelled) return;
        
        if (response.data.success) {
          const invoiceData = response.data.data.invoice;
          setInvoice(invoiceData);
          setSummary(response.data.data.summary);
          setIsOverdue(response.data.data.is_overdue);

          if (invoiceData.feature?.pricing) {
            setBillingPeriod(invoiceData.billing_period === 'yearly' ? 'yearly' : 'monthly');
          }
        } else {
          const errorMessage = response.data.message || 
            response.data.error_details || 
            'Impossible de charger la facture';
          
          setError(errorMessage);
        }
      } catch (err: any) {
        if (isCancelled) return;
        
        const errorMessage = err.response?.data?.message || 
          err.response?.data?.error_details || 
          err.message || 
          'Une erreur est survenue';
        
        setError(errorMessage);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchInvoiceDetails();
    
    return () => {
      isCancelled = true;
    };
  }, [invoiceId]);

  const calculatePrice = () => {
    return invoice?.amount || 0;
  };

  const handleBillingPeriodChange = async (period: 'monthly' | 'yearly') => {
    setBillingPeriod(period);
    
    try {
      const response = await api.patch(`/features/invoices/${invoiceId}/update-billing-period`, {
        billing_period: period
      });
      
      if (response.data.success) {
        const updatedInvoice = prev => prev ? {
          ...prev,
          amount: response.data.data.amount,
          billing_period: response.data.data.billing_period
        } : null;
        
        setInvoice(updatedInvoice);
        
        toast({
          title: "Période mise à jour",
          description: `Le montant de la facture a été mis à jour pour la période ${period === 'monthly' ? 'mensuelle' : 'annuelle'}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Impossible de mettre à jour la période de facturation",
        variant: "destructive"
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/features/invoices/download/${invoiceId}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Facture-${invoice?.invoice_number || 'sans-numero'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: 'Téléchargement réussi',
        description: `La facture ${invoice?.invoice_number} a été téléchargée`
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
        err.response?.data?.error_details || 
        'Impossible de télécharger la facture';

      toast({
        title: 'Erreur de téléchargement',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleProceedToPayment = () => {
    const featureId = invoice?.feature_id || invoice?.feature?.id;
    
    if (featureId) {
      const navigationState = {
        invoiceNumber: invoice.invoice_number,
        amount: calculatePrice(),
        currency: invoice.currency,
        pdfPath: invoice.pdf_path,
        billingPeriod: billingPeriod,
        monthlyPrice: invoice?.feature?.pricing?.monthly?.price || 0,
        yearlyPrice: invoice?.feature?.pricing?.yearly?.price || 0,
      };
      
      navigate(`/features/purchase/${featureId}`, {
        state: navigationState
      });
    } else {
      toast({
        title: 'Impossible de procéder au paiement',
        description: 'Les informations de la fonctionnalité sont manquantes',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Chargement de la facture...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-600 mb-2">Facture non trouvée</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button 
          variant="destructive" 
          onClick={() => window.location.href = '/features'}
        >
          Retourner aux fonctionnalités
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      {/* En-tête : Logo + Instructions de paiement */}
      <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6 mb-6">
        {/* Logo à gauche */}
        <div className="flex-shrink-0">
          <img src="/images/pixel-logo.png" alt="Logo PixelRise" className="h-24" />
        </div>
        
        <div className="text-center max-w-md">
          <div className={`inline-block px-4 py-2 rounded-lg font-bold text-lg mb-3 ${
            invoice?.is_paid 
              ? 'bg-green-100 text-green-700 border-2 border-green-500' 
              : 'bg-red-100 text-red-700 border-2 border-red-500'
          }`}>
            {invoice?.is_paid ? 'PAYÉE' : 'NON PAYÉE'}
          </div>
          
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>Date d'échéance :</strong> {invoice?.due_date}</p>
            
            <div className="bg-yellow-100 border border-yellow-300 p-3 rounded">
              <p className="text-sm font-bold text-yellow-900">
                Référence de paiement :
              </p>
              <p className="text-blue-600 font-bold text-lg">{invoice?.payment_reference}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Titre de la facture */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Facture proforma #{invoice?.invoice_number}
        </h1>
      </div>

      {/* Entête facture + client */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold text-lg text-blue-600 mb-3 border-b pb-2">Détails de la facture</h3>
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Numéro :</span> {invoice?.invoice_number}
            </div>
            <div>
              <span className="font-semibold">Date d'émission :</span> {invoice?.created_at}
            </div>
            <div>
              <span className="font-semibold">Date d'échéance :</span> {invoice?.due_date}
            </div>
            <div>
              <span className="font-semibold">Type :</span> Facture proforma
            </div>
            <div className="pt-2 border-t">
              <span className="font-semibold">Référence de paiement :</span>
              <span className="ml-2 text-blue-600 font-bold text-lg">
                {invoice?.payment_reference}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-lg text-blue-600 mb-3 border-b pb-2">Facturé à</h3>
          <div className="space-y-2">
            <div className="font-semibold text-lg">{invoice?.user?.name}</div>
            <div className="text-gray-700">{invoice?.user?.email}</div>
          </div>
        </div>
      </div>

      {/* Table des produits/fonctionnalités */}
      <div className="mb-6">
        <h3 className="font-bold text-lg text-blue-600 mb-3 border-b pb-2">Articles de la facture</h3>
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Période de service</th>
              <th className="p-3 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b bg-gray-50">
              <td className="p-3">
                <div className="font-semibold">{invoice?.feature?.name}</div>
                <div className="text-sm text-gray-600">{invoice?.feature?.description}</div>
              </td>
              <td className="p-3">
                <div>{billingPeriod === 'monthly' ? 'Mensuelle' : 'Annuelle'}</div>
                <div className="text-sm text-gray-600">
                  {invoice?.due_date} - {/* Calculer date fin */}
                  {billingPeriod === 'monthly' ? '30 jours' : '365 jours'}
                </div>
              </td>
              <td className="p-3 text-right font-semibold">{calculatePrice()} {invoice?.currency}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-300">
        <h3 className="font-bold text-lg text-blue-900 mb-4">Période de facturation</h3>
        {invoice?.feature?.pricing && (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              className={`flex-1 px-6 py-4 border-2 rounded-lg font-semibold transition-all ${
                billingPeriod === 'monthly' 
                  ? 'bg-blue-600 text-white border-blue-700' 
                  : 'bg-white text-blue-600 border-blue-400 hover:border-blue-600'
              }`}
              onClick={() => handleBillingPeriodChange('monthly')}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span>Mensuelle</span>
                {billingPeriod === 'monthly' && <span>✓</span>}
              </div>
              <div className="font-bold">
                {invoice.feature.pricing.monthly.price} {invoice.currency}/mois
              </div>
              <div className="text-sm mt-1">
                {getDualPrice(invoice.feature.pricing.monthly.price).ariary}
              </div>
            </button>
            <button
              className={`flex-1 px-6 py-4 border-2 rounded-lg font-semibold transition-all relative ${
                billingPeriod === 'yearly' 
                  ? 'bg-green-600 text-white border-green-700' 
                  : 'bg-white text-green-600 border-green-400 hover:border-green-600'
              }`}
              onClick={() => handleBillingPeriodChange('yearly')}
            >
              {invoice.feature.pricing.yearly.discount_percentage > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  -{invoice.feature.pricing.yearly.discount_percentage}%
                </div>
              )}
              <div className="flex items-center justify-center gap-2 mb-2">
                <span>Annuelle</span>
                {billingPeriod === 'yearly' && <span>✓</span>}
              </div>
              <div className="font-bold">
                {invoice.feature.pricing.yearly.price} {invoice.currency}/an
              </div>
              <div className="text-sm mt-1">
                {getDualPrice(invoice.feature.pricing.yearly.price).ariary}
              </div>
              {invoice.feature.pricing.yearly.discount_percentage > 0 && (
                <div className="text-xs mt-2 px-2 py-1 rounded font-bold bg-yellow-300 text-yellow-900">
                  Économisez {invoice.feature.pricing.yearly.discount_percentage}%
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bloc total */}
      <div className="flex justify-end mb-6">
        <div className="bg-gray-50 rounded-lg p-4 w-full max-w-sm border border-gray-300">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Sous-total :</span>
              <span className="font-semibold">{calculatePrice()} {invoice?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">TVA (0%) :</span>
              <span className="font-semibold">0,00 {invoice?.currency}</span>
            </div>
            <div className="pt-2 border-t-2 border-blue-600">
              <div className="flex justify-between">
                <span className="font-bold text-lg">Total :</span>
                <span className="text-xl font-bold text-blue-600">{calculatePrice()} {invoice?.currency}</span>
              </div>
              <div className="flex justify-end">
                <span className="text-sm font-semibold text-blue-500">
                  {getDualPrice(calculatePrice()).ariary}
                </span>
              </div>
            </div>
            {!invoice?.is_paid && (
              <div className="pt-2 border-t">
                <div className="flex justify-between">
                  <span className="font-bold text-red-600">Solde dû :</span>
                  <span className="text-xl font-bold text-red-600">{calculatePrice()} {invoice?.currency}</span>
                </div>
                <div className="flex justify-end">
                  <span className="text-sm font-semibold text-red-500">
                    {getDualPrice(calculatePrice()).ariary}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Boutons action */}
      <div className="border-t-2 pt-6 mt-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-3">
            <Button 
              onClick={handleDownloadPDF} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-5 h-5" /> Télécharger
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.print()}
              className="flex items-center gap-2"
            >
              Imprimer
            </Button>
          </div>
          {!invoice?.is_paid && (
            <Button 
              onClick={handleProceedToPayment} 
              disabled={!invoice?.feature_id && !invoice?.feature?.id}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Procéder au paiement
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
        <p>PixelRise - marketing@pixel-rise.com</p>
        <p className="mt-1">Facture générée le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
  );
};

export default InvoicePage;