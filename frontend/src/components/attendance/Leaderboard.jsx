import React, { useState, useEffect } from 'react';
import { leaderboardService } from '../../services/api';
import Loading from '../common/Loading';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await leaderboardService.getCurrentMonth();
      setLeaderboard(data);
      
      // Set current month display
      const now = new Date();
      setCurrentMonth(now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
            <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full">
            <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full">
            <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
            <span className="text-lg font-bold text-blue-600">#{rank}</span>
          </div>
        );
    }
  };

  if (loading) return <Loading fullScreen />;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🏆 Attendance Leaderboard
        </h1>
        <p className="text-xl text-gray-600">
          {currentMonth}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Resets at the start of each month
        </p>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center pt-12">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full text-center transform hover:scale-105 transition-transform">
              <div className="flex justify-center mb-3">
                {getMedalIcon(2)}
              </div>
              <div className="bg-gray-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                {leaderboard[1].member_name?.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-bold text-lg text-gray-900">{leaderboard[1].member_name}</h3>
              <p className="text-3xl font-bold text-gray-600 mt-2">{leaderboard[1].attendance_count}</p>
              <p className="text-sm text-gray-500">days</p>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-2xl p-6 w-full text-center transform hover:scale-105 transition-transform">
              <div className="flex justify-center mb-3">
                {getMedalIcon(1)}
              </div>
              <div className="bg-yellow-900 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                {leaderboard[0].member_name?.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-bold text-xl text-white">{leaderboard[0].member_name}</h3>
              <p className="text-4xl font-bold text-white mt-2">{leaderboard[0].attendance_count}</p>
              <p className="text-sm text-yellow-100">days</p>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center pt-12">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full text-center transform hover:scale-105 transition-transform">
              <div className="flex justify-center mb-3">
                {getMedalIcon(3)}
              </div>
              <div className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                {leaderboard[2].member_name?.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-bold text-lg text-gray-900">{leaderboard[2].member_name}</h3>
              <p className="text-3xl font-bold text-orange-600 mt-2">{leaderboard[2].attendance_count}</p>
              <p className="text-sm text-gray-500">days</p>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Full Rankings</h2>
        </div>
        <div className="p-6">
          {leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Attended
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-gray-50 ${
                        index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {entry.rank <= 3 ? (
                            <div className="transform scale-75">
                              {getMedalIcon(entry.rank)}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                              <span className="text-sm font-semibold text-gray-600">
                                #{entry.rank}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`}>
                            {entry.member_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {entry.member_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {entry.member_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-2xl font-bold ${
                          index === 0 ? 'text-yellow-600' :
                          index === 1 ? 'text-gray-600' :
                          index === 2 ? 'text-orange-600' :
                          'text-blue-600'
                        }`}>
                          {entry.attendance_count}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">days</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lg font-medium">No data for this month yet</p>
              <p className="text-sm mt-1">Start marking attendance to appear on the leaderboard!</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>How it works:</strong> The leaderboard ranks members by the number of confirmed attendance days in the current month. 
              Rankings reset automatically at the start of each month. Keep up your attendance to climb the ranks!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;