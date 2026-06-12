import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ECLAnalsyisReport from '../../components/reports/ECLAnalsyisReport';
import LossAllowanceReport from '../../components/reports/LossAllowanceReport';
import IFRS735G from '../../components/reports/IFRS735G';
import PDComparisonReport from '../../components/reports/PDComparisonReport';

function Reports() {
  const [searchParams] = useSearchParams();
  const selectedSection = searchParams.get('tab') || 'ecl';

  return (
    <div className="w-full px-4 py-4">
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
  );
}

export default Reports;
