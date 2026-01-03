import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { memberService } from '../../services/api';
import { formatCurrency, formatDate, isMembershipActive } from '../../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Loading from '../common/Loading';

const MemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMemberDetail();
  }, [id]);

  const fetchMemberDetail = async () => {
    try {
      setLoading(true);
      const data = await memberService.getById(id);
      setMember(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen />;
  
  if (error) return (
    <div className="text-center py-12">
      <div className="text-red-600 text-lg mb-4">{error}</div>
      <button onClick={() => navigate('/members')} className="btn-secondary">
        Back to Members
      </button>
    </div>
  );

  if (!member) return null;

  const revenueData = [
    { name: 'Combatrix', value: parseFloat(member.combatrix_total_share || 0), color: '#3B82F6' },
    { name: 'Fitshala', value: parseFloat(member.fitshala_total_share || 0), color: '#10B981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/members')}
            className="text-blue-600 hover:text-blue-800 flex items-center mb-2"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Members
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{member.name}</h1>
          <p className="text-gray-500 mt-1">Member Details</p>
        </div>
        <div className="flex space-x-3">
          <Link to={`/memberships/new/${member.id}`} className="btn-success">
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Membership
          </Link>
        </div>
      </div>

      {/* Member Status Badge */}
      <div className="bg-white rounded-lg shadow p-4">
        <span className={`badge ${member.is_active ? 'badge-success' : 'badge-danger'} text-lg px-4 py-2`}>
          {member.is_active ? '✓ Active Member' : '✗ Inactive Member'}
        </span>
      </div>

      {/* Personal Info & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="font-medium text-gray-600">Name:</span>
              <span className="text-gray-900">{member.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="font-medium text-gray-600">Email:</span>
              <span className="text-gray-900">{member.email}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="font-medium text-gray-600">Phone:</span>
              <span className="text-gray-900">{member.phone_number}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="font-medium text-gray-600">Emergency Contact:</span>
              <span className="text-gray-900">
                {member.emergency_contact_name}
                <br />
                <span className="text-sm text-gray-500">{member.emergency_contact_number}</span>
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="font-medium text-gray-600">Date Joined:</span>
              <span className="text-gray-900">{formatDate(member.date_joined)}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="font-medium text-gray-600">Status:</span>
              <span className={`badge ${member.is_active ? 'badge-success' : 'badge-danger'}`}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Revenue Summary</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(member.total_revenue || 0)}
                </div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(member.combatrix_total_share || 0)}
                </div>
                <div className="text-sm text-gray-500">Combatrix Share</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(member.fitshala_total_share || 0)}
                </div>
                <div className="text-sm text-gray-500">Fitshala Share</div>
              </div>
            </div>

            {revenueData[0].value > 0 || revenueData[1].value > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={revenueData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No revenue data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Membership History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Membership History</h2>
        </div>
        <div className="p-6">
          {member.memberships && member.memberships.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Combatrix Share</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fitshala Share</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {member.memberships.map((membership) => (
                    <tr key={membership.id} className="hover:bg-gray-50">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isMembershipActive(membership.end_date) ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Expired</span>
                        )}
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
              <p className="text-lg font-medium">No membership records found</p>
              <p className="text-sm mt-1">Add a membership to get started</p>
              <Link
                to={`/memberships/new/${member.id}`}
                className="btn-primary mt-4 inline-flex"
              >
                Add Membership
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDetail;