import React, { createContext, useContext, useState } from 'react';

interface DashboardContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTabState] = useState('home');

  const setActiveTab = React.useCallback((tab: string) => {
    setActiveTabState(tab);
  }, []);

  const value = React.useMemo(() => ({ activeTab, setActiveTab }), [activeTab, setActiveTab]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
