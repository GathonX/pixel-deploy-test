import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, UserCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface InvitationInfo {
  name: string;
  email: string;
  role: string;
  workspace_name: string;
  site_name: string | null;
  inviter_name: string;
  user_exists: boolean; // ✅ true = compte déjà existant → utiliser son mdp existant
}

export default function InvitationAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  const [info, setInfo]             = useState<InvitationInfo | null>(null);
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  // Valider le token au chargement
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_BASE}/invitation/accept/${token}`)
      .then(res => setInfo(res.data.data))
      .catch(err => {
        const msg = err?.response?.data?.message ?? 'Lien invalide ou expiré.';
        setTokenError(msg);
      })
      .finally(() => setValidating(false));
  }, [token]);

  const userExists = info?.user_exists ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (!userExists) {
      // Nouveau compte : validation classique
      if (password.length < 8) {
        setFieldError('Le mot de passe doit contenir au moins 8 caractères.');
        return;
      }
      if (password !== confirm) {
        setFieldError('Les mots de passe ne correspondent pas.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = userExists
        ? { password }                                      // compte existant : juste vérifier le mdp
        : { password, password_confirmation: confirm };    // nouveau compte : créer avec confirmation

      const res = await axios.post(`${API_BASE}/invitation/accept/${token}`, payload);

      const { token: authToken, redirect_to } = res.data;
      localStorage.setItem('auth_token', authToken);
      setSuccess(true);

      setTimeout(() => {
        navigate(redirect_to ?? '/workspace');
      }, 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFieldError(msg ?? 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Vérification du lien…</p>
        </div>
      </div>
    );
  }

  // ── Token invalide ──
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Lien invalide</h1>
          <p className="text-sm text-slate-500 mb-6">{tokenError}</p>
          <button onClick={() => navigate('/login')}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  // ── Succès ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Bienvenue !</h1>
          <p className="text-sm text-slate-500">
            {userExists ? 'Accès confirmé. Redirection en cours…' : 'Votre compte est prêt. Redirection en cours…'}
          </p>
        </div>
      </div>
    );
  }

  // ── Formulaire ──
  const roleLabel =
    info?.role === 'admin'  ? 'Administrateur' :
    info?.role === 'client' ? 'Client'          : 'Membre';

  const roleBadgeCls =
    info?.role === 'admin'  ? 'bg-purple-100 text-purple-700' :
    info?.role === 'client' ? 'bg-teal-100 text-teal-700'     : 'bg-blue-100 text-blue-700';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-7 text-center">
          <h1 className="text-xl font-bold text-white">🎉 Vous avez été invité !</h1>
          <p className="text-indigo-100 text-sm mt-1">PixelRise</p>
        </div>

        <div className="px-8 py-7">
          {/* Info invitation */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-sm space-y-2">
            <p className="text-slate-600">
              <span className="font-semibold text-slate-800">{info?.inviter_name}</span> vous invite à rejoindre
            </p>
            <p className="font-bold text-slate-900 text-base">{info?.workspace_name}</p>
            {info?.site_name && (
              <p className="text-xs text-blue-600">
                Site attribué : <span className="font-semibold">{info.site_name}</span>
              </p>
            )}
            <div className="border-t border-slate-200 pt-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-14 shrink-0">Rôle</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadgeCls}`}>{roleLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-14 shrink-0">Email</span>
                <span className="text-xs font-semibold text-slate-800 break-all">{info?.email}</span>
              </div>
            </div>
          </div>

          {/* Message selon user_exists */}
          {userExists ? (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Vous avez déjà un compte PixelRise avec cet email.
                Entrez votre <strong>mot de passe existant</strong> pour rejoindre cet espace de travail.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600 mb-5">
              Créez votre mot de passe pour accéder à votre espace.
            </p>
          )}

          {fieldError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{fieldError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {userExists ? 'Votre mot de passe PixelRise' : 'Mot de passe'}
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={userExists ? 'Votre mot de passe existant' : 'Minimum 8 caractères'}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmation de mot de passe uniquement pour les nouveaux comptes */}
            {!userExists && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirmer le mot de passe</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Répétez votre mot de passe"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password || (!userExists && !confirm)}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {userExists ? 'Vérification…' : 'Création du compte…'}
                </span>
              ) : (
                userExists ? 'Confirmer et rejoindre' : 'Créer mon compte et accéder'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
