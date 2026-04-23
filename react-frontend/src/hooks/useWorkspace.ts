import { useState, useEffect, useCallback } from 'react';
import { workspaceService, WorkspaceInfo } from '@/services/workspaceService';

interface UseWorkspaceReturn {
  workspace: WorkspaceInfo | null;
  isLoading: boolean;
  error: string | null;
  isSuspended: boolean;
  isTrialExpired: boolean;
  hasNoWorkspace: boolean;
  refresh: () => void;
}

export function useWorkspace(): UseWorkspaceReturn {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNoWorkspace, setHasNoWorkspace] = useState(false);

  const fetchWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setHasNoWorkspace(false);
      const data = await workspaceService.getWorkspace();
      setWorkspace(data);
    } catch (err: unknown) {
      const e = err as { response?: { status: number; data?: { reason_code?: string } } };
      if (e?.response?.status === 403 && e?.response?.data?.reason_code === 'NO_WORKSPACE') {
        setHasNoWorkspace(true);
      } else if (e?.response?.status !== 403) {
        setError('Impossible de charger les informations du workspace.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const isSuspended = workspace?.workspace_status === 'suspended'
    || workspace?.workspace_status === 'pending_deletion';

  const isTrialExpired = workspace?.subscription_status === 'expired'
    || (workspace?.workspace_status === 'trial_active'
      && !!workspace?.trial_ends_at
      && new Date(workspace.trial_ends_at) < new Date());

  return {
    workspace,
    isLoading,
    error,
    isSuspended,
    isTrialExpired,
    hasNoWorkspace,
    refresh: fetchWorkspace,
  };
}
