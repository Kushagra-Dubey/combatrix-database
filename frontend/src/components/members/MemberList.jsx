import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { memberService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DataTable from '../common/DataTable';
import Loading from '../common/Loading';

const MemberList = () => {
  const [statistics, setStatistics] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMembers();
  }, [statusFilter]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const data = await memberService.getAll(params);
      setStatistics(data?.results?.statistics)
      setMembers(Array.isArray(data) ? data : data.results.members || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone_number',
      label: 'Phone',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <span className={`badge ${row.is_active ? 'badge-success' : 'badge-danger'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'membership_end_date',
      label: 'Membership End',
      sortable: true,
      render: (row) => (
        <span className={row.membership_end_date && new Date(row.membership_end_date) < new Date() ? 'text-red-600' : ''}>
          {row.membership_end_date ? formatDate(row.membership_end_date) : 'N/A'}
        </span>
      ),
    },
    {
      key: 'total_revenue',
      label: 'Total Revenue',
      sortable: true,
      accessor: (row) => formatCurrency(row.total_revenue || 0),
    },
    {
      key: 'date_joined',
      label: 'Joined',
      sortable: true,
      accessor: (row) => formatDate(row.date_joined),
    },
  ];

  if (loading) return <Loading fullScreen />;
  
  if (error) return (
    <div className="text-center py-12">
      <div className="text-red-600 text-lg">{error}</div>
      <button onClick={fetchMembers} className="btn-primary mt-4">
        Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 mt-1">Manage all gym members</p>
        </div>
        <Link to="/members/new" className="btn-primary">
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Member
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{statistics?.total_members || 0}</div>
          <div className="text-sm text-gray-500">Total Members</div>
          {console.log("statusi", statistics)}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {statistics?.active_members}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-red-600">
            {statistics?.inactive_members}
          </div>
          <div className="text-sm text-gray-500">Inactive</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(members.reduce((sum, m) => sum + (m.total_revenue || 0), 0))}
          </div>
          <div className="text-sm text-gray-500">Total Revenue</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field py-2 text-sm"
            >
              <option value="all">All Members</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <button
            onClick={fetchMembers}
            className="btn-secondary text-sm py-2"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={members}
            onRowClick={(member) => navigate(`/members/${member.id}`)}
            searchable
            searchPlaceholder="Search members by name, email, or phone..."
            emptyMessage="No members found. Add your first member to get started!"
            actions={(row) => (
              <div className="flex justify-end space-x-2">
                <Link
                  to={`/members/${row.id}`}
                  className="text-blue-600 hover:text-blue-900 font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  View
                </Link>
                <Link
                  to={`/memberships/new/${row.id}`}
                  className="text-green-600 hover:text-green-900 font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Add Membership
                </Link>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default MemberList;