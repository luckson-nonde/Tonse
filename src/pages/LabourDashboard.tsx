import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import DynamicAccountRenderer from '../components/DynamicAccountRenderer';
import { MASTER_LABOUR_ACCOUNT_SCHEMA } from '../services/labourAccountSchema';
import DashboardLayout from '../components/DashboardLayout';

export default function LabourDashboard() {
  const { user, updateUser } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  
  console.log('LABOUR USER:', JSON.stringify(user?.labourSubTypes));
  console.log('LABOUR CATEGORY:', user?.labourCategory);

  // Fetch data
  const jobRequests = useLiveQuery(
    () => db.inquiries
      .filter(i =>
        i.isLabour === true &&
        !i.archivedBy?.includes(user?.id?.toString() || '') &&
        (user?.labourSubTypes?.some(st => st === i.labourSubType) ?? true)
      )
      .reverse()
      .toArray(),
    [user?.id, user?.labourSubTypes]
  ) || [];

  const quotes = useLiveQuery(
    () => db.quotes
      .where('providerId').equals(user?.id || '')
      .reverse()
      .toArray(),
    [user?.id]
  ) || [];

  const schedules = useLiveQuery(
    () => db.schedules
      .where('providerId').equals(user?.id || '')
      .reverse()
      .toArray(),
    [user?.id]
  ) || [];

  // Virtual account balance
  const availableBalance = user?.virtualAccountBalance || 0;

  const handleAction = async (actionId: string, payload?: any) => {
    switch (actionId) {
      case 'navigate':
        setActiveView(payload);
        break;
      case 'toggle_availability':
        if (user) {
          await updateUser({
            ...user,
            availabilityStatus: payload.isAvailable ? 'AVAILABLE' : 'NOT_AVAILABLE'
          });
        }
        break;
      case 'send_proposal':
        if (user && payload) {
          const newQuote = {
            id: Date.now().toString(),
            inquiryId: payload.jobId,
            providerId: user.id,
            providerName: user.name,
            totalAmount: Number(payload.proposal.rate),
            message: payload.proposal.message,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            type: 'LABOUR',
            availabilityDate: payload.proposal.availabilityDate
          };
          await db.quotes.add(newQuote as any);
          setActiveView('my_quotes');
        }
        break;
      case 'view_job':
        // Could open a modal or navigate to a details view
        console.log('View job', payload);
        break;
      case 'view_quote':
        // Could open a modal or navigate to a details view
        console.log('View quote', payload);
        break;
      case 'view_schedule':
        // Could open a modal or navigate to a details view
        console.log('View schedule', payload);
        break;
      case 'save_profile':
        if (user) {
          await updateUser({ ...user, ...payload });
          alert('Profile updated successfully!');
        }
        break;
    }
  };

  const viewData = {
    homeProps: {
      user,
      jobRequests,
      quotes,
      schedules,
      availableBalance,
      onAction: handleAction
    },
    jobsProps: {
      jobRequests,
      onAction: handleAction
    },
    quotesProps: {
      quotes,
      onAction: handleAction
    },
    scheduleProps: {
      schedules,
      onAction: handleAction
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveView(tab);
  };

  return (
    <DashboardLayout onTabChange={handleTabChange} externalActiveTab={activeView}>
      <DynamicAccountRenderer
        schema={MASTER_LABOUR_ACCOUNT_SCHEMA}
        view={activeView}
        onNavigate={setActiveView}
        onAction={handleAction}
        user={user}
        data={viewData}
      />
    </DashboardLayout>
  );
}
