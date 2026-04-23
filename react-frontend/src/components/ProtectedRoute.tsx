import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, AlertTriangle, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
  adminOnly?: boolean;  // only admins can access — non-admins redirected to /dashboard
  userOnly?: boolean;   // only non-admins can access — admins redirected to /admin/dashboard
}

interface EmailVerificationStatus {
  isVerified: boolean;
  email: string;
  verifiedAt: string | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireEmailVerification = true,
  adminOnly = false,
  userOnly = false,
}) => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();
  const [emailStatus, setEmailStatus] =
    useState<EmailVerificationStatus | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(true);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const checkEmailVerification = async () => {
      if (!user || !isAuthenticated) {
        setIsCheckingEmail(false);
        return;
      }

      try {
        console.log("🔍 [ProtectedRoute] Vérification statut email...");
        const response = await api.get("/user");
        const userData = response.data;

        setEmailStatus({
          isVerified: !!userData.email_verified_at,
          email: userData.email,
          verifiedAt: userData.email_verified_at,
        });

        console.log("✅ [ProtectedRoute] Statut email:", {
          verified: !!userData.email_verified_at,
          email: userData.email,
        });
      } catch (error: any) {
        console.error("❌ [ProtectedRoute] Erreur vérification email:", error);

        if (error.response?.status === 409) {
          setEmailStatus({
            isVerified: false,
            email: user.email,
            verifiedAt: null,
          });
        }
      } finally {
        setIsCheckingEmail(false);
      }
    };

    if (isAuthenticated && user) {
      checkEmailVerification();
    } else {
      setIsCheckingEmail(false);
    }
  }, [user, isAuthenticated]);

  const handleResendVerification = async () => {
    if (!user || isResending) return;

    setIsResending(true);

    try {
      console.log("📧 [ProtectedRoute] Renvoi email de vérification...");
      await api.post("/email/verification-notification");

      toast.success("✅ Email envoyé", {
        description: `Un nouveau lien de vérification a été envoyé à ${user.email}`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error("❌ [ProtectedRoute] Erreur renvoi email:", error);

      let errorMessage = "Erreur lors du renvoi de l'email.";

      if (error.response?.status === 429) {
        errorMessage =
          "Trop de tentatives. Veuillez patienter avant de réessayer.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast.error("❌ Erreur", {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.info("👋 Déconnexion", {
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error) {
      console.error("❌ Erreur déconnexion:", error);
    }
  };

  // Fonction de rendu sécurisé des enfants avec type explicite
  const renderSecureChildren = (
    childrenToRender: React.ReactNode
  ): React.ReactNode => {
    try {
      // Si c'est une fonction, vérification du type avant appel
      if (typeof childrenToRender === "function") {
        try {
          const result = (childrenToRender as () => React.ReactNode)();
          return React.isValidElement(result) ? result : null;
        } catch (error) {
          console.error(
            "❌ [ProtectedRoute] Erreur lors de l'appel de la fonction enfant:",
            error
          );
          return null;
        }
      }

      // Si c'est un élément React valide
      if (React.isValidElement(childrenToRender)) {
        return childrenToRender;
      }

      // Si c'est un tableau
      if (Array.isArray(childrenToRender)) {
        const validChildren = childrenToRender
          .filter(
            (child): child is React.ReactElement =>
              child !== null &&
              child !== undefined &&
              React.isValidElement(child)
          )
          .map((child, index) => {
            return React.cloneElement(child, {
              key: child.key || `secure-child-${index}`,
            });
          });

        return validChildren.length > 0 ? <>{validChildren}</> : null;
      }

      // Pour tout autre cas, retourner null
      return null;
    } catch (error) {
      console.error("❌ [ProtectedRoute] Erreur de rendu:", error);
      return null;
    }
  };

  if (loading || isCheckingEmail) {
    return (
      <div className="min-h-screen bg-gradient-landing flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
          <p className="text-text-secondary">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    console.log("🔒 [ProtectedRoute] Redirection login - Non authentifié");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control
  const isAdmin = user.role === 'admin';

  if (adminOnly && !isAdmin) {
    return <Navigate to="/workspace" replace />;
  }

  if (userOnly && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // ── Restriction membre : accès uniquement au site attribué ──
  // Un membre n'a aucun droit en dehors de son site, même s'il possède
  // son propre workspace par ailleurs. Les rôles ne s'interfèrent jamais.
  if (user.workspace_role === 'member' && user.workspace_site_id) {
    const allowedBase = `/dashboard/site/${user.workspace_site_id}`;
    if (!location.pathname.startsWith(allowedBase)) {
      return <Navigate to={allowedBase} replace />;
    }
  }

  if (requireEmailVerification && emailStatus && !emailStatus.isVerified) {
    console.log("📧 [ProtectedRoute] Blocage - Email non vérifié");

    return (
      <div className="min-h-screen bg-gradient-landing flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-lg shadow-premium border-0">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-text-primary">
              Vérification email requise
            </CardTitle>
            <CardDescription className="text-text-secondary">
              Vérifiez votre adresse email pour accéder à cette page
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-l-4 border-l-yellow-500 bg-yellow-50 text-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertDescription>
                <strong>Accès restreint :</strong> Vous devez vérifier votre
                adresse email
                <span className="font-mono bg-yellow-100 px-1 rounded">
                  {emailStatus.email}
                </span>
                pour accéder aux fonctionnalités de PixelRise.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h3 className="font-semibold text-text-primary">
                Comment procéder :
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-text-secondary">
                <li>Vérifiez votre boîte email (et dossier spam)</li>
                <li>Cliquez sur le lien de vérification reçu</li>
                <li>Revenez sur cette page après vérification</li>
              </ol>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full bg-brand-blue hover:bg-blue-700 text-white"
              >
                {isResending ? (
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Renvoyer l'email de vérification
                  </div>
                )}
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full border-slate-300 text-text-secondary hover:bg-slate-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Se déconnecter
              </Button>
            </div>

            <div className="text-center text-xs text-text-muted">
              Problème avec la vérification ?
              <a
                href={import.meta.env.VITE_LANDING_URL_CONTACT || "/contact"}
                className="text-brand-blue hover:underline ml-1"
              >
                Contactez le support
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rendu final avec le wrapper de sécurité
  console.log("✅ [ProtectedRoute] Accès autorisé");
  return <>{renderSecureChildren(children)}</>;
};

export default ProtectedRoute;
