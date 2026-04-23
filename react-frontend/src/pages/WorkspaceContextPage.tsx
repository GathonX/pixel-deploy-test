// src/pages/WorkspaceContextPage.tsx
// Renders the full workspace dashboard for a specific workspace by ID.
// URL: /workspace/:workspaceId

import { useParams } from 'react-router-dom';
import { getActiveWorkspaceId, setActiveWorkspaceId } from '@/services/api';
import WorkspaceDashboard from './WorkspaceDashboard';

export default function WorkspaceContextPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  if (workspaceId && getActiveWorkspaceId() !== workspaceId) {
    // Switch active workspace and reload the page so all hooks/queries
    // pick up the new workspace context via X-Workspace-Id header.
    setActiveWorkspaceId(workspaceId);
    window.location.reload();
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <WorkspaceDashboard />;
}
