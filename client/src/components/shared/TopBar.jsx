import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

const TopBar = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageTitles = {
    '/dashboard': 'Dashboard',
    '/reports': 'Reports',
    '/loan-book-dashboard': 'Loan Book Dashboard',
    '/users': 'Users',
    '/audit-logs': 'Audit Logs',
    '/ecl-calculation': 'ECL Calculation',
    '/ecl-results': 'ECL Results',
    '/vintage-analysis': 'Vintage Analysis',
    '/view-loaded-data': 'Input Data',
    '/product-configuration': 'Product Configuration',
    '/classification-measurement': 'Classification & Measurement',
    '/staging-config': 'Staging Config',
    '/stage-reassignment': 'Stage Reassignment',
    '/upload-cashflows': 'Upload Cashflows',
    '/cashflows': 'Generate Cashflows',
    '/cashflows-config': 'Cashflows Configuration',
    '/pd-config': 'PD Configuration',
    '/pd-methodology': 'PD Methodology',
    '/pd-backtesting': 'PD Backtesting',
    '/macro-economic-config': 'Macro-Economic Config',
    '/lgd-config': 'LGD Configuration',
    '/lgd-methodology': 'LGD Methodology',
  };

  const title = pageTitles[location.pathname] || 'Workspace';
  const isReportsPage = location.pathname === '/reports';
  const selectedReportTab = searchParams.get('tab') || 'ecl';
  const reportTabs = [
    { key: 'ecl', label: 'ECL Analysis Report' },
    { key: 'loss', label: 'Loss Allowance Report (IFRS 7)' },
    { key: 'ifrs735g', label: 'IFRS 7.35G Report' },
    { key: 'pd-comparison', label: 'PD Comparison Report' },
  ];

  const handleReportTabChange = (tab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.06)]">
      <div className="flex h-[72px] items-center justify-between px-6">
        <div className="flex items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            <p className="text-xs text-gray-500">ZB Bank IFRS 9 Platform</p>
          </div>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10963a] text-sm font-semibold text-white shadow-sm">
            ZB
        </div>
      </div>

      {isReportsPage && (
        <div className="border-t border-gray-100 px-6">
          <div className="flex flex-wrap items-center gap-6">
            {reportTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleReportTabChange(tab.key)}
                className={`border-b-2 px-1 py-3 text-xs leading-5 transition-colors ${
                  selectedReportTab === tab.key
                    ? 'border-[#10963a] text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;
