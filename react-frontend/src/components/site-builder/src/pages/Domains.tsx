import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlatform } from '../contexts/PlatformContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '../components/ui/dialog';
import {
  ArrowLeft, Globe, Plus, CheckCircle2, AlertCircle, Clock,
  Copy, RefreshCw, Trash2, ExternalLink, Shield, Link, Loader2, ShoppingCart, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { verifyDomain, deleteSiteDomain } from '../services/siteBuilderService';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const SERVER_IP = '194.163.134.150';

const slugify = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function Domains() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sites, isLoading, addCustomDomain } = usePlatform();

  const site = sites.find((s: any) => s.id === siteId);
  const domains = (site?.domains || []).filter((d: any) => d && d.id);

  const [newDomain, setNewDomain] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, { ok: boolean; message: string; expected?: string; found?: string | null }>>({});

  // Poll automatique si des domaines sont en attente
  useEffect(() => {
    const hasPending = domains.some((d: any) => ['pending', 'dns_verified'].includes(d.status));
    if (!hasPending) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    }, 15000);
    return () => clearInterval(interval);
  }, [domains, queryClient]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) { toast.error('Veuillez entrer un nom de domaine'); return; }
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain.trim())) { toast.error('Nom de domaine invalide'); return; }
    setIsAddingDomain(true);
    try {
      await addCustomDomain(siteId!, newDomain.trim());
      setNewDomain('');
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Domaine ajouté !', { description: 'Configurez vos DNS puis cliquez sur "Vérifier DNS".' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de l\'ajout');
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    setVerifyingId(domainId);
    // Clear previous result while checking
    setVerifyResults(prev => { const n = { ...prev }; delete n[domainId]; return n; });
    try {
      await verifyDomain(siteId!, domainId);
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setVerifyResults(prev => ({ ...prev, [domainId]: { ok: true, message: 'DNS vérifié ! SSL en cours de génération.' } }));
      toast.success('DNS vérifié !');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erreur de vérification';
      const dns = err?.response?.data?.dns_check;
      setVerifyResults(prev => ({
        ...prev,
        [domainId]: { ok: false, message: msg, expected: dns?.expected, found: dns?.found },
      }));
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteTarget(null);
    try {
      await deleteSiteDomain(siteId!, deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Domaine supprimé');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copié !'); };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':       return <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Actif</Badge>;
      case 'dns_verified': return <Badge className="bg-blue-500 text-white"><Loader2 className="w-3 h-3 mr-1 animate-spin" />SSL en cours…</Badge>;
      case 'pending':      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente DNS</Badge>;
      case 'error':        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erreur</Badge>;
      default:             return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Site introuvable</h1>
          <Button onClick={() => navigate('/site-builder')}>Retour au dashboard</Button>
        </div>
      </div>
    );
  }

  const customDomains = domains.filter((d: any) => d.type === 'custom');
  const internalUrl = site
    ? `${window.location.origin}/site-builder/preview/${(site as any).userId}/${slugify((site as any).template?.name || 'template')}/${slugify(site.name)}/${(site as any).previewToken}`
    : null;

  return (
    <>
      <div className="h-14 border-b bg-card flex items-center px-6 gap-4 sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/site-builder/editor/${siteId}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />Retour à l'éditeur
        </Button>
        <div className="h-6 w-px bg-border" />
        <Globe className="w-5 h-5 text-primary" />
        <h1 className="font-semibold">{site.name} — Domaines</h1>
      </div>

      <div className="bg-muted/30">
        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">

          {/* Lien de prévisualisation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Link className="w-5 h-5" />Lien de prévisualisation</CardTitle>
                  <CardDescription>Accédez à votre site via le lien interne ou votre domaine personnalisé.</CardDescription>
                </div>
                {site.status === 'published' && <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />En ligne</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lien interne — toujours disponible */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lien interne</p>
                {internalUrl && site.status === 'published' ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-mono text-xs text-primary truncate">{internalUrl}</span>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button size="sm" variant="ghost" onClick={() => window.open(internalUrl, '_blank')} title="Visiter">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copy(internalUrl)} title="Copier">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Publiez votre site pour obtenir un lien de prévisualisation.</p>
                )}
              </div>

              {/* Domaines personnalisés configurés */}
              {customDomains.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Domaines personnalisés</p>
                  <div className="space-y-2">
                    {customDomains.map((domain: any) => (
                      <div
                        key={domain.id}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-lg",
                          domain.status === 'active'
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                            : 'bg-muted/30'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className={cn("w-4 h-4 shrink-0", domain.status === 'active' ? 'text-green-600' : 'text-muted-foreground')} />
                          <span className={cn("font-mono text-xs truncate", domain.status === 'active' ? 'text-green-700 dark:text-green-400' : '')}>
                            {domain.status === 'active' ? `https://${domain.domain}` : domain.domain}
                          </span>
                          {getStatusBadge(domain.status)}
                        </div>
                        {domain.status === 'active' && (
                          <div className="flex gap-1 shrink-0 ml-2">
                            <Button size="sm" variant="ghost" onClick={() => window.open(`https://${domain.domain}`, '_blank')} title="Visiter">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => copy(`https://${domain.domain}`)} title="Copier">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CTA achat domaine — affiché si aucun domaine custom actif */}
          {customDomains.filter((d: any) => ['active', 'dns_verified', 'pending'].includes(d.status)).length === 0 && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">Donnez une adresse professionnelle à votre site</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Remplacez le lien de prévisualisation par <strong>monhotel.com</strong> — SSL inclus, configuration automatique.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button onClick={() => navigate('/studio-domaine/search')}>
                      <ShoppingCart className="w-4 h-4 mr-2" />Acheter un domaine
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                      <Globe className="w-4 h-4 mr-2" />J'ai déjà un domaine
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Domaines personnalisés */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Domaines personnalisés</CardTitle>
                  <CardDescription>Connectez votre propre domaine avec SSL automatique.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" />Ajouter un domaine</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un domaine personnalisé</DialogTitle>
                      <DialogDescription>Entrez votre domaine puis configurez les DNS chez votre hébergeur.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                      <Label>Nom de domaine</Label>
                      <Input
                        placeholder="monsite.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                      />
                      <p className="text-xs text-muted-foreground">Entrez le domaine sans "www" (ex: monsite.com)</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                      <Button onClick={handleAddDomain} disabled={isAddingDomain}>
                        {isAddingDomain ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ajout...</> : 'Ajouter'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {customDomains.length === 0 ? (
                <div className="text-center py-10 space-y-4">
                  <Globe className="w-12 h-12 mx-auto text-muted-foreground/40" />
                  <div>
                    <p className="font-medium text-muted-foreground">Aucun domaine personnalisé configuré</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Achetez un domaine ou connectez celui que vous possédez déjà.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" onClick={() => navigate('/studio-domaine/search')}>
                      <ShoppingCart className="w-4 h-4 mr-2" />Acheter un domaine
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />Connecter mon domaine
                    </Button>
                  </div>
                </div>
              ) : (
                customDomains.map((domain: any) => (
                  <div key={domain.id} className="border rounded-lg overflow-hidden">
                    {/* Header domaine */}
                    <div className="flex items-center justify-between p-4 bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                        <span className="font-mono font-semibold">{domain.domain}</span>
                        {getStatusBadge(domain.status)}
                      </div>
                      <div className="flex gap-2">
                        {domain.status === 'active' && (
                          <Button variant="outline" size="sm" onClick={() => window.open(`https://${domain.domain}`, '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" />Visiter
                          </Button>
                        )}
                        {domain.status !== 'active' && domain.status !== 'dns_verified' && (
                          <Button variant="outline" size="sm" onClick={() => handleVerify(domain.id)} disabled={verifyingId === domain.id}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${verifyingId === domain.id ? 'animate-spin' : ''}`} />
                            Vérifier DNS
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: domain.id, name: domain.domain })}
                          disabled={deletingId === domain.id}
                        >
                          {deletingId === domain.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Instructions DNS */}
                    {domain.status !== 'active' && (
                      <div className="p-4 space-y-3">
                        <Alert>
                          <AlertCircle className="w-4 h-4" />
                          <AlertTitle>Configurez ces enregistrements DNS chez votre hébergeur</AlertTitle>
                          <AlertDescription>Hostinger, OVH, o2switch, GoDaddy, Namecheap…</AlertDescription>
                        </Alert>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left p-3 font-medium">Type</th>
                                <th className="text-left p-3 font-medium">Nom</th>
                                <th className="text-left p-3 font-medium">Valeur</th>
                                <th className="p-3 w-10"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { type: 'A',     name: '@',   value: SERVER_IP },
                                { type: 'CNAME', name: 'www', value: 'app.pixel-rise.com' },
                                { type: 'TXT',   name: '@',   value: `pixelrise_verify=${domain.id.slice(0, 12)}` },
                              ].map((r, i) => (
                                <tr key={i} className="border-t">
                                  <td className="p-3"><Badge variant="outline">{r.type}</Badge></td>
                                  <td className="p-3 font-mono text-xs">{r.name}</td>
                                  <td className="p-3 font-mono text-xs">{r.value}</td>
                                  <td className="p-3">
                                    <Button variant="ghost" size="icon" onClick={() => copy(r.value)}><Copy className="w-4 h-4" /></Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Résultat de la dernière vérification */}
                        {verifyResults[domain.id] && (
                          verifyResults[domain.id].ok ? (
                            <Alert className="bg-green-50 border-green-200">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <AlertTitle className="text-green-800">DNS vérifié</AlertTitle>
                              <AlertDescription className="text-green-700">{verifyResults[domain.id].message}</AlertDescription>
                            </Alert>
                          ) : (
                            <Alert variant="destructive">
                              <AlertCircle className="w-4 h-4" />
                              <AlertTitle>Problème de configuration DNS</AlertTitle>
                              <AlertDescription className="space-y-1">
                                <p>{verifyResults[domain.id].message}</p>
                                {verifyResults[domain.id].expected && (
                                  <div className="mt-2 text-xs font-mono bg-red-950/10 rounded p-2 space-y-1">
                                    <p>Attendu&nbsp;: <span className="font-semibold">{verifyResults[domain.id].expected}</span></p>
                                    <p>Trouvé&nbsp;&nbsp;: <span className="font-semibold">{verifyResults[domain.id].found ?? 'aucun enregistrement A'}</span></p>
                                  </div>
                                )}
                                <p className="mt-2 text-xs opacity-80">Vérifiez chez votre hébergeur DNS que l'enregistrement A pointe vers {SERVER_IP}, puis patientez quelques minutes pour la propagation et réessayez.</p>
                              </AlertDescription>
                            </Alert>
                          )
                        )}
                        {domain.status === 'error' && !verifyResults[domain.id] && (
                          <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>Erreur de provisioning SSL</AlertTitle>
                            <AlertDescription>
                              Vérifiez que l'enregistrement A pointe vers {SERVER_IP} puis relancez la vérification.
                            </AlertDescription>
                          </Alert>
                        )}
                        {domain.status === 'dns_verified' && (
                          <Alert className="bg-blue-50 border-blue-200">
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            <AlertTitle className="text-blue-800">DNS vérifié — SSL en cours de provisioning</AlertTitle>
                            <AlertDescription className="text-blue-700">
                              Le certificat SSL est en cours de génération. Votre site sera actif dans quelques minutes.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {domain.status === 'active' && (
                      <div className="p-4">
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <AlertTitle className="text-green-800">Domaine actif avec SSL</AlertTitle>
                          <AlertDescription className="text-green-700">
                            Accessible sur https://{domain.domain}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Guide */}
          <Card>
            <CardHeader><CardTitle>Comment ça marche</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { n: 1, title: 'Ajoutez votre domaine', desc: 'Cliquez "Ajouter un domaine" et entrez votre domaine (ex: monsite.com, sans www).' },
                { n: 2, title: 'Configurez vos DNS', desc: `Chez votre hébergeur, ajoutez : A @ ${SERVER_IP} et CNAME www app.pixel-rise.com` },
                { n: 3, title: 'Vérifiez', desc: 'Cliquez "Vérifier DNS". La propagation peut prendre jusqu\'à 48h.' },
                { n: 4, title: 'SSL automatique', desc: 'Une fois le DNS détecté, le certificat SSL est généré automatiquement en quelques minutes.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">{n}</div>
                  <div><h4 className="font-medium">{title}</h4><p className="text-sm text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de confirmation suppression */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce domaine ?</DialogTitle>
            <DialogDescription>
              Le domaine <span className="font-mono font-semibold">{deleteTarget?.name}</span> sera supprimé définitivement.
              Votre site ne sera plus accessible via ce domaine.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
