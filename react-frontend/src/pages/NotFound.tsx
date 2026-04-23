import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
        {/* Glowing 404 number */}
        <div className="relative mb-6 select-none">
          <span className="text-[10rem] leading-none font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary/70 to-primary/30 drop-shadow-sm">
            404
          </span>
          <div className="absolute inset-0 text-[10rem] leading-none font-extrabold text-primary/10 blur-2xl select-none">
            404
          </div>
        </div>

        {/* Icon */}
        <div className="mb-5 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Search className="w-7 h-7 text-primary" />
        </div>

        {/* Text */}
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Page introuvable
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <p className="font-mono text-xs text-muted-foreground/60 bg-muted px-3 py-1.5 rounded-lg mb-8 max-w-xs truncate">
          {location.pathname}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Button>
        </div>

        {/* Footer hint */}
        <p className="mt-10 text-xs text-muted-foreground/50">
          Si vous pensez qu'il s'agit d'une erreur, contactez le support.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
