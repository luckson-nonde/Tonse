import React from 'react';
import TeamManagement from '../../pages/TeamManagement';

interface ProviderTeamViewProps {
  user: any;
}

export default function ProviderTeamView({ user }: ProviderTeamViewProps) {
  return <TeamManagement />;
}
