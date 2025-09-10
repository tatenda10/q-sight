import React from 'react';
import { format } from 'date-fns';
import { XMarkIcon } from '@heroicons/react/24/outline';

const ViewUserModal = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                  User Details
                </h3>
                <button
                  onClick={onClose}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Username</h4>
                  <p className="mt-1 text-sm text-gray-900">{user.username}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <p className="mt-1">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Created At</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {format(new Date(user.created_at), 'PPpp')}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Last Login</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {user.last_login 
                      ? format(new Date(user.last_login), 'PPpp')
                      : 'Never'
                    }
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Roles</h4>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {user.roles.map((role, index) => (
                      <span
                        key={index}
                        className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewUserModal; 