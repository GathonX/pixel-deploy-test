import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlatform } from '../contexts/PlatformContext';
import { 
  LayoutDashboard,
  FileCode,
  Settings,
  ArrowLeft,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../components/ui/button';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  embedded?: boolean;
}

const navItems = [
  { label: 'Dashboard', href: '/site-builder/admin', icon: LayoutDashboard },
  { label: 'Templates', href: '/site-builder/admin/templates', icon: FileCode },
  { label: 'Paramètres', href: '/site-builder/admin/settings', icon: Settings },
];

export default function AdminLayout({ children, title, breadcrumbs, embedded }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = usePlatform();

  // En mode embedded (intégré dans le layout admin principal), juste rendre le contenu
  if (embedded) {
    return <>{children}</>;
  }

  // Check if user is admin
  if (currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès non autorisé</h1>
          <p className="text-muted-foreground mb-6">
            Vous n'avez pas les permissions pour accéder à cette page.
          </p>
          <Button onClick={() => navigate('/site-builder')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/site-builder/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold">SiteBuilder</h1>
              <p className="text-xs text-muted-foreground">Administration</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/site-builder/admin' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to client */}
        <div className="p-4 border-t">
          <Link
            to="/site-builder"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour au site
          </Link>
        </div>

        {/* User info */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center px-6">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/site-builder/admin" className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
            {breadcrumbs?.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                {crumb.href ? (
                  <Link to={crumb.href} className="text-muted-foreground hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                )}
              </div>
            ))}
            {!breadcrumbs && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground font-medium">{title}</span>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
