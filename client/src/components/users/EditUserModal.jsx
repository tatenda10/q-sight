import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import SuccessModal from '../shared/SuccessModal';
import ErrorModal from '../shared/ErrorModal';
import API_URL from '../../utils/Api';
import axios from 'axios';

const EditUserModal = ({ isOpen, onClose, user, onEdit }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role_ids: []
    });
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    // Load roles when modal opens
    useEffect(() => {
        if (isOpen && user) {
            fetchRoles();
        }
    }, [isOpen, user]);

    // Update form data when roles are loaded
    useEffect(() => {
        if (user && roles.length > 0) {
            const roleIds = roles
                .filter(role => user.roles.includes(role.role_name))
                .map(role => role.id);

            setFormData({
                username: user.username,
                password: '',
                role_ids: roleIds
            });
        }
    }, [user, roles]);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/roles`);
            if (response.data && response.data.roles) {
                setRoles(response.data.roles);
                setError('');
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('Error fetching roles:', err);
            setError('Failed to load roles');
            setRoles([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
    
        try {
            const response = await axios.put(`${API_URL}/users/${user.id}`, {
                username: formData.username,
                ...(formData.password && { password: formData.password }),
                roles: formData.role_ids
            });
    
            if (response.status !== 200) {
                throw new Error(response.data.message || 'Failed to update user');
            }
    
            onEdit(response.data.user);
            setShowSuccessModal(true);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error updating user';
            setError(errorMessage);
            setShowErrorModal(true);
        } finally {
            setSubmitting(false);
        }
    };
    

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRoleChange = (roleId) => {
        setFormData(prev => ({
            ...prev,
            role_ids: prev.role_ids.includes(roleId)
                ? prev.role_ids.filter(id => id !== roleId)
                : [...prev.role_ids, roleId]
        }));
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Edit User</h2>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">
                                New Password (optional)
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded"
                                placeholder="Leave blank to keep current password"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">
                                Roles
                            </label>
                            {loading ? (
                                <div className="flex justify-center p-4">
                                    <LoadingSpinner size="sm" />
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {roles.map(role => (
                                        <label key={role.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.role_ids.includes(role.id)}
                                                onChange={() => handleRoleChange(role.id)}
                                                className="rounded"
                                            />
                                            <span>{role.role_name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-4 text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 min-w-[80px]"
                            >
                                {submitting ? <LoadingSpinner size="sm" /> : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {showSuccessModal && (
                <SuccessModal
                    message="User updated successfully!"
                    onClose={() => {
                        setShowSuccessModal(false);
                        onClose();
                    }}
                />
            )}

            {showErrorModal && (
                <ErrorModal
                    message={error}
                    onClose={() => setShowErrorModal(false)}
                />
            )}
        </>
    );
};

export default EditUserModal;