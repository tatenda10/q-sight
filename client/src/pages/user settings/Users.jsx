import React, { useState, useEffect } from 'react';
import UserTable from '../../components/users/UserTable';
import ViewUserModal from '../../components/users/ViewUserModal';
import AddUserModal from '../../components/users/AddUserModal';
import EditUserModal from '../../components/users/EditUserModal';
import axios from 'axios';
import API_URL from '../../utils/Api';
import { PlusIcon } from '@heroicons/react/24/outline';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/users?page=${page}&limit=${pagination.itemsPerPage}`);
      
      if (response.data) {
        setUsers(response.data.users || []);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination,
          currentPage: page
        }));
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const handleViewRoles = (user) => {
    setSelectedUser(user);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
        const response = await axios.put(`${API_URL}/users/${updatedUser.id}`, updatedUser);

        // Check if the response contains the expected data
        if (response.status === 200 && response.data && response.data.user) {
            setEditingUser(null);
            setEditModalOpen(false);
            fetchUsers(pagination.currentPage);
        } else {
            throw new Error('Unexpected response format');
        }
    } catch (err) {
        console.error('Error updating user:', err);
        setError(err.message || 'Error updating user');
    }
  };

  const handleToggleUserStatus = async (user) => {
    // Don't allow toggling sysadmin
    if (user.username === 'sysadmin') return;

    try {
      await axios.patch(`${API_URL}/users/${user.id}/toggle-status`);
      fetchUsers(pagination.currentPage);
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const handleAddUser = async (userData) => {
    try {
      await axios.post(`${API_URL}/users`, userData);
      setShowAddModal(false);
      fetchUsers(1); // Refresh the first page
    } catch (err) {
      console.error('Error adding user:', err);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUsers(newPage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-xs">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 mb-6">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-900">Users</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add User
          </button>
        </div>
      </div>
      
      <UserTable
        users={users}
        onViewRoles={handleViewRoles}
        onEditUser={handleEditUser}
        onToggleUserStatus={handleToggleUserStatus}
      />

      {/* Pagination Display */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {users.length > 0 ? ((pagination.currentPage - 1) * pagination.itemsPerPage) + 1 : 0}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalItems}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {selectedUser && (
        <ViewUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddUser}
        />
      )}

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onEdit={handleUpdateUser}
      />
    </div>
  );
};

export default Users;