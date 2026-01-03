import React, { useState, useEffect } from 'react';
import { data, Link } from 'react-router-dom';
import { memberService } from '../../services/api';
import { formatCurrency, formatDate, isExpiringSoon } from '../../utils/helpers';
import StatCard from '../common/StatCard';
import Loading from '../common/Loading';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await memberService.getDashboardStats();
      setStats(data);
      console.log('stats - ', data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (loading) return <Loading fullScreen />;
  if (error) return (
    <div className="text-center py-12">
      <div className="text-red-600 text-lg">{error}</div>
    </div>
  );
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's your gym overview.</p>
        </div>
        <Link to="/members/new" className="btn-primary">
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Member
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Members"
          value={stats.total_members}
          subtitle="All registered members"
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          color="blue"
        />
        <StatCard
          title="Active Members"
          value={stats.active_members}
          subtitle="Currently active"
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="green"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.total_revenue)}
          subtitle="All time"
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          color="indigo"
        />
        <StatCard
          title="Combatrix Share"
          value={formatCurrency(stats.combatrix_revenue)}
          subtitle={`Fitshala: ${formatCurrency(stats.fitshala_revenue)}`}
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          color="purple"
        />
      </div>
      {console.log("stats", stats)}
      {/* Expiring Memberships */}
      {stats.expiring_soon && stats.expiring_soon.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900">Memberships Expiring Soon</h2>
            </div>
            <span className="badge badge-warning">{stats.expiring_soon.length} Members</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.expiring_soon.map((membership) => {
                  const daysLeft = Math.ceil((new Date(membership.end_date) - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={membership.member_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {membership.member_name.charAt(0).toUpperCase()}
                          </div>
                          <div className='ml-4'>
                          {membership.member}</div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{membership.member_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(membership.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          daysLeft <= 5 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {daysLeft} days
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Link
                          to={`/members/${membership.member_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </Link>
                        <Link
                          to={`/memberships/new/${membership.member_id}`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Renew
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/members"
          className="card hover:border-blue-500 border-2 border-transparent transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">View All Members</h3>
              <p className="text-sm text-gray-500">Manage member profiles</p>
            </div>
          </div>
        </Link>

        <Link
          to="/memberships/new"
          className="card hover:border-green-500 border-2 border-transparent transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">New Membership</h3>
              <p className="text-sm text-gray-500">Add a membership</p>
            </div>
          </div>
        </Link>

        <Link
          to="/revenue"
          className="card hover:border-purple-500 border-2 border-transparent transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Revenue Analysis</h3>
              <p className="text-sm text-gray-500">View financial reports</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;