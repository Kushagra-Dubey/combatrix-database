import React, { useState, useEffect } from 'react';
import { attendanceService } from '../../services/api';
import Loading from '../common/Loading';

const AttendanceHeatmap = ({ memberId = null }) => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHeatmap();
  }, [memberId]);

  const fetchHeatmap = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getHeatmap(memberId);
      setHeatmapData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getColorForStatus = (status, count) => {
    if (count === 0) return 'bg-gray-100';
    
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-400';
      case 'rejected':
        return 'bg-red-400';
      default:
        return 'bg-gray-100';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMonthLabel = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  // Group data by weeks
  const groupByWeeks = () => {
    const weeks = [];
    let currentWeek = [];
    
    heatmapData.forEach((day, index) => {
      currentWeek.push(day);
      
      const date = new Date(day.date);
      if (date.getDay() === 6 || index === heatmapData.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weeks;
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!heatmapData.length) return null;

  const weeks = groupByWeeks();
  const monthLabels = [];
  let lastMonth = '';
  
  heatmapData.forEach((day, index) => {
    const month = getMonthLabel(day.date);
    if (month !== lastMonth && index % 7 === 0) {
      monthLabels.push({ month, index: Math.floor(index / 7) });
      lastMonth = month;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Attendance Activity</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <span>Less</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-100 rounded"></div>
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <div className="w-3 h-3 bg-green-500 rounded"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-2">
            {monthLabels.map((label, idx) => (
              <div
                key={idx}
                className="text-xs text-gray-600"
                style={{ marginLeft: idx === 0 ? 0 : `${(label.index - (monthLabels[idx - 1]?.index || 0)) * 16}px` }}
              >
                {label.month}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex space-x-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col space-y-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded ${getColorForStatus(day.status, day.count)} 
                      hover:ring-2 hover:ring-blue-400 cursor-pointer transition-all`}
                    title={`${formatDate(day.date)}: ${day.status === 'confirmed' ? 'Present' : 
                      day.status === 'pending' ? 'Pending' : 
                      day.status === 'rejected' ? 'Rejected' : 'Absent'}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Day labels */}
          <div className="flex mt-2 text-xs text-gray-600">
            <div className="flex flex-col space-y-1 mr-2">
              <div className="h-3">Mon</div>
              <div className="h-3"></div>
              <div className="h-3">Wed</div>
              <div className="h-3"></div>
              <div className="h-3">Fri</div>
              <div className="h-3"></div>
              <div className="h-3"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-4 text-sm text-gray-600 pt-2 border-t">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-400 rounded"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-400 rounded"></div>
          <span>Rejected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-100 rounded"></div>
          <span>Absent</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHeatmap;