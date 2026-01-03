import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { memberService, membershipService } from '../../services/api';
import { format } from 'date-fns';

const MembershipForm = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    member: memberId || '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    price: '',
    combatrix_share: '',
    fitshala_share: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!memberId) {
      fetchMembers();
    } else {
      fetchMemberDetail(memberId);
    }
  }, [memberId]);

  const fetchMembers = async () => {
    try {
      const data = await memberService.getAll();
      setMembers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchMemberDetail = async (id) => {
    try {
      const data = await memberService.getById(id);
      setSelectedMember(data);
      setFormData(prev => ({ ...prev, member: id }));
    } catch (err) {
      console.error('Error fetching member:', err);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.member) {
      newErrors.member = 'Please select a member';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    } else if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    if (!formData.combatrix_share || formData.combatrix_share < 0) {
      newErrors.combatrix_share = 'Please enter a valid amount';
    }

    if (!formData.fitshala_share || formData.fitshala_share < 0) {
      newErrors.fitshala_share = 'Please enter a valid amount';
    }

    const totalShares = parseFloat(formData.combatrix_share || 0) + parseFloat(formData.fitshala_share || 0);
    const price = parseFloat(formData.price || 0);
    if (Math.abs(totalShares - price) > 0.01) {
      newErrors.shares = 'Combatrix and Fitshala shares must sum to the total price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-calculate shares when price changes
    if (name === 'price' && value) {
      const price = parseFloat(value);
      const fitshala = (price / 5).toFixed(2);
      const combatrix = (price - fitshala).toFixed(2);
      setFormData(prev => ({
        ...prev,
        fitshala_share: fitshala,
        combatrix_share: combatrix
      }));
    }

    // Update combatrix share when fitshala changes
    if (name === 'fitshala_share' && formData.price) {
      const fitshala = parseFloat(value || 0);
      const price = parseFloat(formData.price);
      const combatrix = (price - fitshala).toFixed(2);
      setFormData(prev => ({ ...prev, combatrix_share: combatrix }));
    }

    // Update fitshala share when combatrix changes
    if (name === 'combatrix_share' && formData.price) {
      const combatrix = parseFloat(value || 0);
      const price = parseFloat(formData.price);
      const fitshala = (price - combatrix).toFixed(2);
      setFormData(prev => ({ ...prev, fitshala_share: fitshala }));
    }

    // Clear errors
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
      await membershipService.create(formData);
      navigate(memberId ? `/members/${memberId}` : '/members');
    } catch (err) {
      setSubmitError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 flex items-center mb-2"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {selectedMember ? `Add Membership for ${selectedMember.name}` : 'Add New Membership'}
        </h1>
        <p className="text-gray-500 mt-1">Enter membership details</p>
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

          {errors.shares && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">{errors.shares}</p>
                </div>
              </div>
            </div>
          )}

          {/* Member Selection */}
          {!memberId && (
            <div>
              <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-2">
                Select Member *
              </label>
              <select
                id="member"
                name="member"
                value={formData.member}
                onChange={handleChange}
                className={`input-field ${errors.member ? 'border-red-500' : ''}`}
              >
                <option value="">Choose a member...</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.email}
                  </option>
                ))}
              </select>
              {errors.member && (
                <p className="mt-1 text-sm text-red-600">{errors.member}</p>
              )}
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={`input-field ${errors.start_date ? 'border-red-500' : ''}`}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
              )}
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={`input-field ${errors.end_date ? 'border-red-500' : ''}`}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              Total Price (₹) *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className={`input-field ${errors.price ? 'border-red-500' : ''}`}
              placeholder="Enter total price"
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Shares will be calculated automatically (80% Combatrix, 20% Fitshala)
            </p>
          </div>

          {/* Revenue Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="combatrix_share" className="block text-sm font-medium text-gray-700 mb-2">
                Combatrix Share (₹) *
              </label>
              <input
                type="number"
                id="combatrix_share"
                name="combatrix_share"
                value={formData.combatrix_share}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`input-field ${errors.combatrix_share ? 'border-red-500' : ''}`}
                placeholder="Combatrix share"
              />
              {errors.combatrix_share && (
                <p className="mt-1 text-sm text-red-600">{errors.combatrix_share}</p>
              )}
            </div>

            <div>
              <label htmlFor="fitshala_share" className="block text-sm font-medium text-gray-700 mb-2">
                Fitshala Share (₹) *
              </label>
              <input
                type="number"
                id="fitshala_share"
                name="fitshala_share"
                value={formData.fitshala_share}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`input-field ${errors.fitshala_share ? 'border-red-500' : ''}`}
                placeholder="Fitshala share"
              />
              {errors.fitshala_share && (
                <p className="mt-1 text-sm text-red-600">{errors.fitshala_share}</p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
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
                  Creating...
                </>
              ) : (
                'Create Membership'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MembershipForm;