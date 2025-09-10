import React, { useState } from 'react';
import ECLAnalsyisReport from '../../components/reports/ECLAnalsyisReport';
import LossAllowanceReport from '../../components/reports/LossAllowanceReport';
import IFRS735G from '../../components/reports/IFRS735G';
import PDComparisonReport from '../../components/reports/PDComparisonReport';

function Reports() {
  const [selectedSection, setSelectedSection] = useState('ecl');

  return (
    <div className="p-4">
      <div className="flex space-x-1 border-b border-gray-300 mb-4">
        <button
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            selectedSection === 'ecl' 
              ? 'border-b-2 border-gray-600 text-gray-900 bg-gray-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setSelectedSection('ecl')}
        >
          ECL Analysis Report
        </button>
        <button
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            selectedSection === 'loss' 
              ? 'border-b-2 border-gray-600 text-gray-900 bg-gray-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setSelectedSection('loss')}
        >
          Loss Allowance Report (IFRS 7)
        </button>
        <button
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            selectedSection === 'ifrs735g' 
              ? 'border-b-2 border-gray-600 text-gray-900 bg-gray-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setSelectedSection('ifrs735g')}
        >
          IFRS 7.35G Report
        </button>
        <button
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            selectedSection === 'pd-comparison' 
              ? 'border-b-2 border-gray-600 text-gray-900 bg-gray-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setSelectedSection('pd-comparison')}
        >
          PD Comparison Report
        </button>
      </div>

      <div>
        {selectedSection === 'ecl' && (
          <div className="bg-white p-4">
            <ECLAnalsyisReport/>
          </div>
        )}
        {selectedSection === 'loss' && (
          <div className="bg-white">
            <LossAllowanceReport/>
          </div>
        )}
        {selectedSection === 'ifrs735g' && (
          <div className="bg-white">
            <IFRS735G/>
          </div>
        )}
        {selectedSection === 'pd-comparison' && (
          <div className="bg-white p-4">
            <PDComparisonReport/>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
