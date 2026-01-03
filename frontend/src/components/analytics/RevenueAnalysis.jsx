import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { membershipService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import Loading from '../common/Loading';

const RevenueAnalysis = () => {
  const [dateRange, setDateRange] = useState({
    start_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setDateRange(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (new Date(dateRange.end_date) < new Date(dateRange.start_date)) {
      setError('End date must be after start date');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await membershipService.revenueAnalysis(dateRange);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = {
    combatrix: '#3B82F6',
    fitshala: '#10B981',
    total: '#8B5CF6'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Revenue Analysis</h1>
        <p className="text-gray-500 mt-1">Analyze revenue and financial metrics</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Select Date Range</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={dateRange.start_date}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={dateRange.end_date}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {loading && <Loading />}

      {results && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">New Members</div>
              <div className="text-3xl font-bold text-blue-600">{results.stats.member_count || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(results.stats.total_revenue || 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Combatrix Share</div>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(results.stats.combatrix_revenue || 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Fitshala Share</div>
              <div className="text-3xl font-bold text-yellow-600">
                {formatCurrency(results.stats.fitshala_revenue || 0)}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Monthly Revenue Trend</h2>
              </div>
              <div className="p-6">
                {results.monthly_data && results.monthly_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={results.monthly_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(value) => format(new Date(value), 'MMM yyyy')}
                      />
                      <YAxis tickFormatter={(value) => `₹${value}`} />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(label) => format(new Date(label), 'MMMM yyyy')}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill={COLORS.total} name="Total Revenue" />
                      <Bar dataKey="combatrix" fill={COLORS.combatrix} name="Combatrix" />
                      <Bar dataKey="fitshala" fill={COLORS.fitshala} name="Fitshala" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No data available for the selected period
                  </div>
                )}
              </div>
            </div>

            {/* Revenue Distribution */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Revenue Distribution</h2>
              </div>
              <div className="p-6">
                {results.stats.total_revenue > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Combatrix', value: parseFloat(results.stats.combatrix_revenue || 0) },
                          { name: 'Fitshala', value: parseFloat(results.stats.fitshala_revenue || 0) }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill={COLORS.combatrix} />
                        <Cell fill={COLORS.fitshala} />
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No revenue data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Memberships Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Memberships in Selected Period
              </h2>
            </div>
            <div className="p-6">
              {results.memberships && results.memberships.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Combatrix
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fitshala
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.memberships.map((membership) => (
                        <tr key={membership.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {membership.member?.charAt(0).toUpperCase() || 'M'}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {membership.member || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {membership.member?.email || ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(membership.start_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(membership.end_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(membership.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(membership.combatrix_share)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(membership.fitshala_share)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              to={`/members/${membership.member_id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Member
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium">No memberships found</p>
                  <p className="text-sm mt-1">Try selecting a different date range</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueAnalysis;