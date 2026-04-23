import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  CheckCircle,
  Clock,
  CreditCard,
  MessageSquare,
  Hash,
  ArrowRight,
  Calendar,
  Package,
  Tag,
  FileText,
  Smartphone,
  Building2,
  Image,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { PurchaseOrder } from '../types/purchase';
import { getPurchase } from '../services/purchaseService';

const methodLabels: Record<string, string> = {
  mobile_money: 'Mobile Money',
  bank_transfer: 'Virement bancaire',
  card: 'Carte bancaire',
  orange: 'Orange Money',
  airtel_money: 'Airtel Money',
  mvola: 'Mvola',
  tap_tap_send: 'Tap Tap Send',
  other: 'Autre',
};

const sourceLabels: Record<string, string> = {
  'site-builder': 'Site Builder - Template Premium',
  'studio-domain': 'Studio Domaine - Nom de domaine',
  'marketplace': 'Marketplace',
};

const PurchaseConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      navigate('/workspace');
      return;
    }

    let isCancelled = false;
    const loadOrder = async () => {
      try {
        const data = await getPurchase(orderId);
        if (!isCancelled) setOrder(data);
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les détails de confirmation',
          variant: 'destructive',
        });
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadOrder();
    return () => { isCancelled = true; };
  }, [orderId, navigate]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-slate-600">
              Confirmation introuvable
            </h2>
            <Button onClick={() => navigate('/workspace')} className="mt-4">
              Retour au dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const item = order.items[0];
  const isConfirmed = order.status === 'confirmed';
  const isRejected = order.status === 'rejected';

  const getMethodIcon = (method?: string) => {
    switch (method) {
      case 'mobile_money': return <Smartphone className="w-5 h-5 text-slate-500" />;
      case 'bank_transfer': return <Building2 className="w-5 h-5 text-slate-500" />;
      case 'card': return <CreditCard className="w-5 h-5 text-slate-500" />;
      default: return <CreditCard className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header Success */}
        <div className="text-center py-8">
          {isConfirmed ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-green-600 mb-2">
                Achat confirmé !
              </h1>
              <p className="text-slate-600">
                Votre paiement a été vérifié par un administrateur. Vous pouvez maintenant utiliser votre achat.
              </p>
            </>
          ) : isRejected ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-500 text-3xl">✗</span>
              </div>
              <h1 className="text-3xl font-bold text-red-600 mb-2">
                Paiement rejeté
              </h1>
              <p className="text-slate-600">
                Votre preuve de paiement n'a pas été validée. Veuillez vérifier les détails ci-dessous.
              </p>
            </>
          ) : (
            <>
              <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-blue-600 mb-2">
                Preuve de paiement envoyée
              </h1>
              <p className="text-slate-600">
                Votre paiement a été soumis. Un administrateur vérifiera votre preuve de paiement rapidement.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Détails de la Transaction */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Détails de la Transaction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Produit acheté */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Produit acheté</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {item?.thumbnail && (
                      <img src={item.thumbnail} alt={item.name} className="w-16 h-12 rounded object-cover" />
                    )}
                    <div>
                      <p className="text-lg font-bold text-blue-700">{item?.name}</p>
                      {item?.description && (
                        <p className="text-sm text-blue-600">{item.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Informations client */}
                {(order.fullName || order.email || order.contactNumber) && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3">Informations client</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {order.fullName && (
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-slate-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-500">Nom complet</p>
                            <p className="font-medium text-slate-800">{order.fullName}</p>
                          </div>
                        </div>
                      )}
                      {order.email && (
                        <div className="flex items-start gap-2">
                          <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-500">Email</p>
                            <p className="font-medium text-slate-800">{order.email}</p>
                          </div>
                        </div>
                      )}
                      {order.contactNumber && (
                        <div className="flex items-start gap-2">
                          <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-500">Contact</p>
                            <p className="font-medium text-slate-800">{order.contactNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Informations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Tag className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Source</p>
                        <p className="font-semibold text-slate-900">
                          {sourceLabels[item?.source] || item?.source}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      {getMethodIcon(order.paymentMethod)}
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Méthode de paiement</p>
                        <p className="font-semibold text-slate-900 capitalize">
                          {methodLabels[order.paymentMethod || ''] || order.paymentMethod || 'Non définie'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Date de commande</p>
                        <p className="font-medium text-slate-700">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Hash className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Référence commande</p>
                        <p className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {order.confirmedAt && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Confirmée le</p>
                          <p className="font-medium text-slate-700">
                            {new Date(order.confirmedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.paymentProofs && order.paymentProofs.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Image className="w-5 h-5 text-slate-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">
                            Preuves de paiement ({order.paymentProofs.length})
                          </p>
                          <div className="space-y-1 mt-1">
                            {order.paymentProofs.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline block"
                              >
                                Preuve {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {!order.paymentProofs?.length && order.paymentProofUrl && (
                      <div className="flex items-start gap-3">
                        <Image className="w-5 h-5 text-slate-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Preuve de paiement</p>
                          <a
                            href={order.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Voir la preuve
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message utilisateur */}
                {order.userMessage && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Message</p>
                        <p className="text-sm text-blue-800">{order.userMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Montant et statut */}
                <div className="border-t pt-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Montant total</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {order.totalEur.toFixed(2)}€
                      </p>
                      <p className="text-lg text-slate-600 mt-1">
                        {order.totalAriary.toLocaleString('fr-FR')} Ar
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-sm text-slate-500 mb-2">Statut</p>
                      {isConfirmed ? (
                        <Badge className="bg-green-100 text-green-800 px-4 py-2">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirmé
                        </Badge>
                      ) : isRejected ? (
                        <Badge className="bg-red-100 text-red-800 px-4 py-2">
                          Rejeté
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 px-4 py-2">
                          <Clock className="w-4 h-4 mr-2" />
                          En traitement
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Note admin */}
                {order.adminNote && (
                  <div className={`p-4 rounded-lg border ${isRejected ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-start gap-3">
                      <MessageSquare className={`w-5 h-5 mt-0.5 ${isRejected ? 'text-red-600' : 'text-amber-600'}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold mb-1 ${isRejected ? 'text-red-900' : 'text-amber-900'}`}>
                          Note de l'administrateur
                        </p>
                        <p className="text-sm">{order.adminNote}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Besoin d'assistance ?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Si vous avez des questions concernant votre paiement,
                    n'hésitez pas à nous contacter.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/dashboard/tickets')}
                    >
                      Créer un ticket
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://pixel-rise.com/contact.html', '_blank')}
                    >
                      Nous contacter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Résumé achat */}
            <Card className={isConfirmed ? 'bg-green-50 border-green-200' : isRejected ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-lg ${isConfirmed ? 'text-green-800' : isRejected ? 'text-red-800' : 'text-blue-800'}`}>
                  {isConfirmed ? 'Achat confirmé' : isRejected ? 'Achat rejeté' : 'En cours de vérification'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className={`font-medium ${isConfirmed ? 'text-green-800' : isRejected ? 'text-red-800' : 'text-blue-800'}`}>
                    {item?.name}
                  </p>
                  <p className={`text-sm ${isConfirmed ? 'text-green-700' : isRejected ? 'text-red-700' : 'text-blue-700'}`}>
                    Montant : {order.totalEur.toFixed(2)}€
                  </p>
                  <p className={`text-xs ${isConfirmed ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-blue-600'}`}>
                    {order.totalAriary.toLocaleString('fr-FR')} Ar
                  </p>
                  <div className="pt-2">
                    <Badge className={isConfirmed ? 'bg-green-100 text-green-800' : isRejected ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                      {isConfirmed ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Confirmé</>
                      ) : isRejected ? (
                        'Rejeté'
                      ) : (
                        <><Clock className="w-3 h-3 mr-1" /> En traitement</>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              {isConfirmed && (
                <Button
                  onClick={() => {
                    if (item?.source === 'site-builder') navigate('/site-builder');
                    else if (item?.source === 'studio-domain') navigate('/studio-domaine');
                    else navigate('/workspace');
                  }}
                  className="w-full"
                >
                  Accéder à mon achat
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => navigate(`/purchases/invoice/${order.id}`)}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Voir la facture
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/workspace')}
                className="w-full"
              >
                Retour au dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PurchaseConfirmation;
