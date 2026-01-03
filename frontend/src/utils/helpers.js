import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  } catch (error) {
    return dateString;
  }
};

// Format datetime
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'MMM dd, yyyy hh:mm a');
  } catch (error) {
    return dateString;
  }
};

// Check if membership is active
export const isMembershipActive = (endDate) => {
  if (!endDate) return false;
  try {
    return isAfter(parseISO(endDate), new Date());
  } catch (error) {
    return false;
  }
};

// Check if membership is expiring soon (within 15 days)
export const isExpiringSoon = (endDate) => {
  if (!endDate) return false;
  try {
    const end = parseISO(endDate);
    const fifteenDaysFromNow = addDays(new Date(), 15);
    return isAfter(end, new Date()) && isBefore(end, fifteenDaysFromNow);
  } catch (error) {
    return false;
  }
};

// Calculate membership duration in days
export const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end date
  } catch (error) {
    return 0;
  }
};

// Get status badge color
export const getStatusBadgeClass = (isActive) => {
  return isActive ? 'badge-success' : 'badge-danger';
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (Indian format)
export const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

// Calculate percentage
export const calculatePercentage = (part, total) => {
  if (!total || total === 0) return 0;
  return ((part / total) * 100).toFixed(1);
};

// Group data by month
export const groupByMonth = (data, dateField) => {
  const grouped = {};
  data.forEach(item => {
    const date = parseISO(item[dateField]);
    const monthYear = format(date, 'MMM yyyy');
    if (!grouped[monthYear]) {
      grouped[monthYear] = [];
    }
    grouped[monthYear].push(item);
  });
  return grouped;
};

// Export to CSV
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const cell = row[header];
      // Handle cells that contain commas or quotes
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};