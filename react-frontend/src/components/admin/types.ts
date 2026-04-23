// src/components/admin/types.ts

import { DefaultUser } from "@/data/defaultUsers";

/** 
 * Format renvoyé par GET /admin/users 
 */
export interface ApiUser {
  id: number;
  name: string;
  email: string;
  plan?: string;
  created_at: string;
  last_login?: string;
  status?: string;
  is_active?: boolean;
  is_admin: boolean;      // ← on récupère cette info du back
}

/**
 * Étend DefaultUser avec des champs calculés pour l’affichage.
 */
export interface DisplayUser extends DefaultUser {
  /** Date d’inscription formatée */
  registeredDate: string;
  /** Date de dernière connexion formatée */
  lastLogin: string;
  /** Statut ("Actif", "Inactif", "Suspendu", etc.) */
  status: string;
  /** Rôle ("Admin" ou "Utilisateur") */
  role: "Admin" | "Utilisateur";
}
