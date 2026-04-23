// src/pages/AdminUserEdit.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Card, CardHeader, CardTitle,
  CardContent, CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail, Lock, EyeIcon, EyeOffIcon, ArrowLeft, Save, ExternalLink, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import plain from '@/services/plain';
import type { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: number;
  name: string;
  email: string;
  website?: string;
  is_admin: boolean;
  plan?: string;
  email_verified_at: string | null;
  created_at: string;
  last_login?: string;
}

interface UpdateUserPayload {
  name: string;
  email: string;
  website?: string;
  password?: string;
  password_confirmation?: string;
  is_admin: boolean;
  plan: string;
}

const AdminUserEdit: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const { user: currentUser, refreshUser } = useAuth();

  // États pour les données utilisateur
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [plan, setPlan] = useState('Standard');
  
  // États pour l'interface
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof UpdateUserPayload, string>>>({});

  // Charger les données de l'utilisateur
  useEffect(() => {
    const loadUser = async () => {
      if (!userId) {
        navigate('/admin/users');
        return;
      }

      try {
        setLoadingUser(true);
        const response = await api.get<{ data: User }>(`/admin/users/${userId}`);
        const userData = response.data.data;
        
        setUser(userData);
        setName(userData.name);
        setEmail(userData.email);
        setWebsite(userData.website || '');
        setIsAdmin(userData.is_admin);
        setPlan(userData.plan || 'Standard');
      } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données de l\'utilisateur.',
          variant: 'destructive',
        });
        navigate('/admin/users');
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [userId, navigate, toast]);

  // Fonction pour s'assurer que l'URL a un protocole
  const ensureUrlProtocol = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation côté client pour le mot de passe seulement si un mot de passe est saisi
    if (password.trim().length > 0) {
      if (password !== confirmPassword) {
        setErrors({ password_confirmation: 'Les mots de passe ne correspondent pas.' });
        return;
      }
    }

    // Effacer les erreurs de validation précédentes
    setErrors({});

    setLoading(true);

    const { id, update, dismiss } = toast({
      title: 'Modification',
      description: "Mise à jour en cours…",
      variant: 'default',
    });

    try {
      await plain.get('/sanctum/csrf-cookie');

      const payload: UpdateUserPayload = {
        name: name.trim(),
        email: email.trim(),
        website: website.trim() ? ensureUrlProtocol(website.trim()) : undefined,
        is_admin: isAdmin,
        plan,
      };

      // Ajouter le mot de passe seulement s'il est renseigné
      if (password.trim().length > 0) {
        payload.password = password;
        payload.password_confirmation = confirmPassword;
      }

      await api.put(`/admin/users/${user.id}`, payload);

      // Mettre à jour l'affichage avec l'URL normalisée
      if (payload.website) {
        setWebsite(payload.website);
      }

      // ✅ SYNCHRONISATION : Si on modifie l'utilisateur connecté, déclencher la synchronisation
      if (currentUser && currentUser.id === user.id) {
        console.log('🔄 Synchronisation: Mise à jour de l\'utilisateur connecté...');
        
        // Émettre immédiatement l'événement avec les nouvelles données
        const updatedUserData = {
          ...currentUser,
          name: payload.name,
          email: payload.email,
          website: payload.website,
          is_admin: payload.is_admin,
          plan: payload.plan
        };
        
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: updatedUserData
        }));
        
        // Puis rafraîchir depuis le serveur
        setTimeout(() => refreshUser(), 500);
      }

      update({
        id,
        title: 'Utilisateur modifié',
        description: `${payload.name} a bien été mis à jour.`,
        variant: 'default',
      });

      // Redirection vers la liste des utilisateurs
      setTimeout(() => {
        dismiss();
        navigate('/admin/users', { replace: true });
      }, 1000);

    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{
        message?: string;
        errors?: Record<string, string[]>;
      }>;
      const resp = axiosErr.response;

      update({
        id,
        title: 'Erreur',
        description: resp?.data?.message ?? "Impossible de modifier l'utilisateur.",
        variant: 'destructive',
      });

      const validationErrors = resp?.data?.errors || {};
      setErrors({
        name: validationErrors.name?.[0],
        email: validationErrors.email?.[0],
        password: validationErrors.password?.[0],
        password_confirmation: validationErrors.password_confirmation?.[0],
      });

      setTimeout(() => dismiss(), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loadingUser) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-lg mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Chargement des données utilisateur...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-lg mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p>Utilisateur non trouvé</p>
                <Button 
                  onClick={() => navigate('/admin/users')}
                  className="mt-4"
                >
                  Retour à la liste
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-lg mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/users')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Modifier l'utilisateur</CardTitle>
            <p className="text-sm text-muted-foreground">
              Utilisateur créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  placeholder="Nom complet"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Adresse email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>

              {/* Site Web */}
              <div className="space-y-2">
                <Label htmlFor="website">Site Web du client</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="website"
                      type="text"
                      placeholder="exemple.com ou https://exemple.com"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {website && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(ensureUrlProtocol(website), '_blank')}
                      className="px-3"
                      title="Voir le site web"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  URL du site web créé pour ce client (géré par l'admin). 
                  Vous pouvez modifier uniquement ce champ sans toucher aux autres.
                </p>
                {errors.website && <p className="text-xs text-red-600">{errors.website}</p>}
              </div>

              {/* Rôle */}
              <div className="space-y-2">
                <Label>Rôle</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="admin-role"
                    checked={isAdmin}
                    onCheckedChange={setIsAdmin}
                  />
                  <Label htmlFor="admin-role" className="text-sm">
                    {isAdmin ? 'Administrateur' : 'Utilisateur standard'}
                  </Label>
                </div>
              </div>

              {/* Plan */}
              <div className="space-y-2">
                <Label htmlFor="plan">Plan d'abonnement</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Premium">Entreprise</SelectItem>
                    <SelectItem value="Pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mot de passe (optionnel) */}
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe (optionnel)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Laisser vide pour conserver l'actuel"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3"
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                {password.trim().length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPassword('');
                      setConfirmPassword('');
                      setErrors(prev => ({ ...prev, password: undefined, password_confirmation: undefined }));
                    }}
                    className="text-xs"
                  >
                    ✕ Effacer les mots de passe
                  </Button>
                )}
                
                {/* Bouton de test de synchronisation */}
                {currentUser && currentUser.id === user?.id && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      console.log('🧪 Test synchronisation forcée...');
                      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                        detail: {
                          ...currentUser,
                          website: website || user?.website
                        }
                      }));
                    }}
                    className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100"
                  >
                    🔄 Test Sync
                  </Button>
                )}
              </div>

              {/* Confirmation mot de passe */}
              {password.trim().length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirmer le nouveau mot de passe"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-3"
                    >
                      {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password_confirmation && (
                    <p className="text-xs text-red-600">{errors.password_confirmation}</p>
                  )}
                </div>
              )}

              {/* Informations supplémentaires */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Informations du compte</p>
                <p className="text-xs text-muted-foreground">
                  Email vérifié : {user.email_verified_at ? 'Oui' : 'Non'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Dernière connexion : {user.last_login ? new Date(user.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
                </p>
              </div>

              <CardFooter className="pt-6 px-0">
                <div className="flex gap-2 w-full">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/admin/users')}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUserEdit;