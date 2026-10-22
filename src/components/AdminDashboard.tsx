import { apiFetch } from '../api';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Coins,
  TrendingUp,
  AlertTriangle,
  Search,
  Plus,
  Minus,
  CheckCircle,
  Ban,
  FileText,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

interface AdminDashboardProps {
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ notify }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');

  // Selected user for adjustments
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAdjustment, setCreditAdjustment] = useState<number>(100);

  const fetchAdminData = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      setLoading(true);
      const [statsRes, usersRes, reportsRes] = await Promise.all([
        apiFetch('/api/admin/stats', { headers: {} }),
        apiFetch('/api/admin/users', { headers: {} }),
        apiFetch('/api/admin/reports', { headers: {} })
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const reportsData = await reportsRes.json();

      setStats(statsData);
      if (usersData.users) setUsers(usersData.users);
      if (reportsData.reports) setReports(reportsData.reports);
    } catch (e) {
      notify('error', 'Failed to fetch admin telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="py-24 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Administrator privileges are required to view this control center. Switch to Roshan
          Hatwar (Admin) in the top bar to inspect this dashboard.
        </p>
      </div>
    );
  }

  const handleAdjustCredits = async (amount: number) => {
    if (!selectedUser) return;
    try {
      const res = await apiFetch(`/api/admin/users/${selectedUser.uid}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, reason: 'Admin Adjustment' })
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', `Adjusted credits for ${selectedUser.displayName} to ${data.balance}`);
        setUsers(prev => prev.map(u => (u.uid === selectedUser.uid ? data.user : u)));
        setSelectedUser(data.user);
        fetchAdminData();
      }
    } catch (e) {
      notify('error', 'Failed to adjust credits');
    }
  };

  const handleChangePlan = async (newPlan: 'free' | 'creator' | 'pro') => {
    if (!selectedUser) return;
    try {
      const res = await apiFetch(`/api/admin/users/${selectedUser.uid}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: newPlan })
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', `Changed plan to ${newPlan.toUpperCase()}`);
        setUsers(prev => prev.map(u => (u.uid === selectedUser.uid ? data.user : u)));
        setSelectedUser(data.user);
        fetchAdminData();
      }
    } catch (e) {
      notify('error', 'Failed to change plan');
    }
  };

  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    try {
      const nextSuspended = !selectedUser.suspended;
      const res = await apiFetch(`/api/admin/users/${selectedUser.uid}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suspended: nextSuspended })
      });
      const data = await res.json();
      if (res.ok) {
        notify('success', `User ${nextSuspended ? 'suspended' : 're-activated'}`);
        setUsers(prev => prev.map(u => (u.uid === selectedUser.uid ? data.user : u)));
        setSelectedUser(data.user);
      }
    } catch (e) {
      notify('error', 'Failed to toggle suspension');
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      const res = await apiFetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        notify('success', `Report marked as ${status}`);
        fetchAdminData();
      }
    } catch (e) {
      notify('error', 'Failed to resolve report');
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C202C] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-purple-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Admin Control Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Platform telemetry, user account management, and content moderation queue
          </p>
        </div>

        <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold self-start sm:self-auto flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>Cluster Live: Asia-East1 (Cloud Run)</span>
        </div>
      </div>

      {/* Stats Cards Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#10131C] border border-[#1F2536]">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Total Creators</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white font-display">{stats.totalUsers}</div>
            <div className="text-[11px] text-gray-500 mt-1">
              {stats.paidUsers} active subscribers
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#10131C] border border-[#1F2536]">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Total Generations</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white font-display">
              {stats.totalGenerations}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {stats.failedGenerations} refunded failures
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#10131C] border border-[#1F2536]">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Credits Consumed</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-display">
              {stats.creditsConsumed}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">{stats.creditsSold} credits sold</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#10131C] border border-[#1F2536]">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Platform Revenue</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-display">
              ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Razorpay Verified Settlements</div>
          </div>
        </div>
      )}

      {/* User Management Section */}
      <div className="rounded-3xl p-6 bg-[#10131C] border border-[#1F2536] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white font-display">Creator Accounts</h2>
            <p className="text-xs text-gray-400">Search users, grant credits, or adjust plan tiers</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              placeholder="Filter by email or name..."
              className="pl-9 pr-4 py-1.5 bg-[#0B0D14] text-xs text-white rounded-xl border border-[#1F2536] focus:outline-none focus:border-purple-500 w-64"
            />
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2536] text-gray-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181C26]">
              {filteredUsers.map(u => (
                <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${u.uid}`}
                        alt={u.displayName}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold text-white">{u.displayName}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="uppercase font-bold px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300">
                      {u.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">{u.credits}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'admin'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.suspended ? (
                      <span className="text-rose-400 font-bold">Suspended</span>
                    ) : (
                      <span className="text-emerald-400">Active</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 font-semibold"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Moderation Queue */}
      <div className="rounded-3xl p-6 bg-[#10131C] border border-[#1F2536] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white font-display">Reported Content Queue</h2>
            <p className="text-xs text-gray-400">Community flags awaiting safety determination</p>
          </div>
          <span className="text-xs text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            {reports.filter(r => r.status === 'pending').length} Pending
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No content reports currently submitted.
          </div>
        ) : (
          <div className="space-y-2.5">
            {reports.map((rep: any) => (
              <div
                key={rep.reportId}
                className="p-4 rounded-xl bg-[#0B0D14] border border-[#1F2536] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-rose-300 mb-0.5">
                    Flagged Reason: "{rep.reason}"
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Gen ID: {rep.generationId} • Reported at {new Date(rep.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 px-2 py-0.5 bg-white/5 rounded">
                    {rep.status}
                  </span>
                  {rep.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleResolveReport(rep.reportId, 'resolved')}
                        className="px-3 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50"
                      >
                        Enforce Policy
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.reportId, 'dismissed')}
                        className="px-3 py-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Management Drawer Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="max-w-md w-full bg-[#10131C] border border-[#23293D] rounded-3xl p-6 shadow-2xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-display">
                Manage {selectedUser.displayName}
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Quick Credit Adjust */}
            <div className="p-4 rounded-2xl bg-[#0B0D14] border border-[#1F2536] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Current Balance:</span>
                <span className="font-bold text-amber-400 font-mono">{selectedUser.credits} cr</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={creditAdjustment}
                  onChange={e => setCreditAdjustment(parseInt(e.target.value) || 0)}
                  className="w-24 bg-[#141722] text-white text-xs rounded-xl p-2 border border-[#262C3E]"
                />
                <button
                  onClick={() => handleAdjustCredits(creditAdjustment)}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Add +{creditAdjustment}
                </button>
                <button
                  onClick={() => handleAdjustCredits(-creditAdjustment)}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Deduct -{creditAdjustment}
                </button>
              </div>
            </div>

            {/* Change Plan */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-400 block">Change Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {(['free', 'creator', 'pro'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => handleChangePlan(p)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase border ${
                      selectedUser.plan === p
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-[#0B0D14] border-[#1F2536] text-gray-400'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Suspend Toggle */}
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={handleToggleSuspend}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                  selectedUser.suspended
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {selectedUser.suspended ? 'Re-activate Account' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
