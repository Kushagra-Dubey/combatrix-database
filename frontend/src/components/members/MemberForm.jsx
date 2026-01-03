import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { memberService } from '../../services/api';
import { format } from 'date-fns';

const MemberForm = () => {
  const { id } = useParams(); // If id exists, we're editing
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    date_joined: format(new Date(), 'yyyy-MM-dd'),
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      fetchMember();
    }
  }, [id]);

  const fetchMember = async () => {
    try {
      setLoading(true);
      const data = await memberService.getById(id);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone_number: data.phone_number || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_number: data.emergency_contact_number || '',
        date_joined: data.date_joined || format(new Date(), 'yyyy-MM-dd'),
      });
    } catch (err) {
      setSubmitError('Failed to load member data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone_number.replace(/\s+/g, ''))) {
      newErrors.phone_number = 'Invalid phone number (10 digits starting with 6-9)';
    }

    if (!formData.emergency_contact_name.trim()) {
      newErrors.emergency_contact_name = 'Emergency contact name is required';
    }

    if (!formData.emergency_contact_number.trim()) {
      newErrors.emergency_contact_number = 'Emergency contact number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.emergency_contact_number.replace(/\s+/g, ''))) {
      newErrors.emergency_contact_number = 'Invalid emergency contact number';
    }

    if (!formData.date_joined) {
      newErrors.date_joined = 'Date joined is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEditMode) {
        await memberService.update(id, formData);
      } else {
        await memberService.create(formData);
      }
      navigate('/members');
    } catch (err) {
      setSubmitError(
        err.response?.data?.detail || 
        err.response?.data?.message ||
        `Failed to ${isEditMode ? 'update' : 'create'} member`
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
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
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? 'Edit Member' : 'Add New Member'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isEditMode ? 'Update member information' : 'Enter member details to register'}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {submitError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Personal Information
            </h2>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Enter full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="email@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className={`input-field ${errors.phone_number ? 'border-red-500' : ''}`}
                  placeholder="9876543210"
                />
                {errors.phone_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="date_joined" className="block text-sm font-medium text-gray-700 mb-2">
                Date Joined *
              </label>
              <input
                type="date"
                id="date_joined"
                name="date_joined"
                value={formData.date_joined}
                onChange={handleChange}
                className={`input-field ${errors.date_joined ? 'border-red-500' : ''}`}
              />
              {errors.date_joined && (
                <p className="mt-1 text-sm text-red-600">{errors.date_joined}</p>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Emergency Contact
            </h2>

            <div>
              <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name *
              </label>
              <input
                type="text"
                id="emergency_contact_name"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                className={`input-field ${errors.emergency_contact_name ? 'border-red-500' : ''}`}
                placeholder="Emergency contact name"
              />
              {errors.emergency_contact_name && (
                <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="emergency_contact_number" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number *
              </label>
              <input
                type="tel"
                id="emergency_contact_number"
                name="emergency_contact_number"
                value={formData.emergency_contact_number}
                onChange={handleChange}
                className={`input-field ${errors.emergency_contact_number ? 'border-red-500' : ''}`}
                placeholder="9876543210"
              />
              {errors.emergency_contact_number && (
                <p className="mt-1 text-sm text-red-600">{errors.emergency_contact_number}</p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/members')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Member' : 'Create Member'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberForm;