import React from 'react';
import { Link } from 'react-router-dom';

const QuickActions = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Link to="/ecl-calculation" className="bg-white p-4 border border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex items-center">
          <div className="p-2 bg-gray-100">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-xs font-medium text-gray-900">ECL Calculation</h3>
            <p className="text-xs text-gray-500">Run new calculation</p>
          </div>
        </div>
      </Link>

      <Link to="/upload-cashflows" className="bg-white p-4 border border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex items-center">
          <div className="p-2 bg-gray-100">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-xs font-medium text-gray-900">Upload Cashflows</h3>
            <p className="text-xs text-gray-500">Import new data</p>
          </div>
        </div>
      </Link>

      <Link to="/reports" className="bg-white p-4 border border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex items-center">
          <div className="p-2 bg-gray-100">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-xs font-medium text-gray-900">View Reports</h3>
            <p className="text-xs text-gray-500">Generate reports</p>
          </div>
        </div>
      </Link>

      <Link to="/stage-reassignment" className="bg-white p-4 border border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex items-center">
          <div className="p-2 bg-gray-100">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-xs font-medium text-gray-900">Stage Reassignment</h3>
            <p className="text-xs text-gray-500">Update stages</p>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default QuickActions; 