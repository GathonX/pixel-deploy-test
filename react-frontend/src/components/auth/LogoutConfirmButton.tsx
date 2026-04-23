// src/components/auth/LogoutConfirmButton.tsx - VERSION UNIVERSELLE ET ACCESSIBLE

import React, { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '@/hooks/useLogout';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { LogOut } from 'lucide-react';

interface LogoutConfirmButtonProps {
  variant?: 'default' | 'ghost' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
  redirectTo?: string;
  onClose?: () => void;
  fullWidth?: boolean;
}

const LogoutConfirmButton = forwardRef<HTMLButtonElement, LogoutConfirmButtonProps>(({
  variant = 'ghost',
  size = 'default',
  className = '',
  showIcon = true,
  children,
  redirectTo = '/',
  onClose,
  fullWidth = false,
}, ref) => {
  const { logout, isLoading } = useLogout();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpenDialog = () => {
    setOpen(true);
    // Fermer le menu parent si présent
    if (onClose) {
      onClose();
    }
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  const handleConfirmLogout = async () => {
    await logout(() => {
      setOpen(false);
      navigate(redirectTo, { replace: true });
    });
  };

  return (
    <>
      <Button
        ref={ref}
        onClick={handleOpenDialog}
        variant={variant}
        size={size}
        className={`${fullWidth ? 'w-full justify-start' : ''} ${className}`}
        disabled={isLoading}
      >
        {showIcon && <LogOut className="h-4 w-4 mr-2" />}
        {children || 'Se déconnecter'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-500" />
              Confirmer la déconnexion
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à votre espace personnel.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex justify-end gap-2 mt-6">
            <Button
              onClick={handleCloseDialog}
              variant="outline"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmLogout}
              variant="destructive"
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Déconnexion...
                </div>
              ) : (
                'Oui, me déconnecter'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

LogoutConfirmButton.displayName = 'LogoutConfirmButton';

export default LogoutConfirmButton;