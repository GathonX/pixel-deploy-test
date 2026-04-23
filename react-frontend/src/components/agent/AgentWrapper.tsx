import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import UniversalAgentWrapper from './UniversalAgentWrapper';

interface AgentWrapperProps {
  children: React.ReactNode;
}

const AgentWrapper: React.FC<AgentWrapperProps> = ({ children }) => {
  const { user } = useAuth();

  // Si pas d'utilisateur connecté, on retourne juste les enfants sans l'agent
  if (!user) {
    return <>{children}</>;
  }

  // Si utilisateur connecté, on wrap avec l'agent intelligent
  return (
    <UniversalAgentWrapper userId={user.id.toString()}>
      {children}
    </UniversalAgentWrapper>
  );
};

export default AgentWrapper;