import api from './api';

export interface WorkspacePlanSummary {
  workspace_status: string;
  plan_key: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
  total_sites_count: number;
  published_sites_count: number;
  max_published_sites: number;
  ai_enabled: boolean;
  languages_per_site: number;
  can_publish: boolean;
}

export interface WorkspaceInfo {
  id: number;
  name: string;
  status: string;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  workspace_status: string;
  plan_key: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  total_sites_count: number;
  published_sites_count: number;
  max_published_sites: number;
  ai_enabled: boolean;
  languages_per_site: number;
  can_publish: boolean;
  // Livraison workspace
  is_delivered: boolean;
  delivered_at: string | null;
  delivered_to_user_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  // Rôle de l'utilisateur courant dans ce workspace
  current_user_role: 'owner' | 'admin' | 'member' | 'client';
}

export interface WorkspaceMember {
  id: number;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'client';
  joined_at: string | null;
  is_owner: boolean;
  is_client: boolean;
  has_data_pin: boolean;
}

export interface BillingInvoice {
  id: number;
  invoice_number: string;
  scope: 'workspace' | 'site';
  site_name: string | null;
  plan_key: string | null;
  billing_period: 'monthly' | 'yearly';
  amount_ariary: number;
  amount_eur: number | null;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void';
  payment_reference: string | null;
  payment_method: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export const workspaceService = {
  async getWorkspace(): Promise<WorkspaceInfo> {
    const res = await api.get('/workspace');
    return res.data.data;
  },

  async getPlanSummary(): Promise<WorkspacePlanSummary> {
    const res = await api.get('/workspace/plan');
    return res.data.data;
  },

  async canPublish(siteId: string): Promise<{ allowed: boolean; reason_code: string | null; message: string | null }> {
    const res = await api.get(`/workspace/can-publish/${siteId}`);
    return res.data;
  },

  async getInvoices(): Promise<BillingInvoice[]> {
    const res = await api.get('/workspace/billing/invoices');
    return res.data.data;
  },

  async createWorkspaceInvoice(planKey: string, billingPeriod: 'monthly' | 'yearly') {
    const res = await api.post('/workspace/billing/invoices/workspace', {
      plan_key: planKey,
      billing_period: billingPeriod,
    });
    return res.data;
  },

  async createSiteInvoice(siteId: string, planKey: string, billingPeriod: 'monthly' | 'yearly') {
    const res = await api.post('/workspace/billing/invoices/site', {
      site_id: siteId,
      plan_key: planKey,
      billing_period: billingPeriod,
    });
    return res.data;
  },

  async submitPaymentProof(invoiceId: number, paymentMethod: string, proofUrl?: string) {
    const res = await api.post(`/workspace/billing/invoices/${invoiceId}/payment-proof`, {
      payment_method: paymentMethod,
      payment_proof_url: proofUrl,
    });
    return res.data;
  },

  async getMembers(): Promise<WorkspaceMember[]> {
    const res = await api.get('/workspace/users');
    return res.data.data;
  },

  async inviteMember(email: string, role: 'admin' | 'member' = 'member'): Promise<WorkspaceMember> {
    const res = await api.post('/workspace/users/invite', { email, role });
    return res.data.data;
  },

  // Liste tous les workspaces possédés par l'utilisateur
  async getOwnerWorkspaces(): Promise<Array<{
    id: string;
    name: string;
    status: string;
    created_at: string;
    is_delivered: boolean;
    plan_key: string | null;
    sites_count: number;
  }>> {
    const res = await api.get('/workspace/all');
    return res.data.data;
  },

  // Nouveau système d'invitation par email (token + création compte)
  async sendInvitation(payload: {
    name: string;
    email: string;
    role: 'admin' | 'member' | 'client';
    site_id?: string | null;
    target_workspace_id?: string | null;
  }): Promise<{ id: number; email: string; name: string; expires_at: string }> {
    const res = await api.post('/workspace/invitations', payload);
    return res.data.data;
  },

  async getPendingInvitations(): Promise<Array<{
    id: number; name: string; email: string; role: string; site_name: string | null; expires_at: string;
  }>> {
    const res = await api.get('/workspace/invitations');
    return res.data.data;
  },

  async cancelInvitation(id: number): Promise<void> {
    await api.delete(`/workspace/invitations/${id}`);
  },

  async updateMemberRole(userId: number, role: 'admin' | 'member' | 'client'): Promise<void> {
    await api.put(`/workspace/users/${userId}/role`, { role });
  },

  async setClientPin(newPin: string, currentPin?: string): Promise<void> {
    await api.post('/workspace/users/set-pin', { new_pin: newPin, current_pin: currentPin });
  },

  async removeClientPin(currentPin: string): Promise<void> {
    await api.delete('/workspace/users/remove-pin', { data: { current_pin: currentPin } });
  },

  async removeMember(userId: number): Promise<void> {
    await api.delete(`/workspace/users/${userId}`);
  },

  // Livraison workspace (owner → client)
  async deliverWorkspace(): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/workspace/deliver');
    return res.data;
  },

  // Livraison d'un workspace spécifique depuis le dashboard (sans changer le contexte actif)
  async deliverWorkspaceById(workspaceId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/workspace/deliver', {}, {
      headers: { 'X-Workspace-Id': workspaceId },
    });
    return res.data;
  },

  // Renommer un workspace spécifique (sans changer le contexte actif)
  async renameWorkspace(workspaceId: string, name: string): Promise<void> {
    await api.put('/workspace', { name }, {
      headers: { 'X-Workspace-Id': workspaceId },
    });
  },

  // Supprimer un workspace spécifique (soft delete — 30 jours de grâce)
  async deleteWorkspace(workspaceId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete('/workspace', {
      headers: { 'X-Workspace-Id': workspaceId },
    });
    return res.data;
  },

  // Demande d'aide (client → owner original)
  async requestHelp(): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/workspace/request-help');
    return res.data;
  },

  formatAmountAriary(amount: number): string {
    return new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';
  },

  formatAmountEur(amount: number | null | undefined): string {
    if (amount == null) return '—';
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' €';
  },

  getPlanLabel(planKey: string | null): string {
    // Plans workspace : Gratuit (starter/free/null) ou Agence (premium)
    // "starter" ici = plan workspace gratuit, PAS le plan site Starter
    const labels: Record<string, string> = {
      starter:  'Gratuit',
      free:     'Gratuit',
      pro:      'Pro',
      premium:  'Agence',
    };
    return planKey ? (labels[planKey] ?? planKey) : 'Gratuit';
  },

  getPlanColor(planKey: string | null): string {
    const colors: Record<string, string> = {
      starter: 'bg-green-100 text-green-700',
      free:    'bg-green-100 text-green-700',
      pro:     'bg-blue-100 text-blue-700',
      premium: 'bg-purple-100 text-purple-700',
    };
    return planKey ? (colors[planKey] ?? 'bg-green-100 text-green-700') : 'bg-green-100 text-green-700';
  },
};
