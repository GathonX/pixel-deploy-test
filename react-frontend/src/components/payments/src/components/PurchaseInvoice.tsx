import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  AlertCircle,
  Download,
  ArrowRight,
  CheckCircle,
  Clock,
  Printer,
  ArrowLeft,
  FileText,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { PurchaseOrder } from '../types/purchase';
import { getPurchase } from '../services/purchaseService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string }> = {
  pending: { label: 'EN ATTENTE', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', borderClass: 'border-yellow-500' },
  awaiting_payment: { label: 'NON PAYÉE', bgClass: 'bg-red-100', textClass: 'text-red-700', borderClass: 'border-red-500' },
  payment_submitted: { label: 'PREUVE ENVOYÉE', bgClass: 'bg-blue-100', textClass: 'text-blue-700', borderClass: 'border-blue-500' },
  confirmed: { label: 'PAYÉE', bgClass: 'bg-green-100', textClass: 'text-green-700', borderClass: 'border-green-500' },
  rejected: { label: 'REJETÉE', bgClass: 'bg-red-100', textClass: 'text-red-700', borderClass: 'border-red-500' },
  cancelled: { label: 'ANNULÉE', bgClass: 'bg-gray-100', textClass: 'text-gray-700', borderClass: 'border-gray-500' },
};

const sourceLabels: Record<string, string> = {
  'site-builder':           'Site Builder - Template Premium',
  'studio-domain':          'Studio Domaine - Nom de domaine',
  'marketplace':            'Marketplace',
  'workspace-subscription': 'Abonnement Workspace',
  'site-language':          'Langue supplémentaire',
};

