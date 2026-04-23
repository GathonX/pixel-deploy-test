import { useEffect } from 'react';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { AxiosError } from 'axios';

export function useAuthRefresh() {
    const { toast } = useToast();

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                await api.get('/user');
                console.log('✅ Session encore active');
            } catch (error) {
                const err = error as AxiosError;
                const status = err.response?.status;

                if (status === 401 || status === 419) {
                    console.warn('⚠️ Session expirée ou invalide', error);
                    toast({
                        title: 'Session expirée',
                        description: 'Veuillez vous reconnecter.',
                        variant: 'destructive',
                    });
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                } else {
                    console.error('Erreur lors de la vérification de la session', error);
                }
            }
        }, 10 * 60 * 1000); // 10 minutes

        return () => clearInterval(interval);
    }, [toast]);
}