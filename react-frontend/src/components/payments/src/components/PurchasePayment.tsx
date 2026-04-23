import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, CreditCard, ArrowLeft, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import PaymentInformation from '@/components/PaymentInformation';
import { getDualPrice } from '@/utils/currency';
import { submitPurchasePayment, getPurchase } from '../services/purchaseService';
import api from '@/services/api';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface LocationState {
  orderId: string;
  orderReference: string;
  itemName: string;
  itemDescription?: string;
  itemThumbnail?: string;
  source: string;
  totalEur: number;
  totalAriary: number;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

const sourceLabels: Record<string, string> = {
  'site-builder': 'Site Builder - Template Premium',
  'studio-domain': 'Studio Domaine - Nom de domaine',
  'marketplace': 'Marketplace',
};

const PurchasePayment: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    contact_number: '',
    order_reference: '',
    amount_claimed: '',
    payment_method: '',
    user_message: '',
    payment_proofs: [] as File[],
  });

  const [orderInfo, setOrderInfo] = useState<LocationState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const state = location.state as LocationState | null;

    if (state && state.orderId) {
      // Si on a le state (navigation depuis la facture), l'utiliser directement
      setOrderInfo(state);
      setFormData((prev) => ({
        ...prev,
        order_reference:  state.orderReference,
        amount_claimed:   state.totalEur.toString(),
        full_name:        prev.full_name        || state.userName  || '',
        email:            prev.email            || state.userEmail || '',
        contact_number:   prev.contact_number   || state.userPhone || '',
      }));
    } else if (orderId) {
      // Sinon, charger la commande depuis l'API
      setLoading(true);
      getPurchase(orderId)
        .then((order) => {
          const item = order.items?.[0];
          const ref = order.id.slice(0, 8).toUpperCase();
          const info: LocationState = {
            orderId:       order.id,
            orderReference: ref,
            itemName:      item?.name        || '',
            itemDescription: item?.description,
            itemThumbnail: item?.thumbnail,
            source:        item?.source      || '',
            totalEur:      order.totalEur,
            totalAriary:   order.totalAriary,
            userName:      order.userName,
            userEmail:     order.userEmail,
            userPhone:     order.userPhone,
          };
          setOrderInfo(info);
          setFormData((prev) => ({
            ...prev,
            order_reference:  ref,
            amount_claimed:   order.totalEur.toString(),
            full_name:        prev.full_name       || order.fullName      || order.userName  || '',
            email:            prev.email           || order.email         || order.userEmail || '',
            contact_number:   prev.contact_number  || order.contactNumber || order.userPhone || '',
          }));
        })
        .catch(() => {
          toast({
            title: 'Erreur',
            description: 'Impossible de charger la commande.',
            variant: 'destructive',
          });
          navigate(`/purchases/invoice/${orderId}`);
        })
        .finally(() => setLoading(false));
    }
  }, [orderId, location, navigate, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const tooLarge = files.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge.length > 0) {
      toast({
        title: 'Fichier trop volumineux',
        description: `${tooLarge.map(f => f.name).join(', ')} dépasse ${MAX_FILE_SIZE_MB} MB. Compressez l'image ou réduisez la taille du PDF.`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    if (files.length + formData.payment_proofs.length > 5) {
      toast({
        title: 'Limite atteinte',
        description: 'Maximum 5 fichiers autorisés',
        variant: 'destructive',
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      payment_proofs: [...prev.payment_proofs, ...files],
    }));
  };

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      payment_proofs: prev.payment_proofs.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderInfo || !orderId) return;

    if (!formData.order_reference || !formData.amount_claimed) {
      toast({
        title: 'Facture requise',
        description: 'La référence de commande et le montant sont obligatoires.',
        variant: 'destructive',
      });
      navigate(`/purchases/invoice/${orderId}`);
      return;
    }

    if (!formData.payment_method) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une méthode de paiement',
        variant: 'destructive',
      });
      return;
    }

    if (formData.payment_proofs.length < 1) {
      toast({
        title: 'Erreur',
        description: 'Veuillez joindre au moins 1 fichier de preuve de paiement (la facture PixelRise PDF téléchargée)',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(0);

      const submitData = new FormData();
      submitData.append('full_name', formData.full_name);
      submitData.append('email', formData.email);
      submitData.append('contact_number', formData.contact_number);
      submitData.append('order_reference', formData.order_reference);
      submitData.append('amount_claimed', formData.amount_claimed);
      submitData.append('payment_method', formData.payment_method);
      submitData.append('user_message', formData.user_message);

      formData.payment_proofs.forEach((file, index) => {
        submitData.append(`payment_proofs[${index}]`, file);
      });

      await api.post(
        `/purchases/${orderId}/submit-payment`,
        submitData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) {
              setUploadProgress(Math.round((e.loaded * 100) / e.total));
            }
          },
        }
      );

      toast({
        title: 'Paiement soumis',
        description: 'Votre preuve de paiement a été envoyée. Un administrateur va la vérifier.',
      });

      navigate(`/purchases/confirmation/${orderId}`);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.message || 'Impossible de soumettre le paiement',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (!orderInfo || loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/purchases/invoice/${orderId}`)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la facture
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Paiement — {orderInfo.itemName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Informations du produit */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-4 mb-4">
                {orderInfo.itemThumbnail && (
                  <img
                    src={orderInfo.itemThumbnail}
                    alt={orderInfo.itemName}
                    className="w-20 h-14 rounded object-cover"
                  />
                )}
                <div>
                  <h3 className="font-medium text-lg">{orderInfo.itemName}</h3>
                  {orderInfo.itemDescription && (
                    <p className="text-sm text-slate-600">{orderInfo.itemDescription}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {sourceLabels[orderInfo.source] || orderInfo.source}
                  </p>
                </div>
              </div>

              {/* Résumé du prix */}
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700">Total à payer :</span>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      {orderInfo.totalEur.toFixed(2)}€
                    </p>
                    <p className="text-lg font-semibold text-blue-500">
                      {getDualPrice(orderInfo.totalEur).ariary}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions de paiement */}
            <div className="bg-yellow-50 border-2 border-yellow-300 p-5 rounded-lg mb-6 shadow-sm">
              <h4 className="font-bold text-yellow-900 mb-3 text-lg flex items-center gap-2">
                Instructions de Paiement - À suivre obligatoirement
              </h4>
              <div className="text-sm text-yellow-800 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">1.</span>
                  <p><strong>Effectuez le paiement</strong> via votre méthode préférée (Orange Money, Airtel Money, Mvola, etc.)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">2.</span>
                  <p><strong>Conservez TOUTES les preuves</strong> de transaction fournies par l'opérateur</p>
                </div>
                <div className="flex items-start gap-2 bg-red-100 border border-red-300 p-2 rounded">
                  <span className="font-bold text-red-700">3.</span>
                  <p className="text-red-800"><strong>OBLIGATOIRE :</strong> Joignez la <strong>facture PixelRise</strong> (PDF) téléchargée depuis la page de facture</p>
                </div>
                <div className="flex items-start gap-2 bg-red-100 border border-red-300 p-2 rounded">
                  <span className="font-bold text-red-700">4.</span>
                  <p className="text-red-800"><strong>OBLIGATOIRE :</strong> Ajoutez le <strong>reçu/facture de l'opérateur</strong> (Orange Money, Airtel Money, Mvola, etc.)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">5.</span>
                  <p><strong>Ajoutez des screenshots</strong> de la transaction si disponibles (recommandé)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">6.</span>
                  <p><strong>Remplissez le formulaire</strong> ci-dessous avec toutes les informations demandées</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">7.</span>
                  <p><strong>Soumettez votre demande</strong> - La validation se fera après vérification par notre équipe admin</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
                <p className="text-xs text-yellow-900 font-medium">
                  <strong>Important :</strong> Sans les 2 factures (PixelRise + Opérateur), votre demande ne pourra pas être traitée.
                </p>
              </div>
            </div>

            <PaymentInformation />

            <div className="pt-6 pb-3 text-center">
              <CardTitle>Formulaire de confirmation de paiement</CardTitle>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ligne 1 : Nom complet | Email */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email pour les mises à jour</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Ligne 2 : Numéro de contact | Méthode de paiement */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_number">Numéro de contact</Label>
                  <Input
                    id="contact_number"
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contact_number: e.target.value }))
                    }
                    required
                    className="w-full"
                    placeholder="Ex: +261 34 12 345 67"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Méthode de Paiement</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, payment_method: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez une méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orange">Orange Money</SelectItem>
                      <SelectItem value="airtel_money">Airtel Money</SelectItem>
                      <SelectItem value="mvola">Mvola</SelectItem>
                      <SelectItem value="tap_tap_send">Tap Tap Send</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Ligne 3 : Référence de commande | Montant payé */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="order_reference">
                    Référence de commande
                    <span className="ml-2 text-xs text-gray-500">(Référence interne)</span>
                  </Label>
                  <Input
                    id="order_reference"
                    type="text"
                    value={formData.order_reference}
                    disabled
                    className="w-full bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Montant Payé (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount_claimed}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, amount_claimed: e.target.value }))
                    }
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Ligne 4 : Preuves de paiement (pleine largeur) */}
              <div className="space-y-2">
                <Label>
                  Preuves de Paiement
                  <span className="ml-2 text-xs text-red-500">* (Minimum 1 fichier)</span>
                </Label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                  <p className="text-sm text-blue-800 font-medium mb-2">Documents à fournir :</p>
                  <ul className="text-xs text-blue-700 space-y-1 ml-4">
                    <li>Facture générée par l'application (PDF téléchargé)</li>
                    <li>Reçu/Facture de l'opérateur (Orange Money, Airtel, Mvola, etc.)</li>
                    <li>Screenshot de la transaction (recommandé)</li>
                    <li>Autres preuves de paiement (si disponibles)</li>
                  </ul>
                  <p className="text-xs text-blue-600 mt-2">
                    Formats acceptés : Images (JPG, PNG) et PDF | Max 5 fichiers
                  </p>
                </div>
                <div>
                  <input
                    id="proofs"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('proofs')?.click()}
                    className="w-full flex items-center gap-2 border-2 border-blue-300 hover:bg-blue-50"
                  >
                    <Upload className="w-4 h-4" />
                    Ajouter des fichiers (max 5)
                  </Button>
                </div>

                {formData.payment_proofs.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm font-medium text-green-600">
                      {formData.payment_proofs.length} fichier(s) ajouté(s)
                    </p>
                    {formData.payment_proofs.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-100"
                        >
                          Supprimer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ligne 5 : Message (pleine largeur) */}
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Ajoutez des détails sur votre paiement..."
                  value={formData.user_message}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, user_message: e.target.value }))
                  }
                  rows={3}
                  className="w-full"
                />
              </div>

              {submitting && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{uploadProgress < 100 ? 'Envoi des fichiers...' : 'Traitement en cours...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress < 100 ? uploadProgress : 100}%` }}
                    />
                  </div>
                </div>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 py-3 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-md transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress < 100 ? `Envoi... ${uploadProgress}%` : 'Traitement...'}
                  </span>
                ) : (
                  'Soumettre la Demande de Paiement'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PurchasePayment;