const PurchaseInvoice: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { userPhone?: string } | null;
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const data = await getPurchase(orderId);
        if (!isCancelled) setOrder(data);
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.response?.data?.message || 'Impossible de charger la commande');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchOrder();
    return () => { isCancelled = true; };
  }, [orderId]);

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !order) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const ref = order.id.slice(0, 8).toUpperCase();
      pdf.save(`Facture-PixelRise-${ref}.pdf`);

      toast({
        title: 'Facture téléchargée',
        description: `Facture #${ref} téléchargée avec succès.`,
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!order) return;

    const item = order.items[0];
    const ref = order.id.slice(0, 8).toUpperCase();

    navigate(`/purchases/payment/${order.id}`, {
      state: {
        orderId: order.id,
        orderReference: ref,
        itemName: item?.name,
        itemDescription: item?.description,
        itemThumbnail: item?.thumbnail,
        source: item?.source,
        totalEur: order.totalEur,
        totalAriary: order.totalAriary,
        userName: order.userName,
        userEmail: order.userEmail,
        // Priorité : profil utilisateur > téléphone saisi dans le formulaire précédent
        userPhone: order.userPhone || locationState?.userPhone,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Chargement de la facture...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col justify-center items-center h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-600 mb-2">Commande non trouvée</h1>
        <p className="text-gray-600 mb-4">{error || 'Cette commande est introuvable.'}</p>
        <Button variant="destructive" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </div>
    );
  }

  const item = order.items[0];
  const status = statusConfig[order.status] || statusConfig.pending;
  const canPay = order.status === 'pending' || order.status === 'awaiting_payment';

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Zone imprimable / PDF */}
      <div ref={invoiceRef} className="bg-white rounded-lg shadow-lg p-8">
        {/* En-tête : Logo + Statut */}
        <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6 mb-6">
          <div className="flex-shrink-0">
            <img src="/images/pixel-logo.png" alt="Logo PixelRise" className="h-24" />
          </div>

          <div className="text-center max-w-md">
            <div className={`inline-block px-4 py-2 rounded-lg font-bold text-lg mb-3 ${status.bgClass} ${status.textClass} border-2 ${status.borderClass}`}>
              {status.label}
            </div>

            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>Date de commande :</strong>{' '}
                {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>

              <div className="bg-yellow-100 border border-yellow-300 p-3 rounded">
                <p className="text-sm font-bold text-yellow-900">Référence de commande :</p>
                <p className="text-blue-600 font-bold text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Titre */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Facture proforma #{order.id.slice(0, 8).toUpperCase()}
          </h1>
        </div>

        {/* Détails facture + Client */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-lg text-blue-600 mb-3 border-b pb-2">Détails de la commande</h3>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Référence :</span> #{order.id.slice(0, 8).toUpperCase()}
              </div>
              <div>
                <span className="font-semibold">Date d'émission :</span>{' '}
                {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <div>
                <span className="font-semibold">Source :</span>{' '}
                {sourceLabels[item?.source] || item?.source}
              </div>
              <div>
                <span className="font-semibold">Type :</span> Achat unique
              </div>
              {order.paymentMethod && (
                <div className="pt-2 border-t">
                  <span className="font-semibold">Méthode de paiement :</span>{' '}
                  <span className="ml-2 capitalize">{order.paymentMethod.replace('_', ' ')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-lg text-blue-600 mb-3 border-b pb-2">Informations client</h3>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">ID Utilisateur :</span> {order.userId}
              </div>
              {order.userName && (
                <div>
                  <span className="font-semibold">Nom complet :</span> {order.userName}
                </div>
              )}
              {order.userEmail && (
                <div>
                  <span className="font-semibold">Email :</span> {order.userEmail}
                </div>
              )}
              {order.userPhone && (
                <div>
                  <span className="font-semibold">Téléphone :</span> {order.userPhone}
                </div>
              )}
              {order.confirmedAt && (
                <div>
                  <span className="font-semibold">Confirmée le :</span>{' '}
                  {new Date(order.confirmedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              )}
              {order.adminNote && (
                <div className="mt-3 p-2 bg-white rounded border">
                  <span className="font-semibold text-sm">Note admin :</span>
                  <p className="text-sm text-gray-700 italic">{order.adminNote}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tableau des articles */}
        <div className="mb-6">
          <h3 className="font-bold text-lg text-blue-600 mb-3 border-b pb-2">Articles de la commande</h3>
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Nom du site</th>
                <th className="p-3 text-right">Montant (EUR)</th>
                <th className="p-3 text-right">Montant (Ariary)</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((orderItem, index) => (
                <tr key={index} className="border-b bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {orderItem.thumbnail && (
                        <img
                          src={orderItem.thumbnail}
                          alt={orderItem.name}
                          className="w-12 h-8 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-semibold">{orderItem.name}</div>
                        {orderItem.description && (
                          <div className="text-sm text-gray-600">{orderItem.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{order.siteName || orderItem.source}</Badge>
                  </td>
                  <td className="p-3 text-right font-semibold">{orderItem.priceEur.toFixed(2)}€</td>
                  <td className="p-3 text-right font-semibold">
                    {orderItem.priceAriary.toLocaleString('fr-FR')} Ar
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bloc total */}
        <div className="flex justify-end mb-6">
          <div className="bg-gray-50 rounded-lg p-4 w-full max-w-sm border border-gray-300">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Sous-total :</span>
                <span className="font-semibold">{order.totalEur.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">TVA (0%) :</span>
                <span className="font-semibold">0,00€</span>
              </div>
              <div className="pt-2 border-t-2 border-blue-600">
                <div className="flex justify-between">
                  <span className="font-bold text-lg">Total :</span>
                  <span className="text-xl font-bold text-blue-600">{order.totalEur.toFixed(2)}€</span>
                </div>
                <div className="flex justify-end">
                  <span className="text-sm font-semibold text-blue-500">
                    {order.totalAriary.toLocaleString('fr-FR')} Ar
                  </span>
                </div>
              </div>
              {canPay && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="font-bold text-red-600">Solde dû :</span>
                    <span className="text-xl font-bold text-red-600">{order.totalEur.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-end">
                    <span className="text-sm font-semibold text-red-500">
                      {order.totalAriary.toLocaleString('fr-FR')} Ar
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statut : preuve envoyée */}
        {order.status === 'payment_submitted' && (
          <div className="mb-6 bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
            <Clock className="w-12 h-12 mx-auto mb-3 text-blue-500" />
            <h3 className="font-semibold text-lg text-blue-800">Paiement en cours de vérification</h3>
            <p className="text-sm text-gray-600 mt-1">
              Votre preuve de paiement a été envoyée. Un administrateur la vérifiera prochainement.
            </p>
          </div>
        )}

        {/* Statut : confirmé */}
        {order.status === 'confirmed' && (
          <div className="mb-6 bg-green-50 border border-green-200 p-6 rounded-lg text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <h3 className="font-semibold text-lg text-green-800">Achat confirmé !</h3>
            <p className="text-sm text-gray-600 mt-1">
              Votre paiement a été vérifié. Vous pouvez maintenant utiliser votre achat.
            </p>
          </div>
        )}

        {/* Statut : rejeté */}
        {order.status === 'rejected' && (
          <div className="mb-6 bg-red-50 border border-red-200 p-6 rounded-lg text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <h3 className="font-semibold text-lg text-red-800">Paiement rejeté</h3>
            {order.adminNote && (
              <p className="text-sm text-red-600 mt-2">Raison : {order.adminNote}</p>
            )}
          </div>
        )}

        {/* Footer de la facture */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          <p>PixelRise - marketing@pixel-rise.com</p>
          <p className="mt-1">Facture générée le {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* Preuves de paiement soumises (hors PDF, visible par client et admin) */}
      {order.paymentProofs && order.paymentProofs.length > 0 && (
        <div className="mt-6 border-2 border-blue-200 rounded-lg overflow-hidden">
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <h4 className="font-bold text-lg">
              Preuves de paiement soumises ({order.paymentProofs.length} fichier{order.paymentProofs.length > 1 ? 's' : ''})
            </h4>
          </div>
          <div className="p-5 bg-blue-50 space-y-3">
            {order.paymentProofs.map((url, index) => {
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
              const isPdf = /\.pdf$/i.test(url);
              const fileName = url.split('/').pop() || `Fichier ${index + 1}`;
              const fullUrl = url.startsWith('http') ? url : `https://app.pixel-rise.com${url}`;

              return (
                <div key={index} className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      {isImage ? (
                        <div className="w-5 h-5 text-green-600">🖼</div>
                      ) : (
                        <FileText className="w-5 h-5 text-red-600" />
                      )}
                      <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                        Justificatif {index + 1}{isPdf ? ' (PDF)' : isImage ? ' (Image)' : ''}
                      </span>
                    </div>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ouvrir
                    </a>
                  </div>
                  {isImage && (
                    <div className="p-3">
                      <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={fullUrl}
                          alt={`Preuve ${index + 1}`}
                          className="max-h-64 w-auto mx-auto rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Infos de paiement soumises */}
            {(order.fullName || order.contactNumber || order.paymentMethod || order.amountClaimed) && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-800 mb-2">Informations déclarées par le client :</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  {order.fullName && <div><span className="font-medium">Nom :</span> {order.fullName}</div>}
                  {order.email && <div><span className="font-medium">Email :</span> {order.email}</div>}
                  {order.contactNumber && <div><span className="font-medium">Téléphone :</span> {order.contactNumber}</div>}
                  {order.paymentMethod && <div><span className="font-medium">Méthode :</span> {order.paymentMethod}</div>}
                  {order.amountClaimed && <div><span className="font-medium">Montant déclaré :</span> {order.amountClaimed}€</div>}
                </div>
                {order.userMessage && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-sm">
                    <span className="font-medium">Message :</span> {order.userMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Important : Télécharger la facture (en dehors de la zone PDF) */}
      {canPay && (
        <div className="mb-6 mt-6 bg-red-50 border-2 border-red-300 p-5 rounded-lg">
          <h4 className="font-bold text-red-900 mb-2 text-lg">
            Étape obligatoire avant le paiement
          </h4>
          <p className="text-sm text-red-800 mb-3">
            Vous <strong>devez télécharger cette facture</strong> en PDF car elle fait partie de la preuve de paiement.
            Vous devrez la joindre lors de la soumission de votre paiement.
          </p>
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            {isDownloading ? 'Génération du PDF...' : 'Télécharger la facture (PDF)'}
          </Button>
        </div>
      )}

      {/* Boutons action (en dehors de la zone PDF) */}
      <div className="border-t-2 pt-6 mt-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-3">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Génération...' : 'Télécharger PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </div>

          {/* Bouton principal : Procéder au paiement */}
          {canPay && (
            <Button
              onClick={handleProceedToPayment}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8"
              size="lg"
            >
              Procéder au paiement
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}

          {order.status === 'confirmed' && (
            <Button
              onClick={() => {
                if (item?.source === 'site-builder') navigate('/site-builder');
                else if (item?.source === 'studio-domain') navigate('/studio-domaine');
                else navigate('/workspace');
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Accéder à mon achat
            </Button>
          )}

          {order.status === 'payment_submitted' && (
            <Button
              onClick={() => navigate(`/purchases/confirmation/${order.id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Voir la confirmation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoice;
