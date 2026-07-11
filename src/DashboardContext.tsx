import React, { createContext, useContext, useState } from 'react';

interface DashboardContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTabState] = useState('home');

  const setActiveTab = React.useCallback((tab: string) => {
    // Transition (non-urgent) update: React keeps the CURRENT view painted
    // while the incoming tab's tree renders, then commits and the enter
    // animation plays immediately. Without this, the old view unmounts on
    // click and the new one sits at opacity 0 for its whole (expensive)
    // first render — perceived as a blank flash between tabs.
    React.startTransition(() => {
      setActiveTabState(tab);
    });
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
