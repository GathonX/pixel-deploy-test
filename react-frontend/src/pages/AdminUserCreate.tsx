// src/pages/AdminUserCreate.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Card, CardHeader, CardTitle,
  CardContent, CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Lock, EyeIcon, EyeOffIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import plain from '@/services/plain';
import type { AxiosError } from 'axios';

interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

const AdminUserCreate: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [password, setPwd]  = useState('');
  const [confirm, setConf]  = useState('');
  const [showPwd, setShow]  = useState(false);
  const [showConf, setShowC]= useState(false);
  const [loading, setLd]    = useState(false);
  const [errors, setErrs]   = useState<Partial<Record<keyof CreateUserPayload,string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLd(true);

    const { id, update, dismiss } = toast({
      title: 'Création',
      description: "Enregistrement en cours…",
      variant: 'info',
    });

    try {
      await plain.get('/sanctum/csrf-cookie');

      const payload: CreateUserPayload = {
        name: name.trim(),
        email,
        password,
        password_confirmation: confirm,
      };

      await api.post('/admin/users', payload);

      update({
        id,
        title: 'Utilisateur créé',
        description: `${payload.name} a bien été ajouté.`,
        variant: 'success',
      });

      // redirection vers dashboard admin
      setTimeout(() => {
        dismiss();
        navigate('/admin/dashboard', { replace: true });
      }, 1000);

    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{
        message?: string;
        errors?: Record<string,string[]>;
      }>;
      const resp = axiosErr.response;

      update({
        id,
        title: 'Erreur',
        description: resp?.data?.message ?? "Impossible de créer l'utilisateur.",
        variant: 'destructive',
      });

      const val = resp?.data?.errors || {};
      setErrs({
        name:              val.name?.[0],
        email:             val.email?.[0],
        password:          val.password?.[0],
        password_confirmation: val.password_confirmation?.[0],
      });

      setTimeout(() => dismiss(), 3000);
    } finally {
      setLd(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-lg mx-auto">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Ajouter un utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div className="space-y-1">
                <label className="block text-sm font-medium">Nom</label>
                <Input
                  placeholder="Nom complet"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1 relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Adresse email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>

              {/* Mot de passe */}
              <div className="space-y-1 relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={e => setPwd(e.target.value)}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3"
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
                {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              </div>

              {/* Confirmation */}
              <div className="space-y-1 relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type={showConf ? 'text' : 'password'}
                  placeholder="Confirmer mot de passe"
                  value={confirm}
                  onChange={e => setConf(e.target.value)}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowC(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3"
                >
                  {showConf ? <EyeOffIcon /> : <EyeIcon />}
                </button>
                {errors.password_confirmation && (
                  <p className="text-xs text-red-600">{errors.password_confirmation}</p>
                )}
              </div>

              <CardFooter className="pt-0">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Création…' : 'Créer'}
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUserCreate;
