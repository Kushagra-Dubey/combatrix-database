import React, { useState, useEffect } from 'react';
import { attendanceService, memberService } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import Loading from '../common/Loading';

const AdminAttendance = () => {
  const [pendingAttendance, setPendingAttendance] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingData, membersData] = await Promise.all([
        attendanceService.getPending(),
        memberService.getAll()
      ]);
      
      setPendingAttendance(pendingData);
      setMembers(Array.isArray(membersData) ? membersData : membersData.results?.members || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id) => {
    try {
      setProcessing(true);
      setError(null);
      
      await attendanceService.confirm(id);
      setSuccessMessage('Attendance confirmed successfully!');
      
      // Refresh pending list
      await fetchData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id, reason = '') => {
    try {
      setProcessing(true);
      setError(null);
      
      await attendanceService.reject(id, reason);
      setSuccessMessage('Attendance rejected!');
      
      // Refresh pending list
      await fetchData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) {
      setError('Please select attendance records to confirm');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      
      const result = await attendanceService.bulkConfirm(selectedIds);
      setSuccessMessage(`${result.confirmed} attendance records confirmed!`);
      setSelectedIds([]);
      
      // Refresh pending list
      await fetchData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedMember) {
      setError('Please select a member');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setSuccessMessage('');
      
      await attendanceService.create({
        member: parseInt(selectedMember),
        date: selectedDate,
        status: 'confirmed'
      });
      
      setSuccessMessage('Attendance marked successfully!');
      setSelectedMember('');
      
      // Refresh pending list
      await fetchData();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingAttendance.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingAttendance.map(a => a.id));
    }
  };

  if (loading) return <Loading fullScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
        <p className="text-gray-500 mt-1">Review and manage member attendance</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Quick Mark Attendance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mark Attendance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Member
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="input-field"
            >
              <option value="">Choose a member...</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleMarkAttendance}
              disabled={processing || !selectedMember}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Marking...' : 'Mark Attendance'}
            </button>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pending Requests</h2>
            <p className="text-sm text-gray-500 mt-1">
              {pendingAttendance.length} request{pendingAttendance.length !== 1 ? 's' : ''} waiting for approval
            </p>
          </div>
          
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkConfirm}
              disabled={processing}
              className="btn-success disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Confirm Selected ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="p-6">
          {pendingAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === pendingAttendance.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in Time</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingAttendance.map((attendance) => (
                    <tr key={attendance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(attendance.id)}
                          onChange={() => toggleSelection(attendance.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {attendance.member_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{attendance.member_name}</div>
                            <div className="text-sm text-gray-500">{attendance.member_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(attendance.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(attendance.check_in_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleConfirm(attendance.id)}
                          disabled={processing}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleReject(attendance.id)}
                          disabled={processing}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">No pending requests</p>
              <p className="text-sm mt-1">All attendance has been reviewed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAttendance;