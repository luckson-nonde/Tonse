import React, { useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../services/api/database';
import { useLiveQuery } from '../hooks/useLiveQuery';
import {
  History,
  Search,
  Filter,
  Calendar,
  FileText,
  QrCode,
  CheckCircle2,
  User,
  ArrowUpRight,
  TrendingUp,
  PackageCheck,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PERMISSIONS, hasPermission } from '../utils/rbac';

export default function AuditTrailPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const providerId = user?.role === 'PROVIDER_STAFF' ? user.parentProviderId : user?.id;

  const logs =
    useLiveQuery(async () => {
      if (!providerId) return [];

      let query = db.auditLogs.where('providerId').equals(providerId);

      // If staff, only show their own logs
      if (user?.role === 'PROVIDER_STAFF') {
        return await db.auditLogs.where('staffId').equals(user.id!).reverse().sortBy('timestamp');
      }

      return await query.reverse().sortBy('timestamp');
    }, [providerId, user]) || [];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.targetTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actionType.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;

      const now = Date.now();
      const logDate = log.timestamp;
      const oneDay = 24 * 60 * 60 * 1000;

      if (dateFilter === 'today') return now - logDate < oneDay;
      if (dateFilter === 'week') return now - logDate < oneDay * 7;
      if (dateFilter === 'month') return now - logDate < oneDay * 30;

      return true;
    });
  }, [logs, searchTerm, dateFilter]);

  const stats = useMemo(() => {
    return {
      totalQuotes: filteredLogs.filter((l) => l.actionType === 'QUOTE_SENT').length,
      totalCollections: filteredLogs.filter((l) => l.actionType === 'COLLECTION_STARTED').length,
      totalHandovers: filteredLogs.filter((l) => l.actionType === 'HANDOVER_COMPLETED').length,
    };
  }, [filteredLogs]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'QUOTE_SENT':
        return <MessageSquare className="w-4 h-4" />;
      case 'COLLECTION_STARTED':
        return <QrCode className="w-4 h-4" />;
      case 'HANDOVER_COMPLETED':
        return <PackageCheck className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'QUOTE_SENT':
        return 'text-blue-600 bg-blue-50';
      case 'COLLECTION_STARTED':
        return 'text-amber-600 bg-amber-50';
      case 'HANDOVER_COMPLETED':
        return 'text-emerald-600 bg-emerald-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 font-serif">Audit Trail</h1>
        <p className="text-sm text-slate-500">
          {user?.role === 'PROVIDER_STAFF'
            ? 'Chronological record of your professional activities.'
            : 'Complete visibility into team performance and shop operations.'}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-slate-900">{stats.totalQuotes}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Quotes
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <QrCode className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-slate-900">{stats.totalCollections}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Started
          </div>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <PackageCheck className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-slate-900">{stats.totalHandovers}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Handovers
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-4xl border border-slate-100 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by buyer, item or staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-none p-4 pl-11 rounded-2xl text-sm focus:ring-2 focus:ring-[#C9973A] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'today', 'week', 'month'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                dateFilter === f
                  ? 'bg-[#C9973A] text-white shadow-md shadow-[#C9973A]/20'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredLogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-4xl p-12 text-center border border-slate-100"
            >
              <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium italic">
                No activities found matching your filters.
              </p>
            </motion.div>
          ) : (
            filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex items-start gap-4 hover:border-[#C9973A]/30 transition-colors group"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getActionColor(log.actionType)}`}
                >
                  {getActionIcon(log.actionType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[#C9973A] uppercase tracking-widest mb-0.5">
                        {log.actionType.replace('_', ' ')}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-[#C9973A] transition-colors">
                        {log.targetTitle}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-300 font-medium">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-2">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600">{log.buyerName}</span>
                    </div>

                    {user?.role !== 'PROVIDER_STAFF' && (
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg">
                        <ShieldCheck className="w-3 h-3 text-[#C9973A]" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                          Staff: {log.staffName}
                        </span>
                      </div>
                    )}

                    {log.amount !== undefined &&
                      (hasPermission(user, PERMISSIONS.VIEW_ANALYTICS) ||
                        hasPermission(user, PERMISSIONS.MANAGE_QUOTES)) && (
                        <div className="flex items-center gap-1 text-[11px] font-black text-emerald-600">
                          <TrendingUp className="w-3 h-3" />
                          ZMW {log.amount.toLocaleString()}
                        </div>
                      )}
                  </div>

                  {log.details && (
                    <p className="mt-2 text-[11px] text-slate-400 italic leading-relaxed border-l-2 border-slate-100 pl-2">
                      {log.details}
                    </p>
                  )}
                </div>

                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-4 h-4 text-slate-300" />
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
