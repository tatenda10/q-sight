import React, { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { FaSearch, FaFileExcel } from 'react-icons/fa';
import API_URL from '../../utils/Api';
import * as XLSX from 'xlsx';

function AccountCashflows() {
  const [runDate, setRunDate] = useState("");
  const [running, setRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // ...existing state and logic...

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setShowModal(true);
    }, 5000);
  }
  const [searchParams, setSearchParams] = useState({
    fic_mis_date: '',
    v_account_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!searchParams.fic_mis_date || !searchParams.v_account_number) {
      setError('Please fill in both MIS Date and Account Number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/cashflow-projections`, {
        params: searchParams
      });
      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const downloadExcel = () => {
    if (!data) return;

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Prepare loan details data
    const loanDetailsData = [
      ['Loan Details'],
      ['Account Number', data.loan.v_account_number],
      ['MIS Date', formatDate(data.loan.fic_mis_date)],
      ['Currency', data.loan.currency],
      ['Loan Amount', formatCurrency(data.loan.loan_amount, data.loan.currency)],
      [],  // Empty row for spacing
    ];

    // Prepare summary data
    const summaryData = [
      ['Cashflow Summary'],
      ['Total Cashflows', data.summary.total_cashflows],
      ['Total Principal', formatCurrency(data.summary.total_principal, data.summary.currency)],
      ['Total Interest', formatCurrency(data.summary.total_interest, data.summary.currency)],
      ['Total Amount', formatCurrency(data.summary.total_amount, data.summary.currency)],
      [],  // Empty row for spacing
    ];

    // Prepare cashflows data
    const cashflowsHeaders = [
      'Bucket',
      'Date',
      'Principal',
      'Interest',
      'Total',
      'Balance',
      'Accrued Interest',
      'Cash Flow Type'
    ];

    const cashflowsData = data.cashflows.map(cf => [
      cf.n_cash_flow_bucket,
      formatDate(cf.d_cash_flow_date),
      Number(cf.n_principal_payment),
      Number(cf.n_interest_payment),
      Number(cf.n_cash_flow_amount),
      Number(cf.n_balance),
      Number(cf.n_accrued_interest || 0),
      cf.v_cash_flow_type || 'M'
    ]);

    // Combine all data
    const allData = [
      ...loanDetailsData,
      ...summaryData,
      ['Cashflow Details'],
      cashflowsHeaders,
      ...cashflowsData
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(allData);

    // Set column widths
    const columnWidths = [
      { wch: 15 },  // A
      { wch: 15 },  // B
      { wch: 15 },  // C
      { wch: 15 },  // D
      { wch: 15 },  // E
      { wch: 15 },  // F
      { wch: 15 },  // G
      { wch: 15 }   // H
    ];
    ws['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Cashflows');

    // Generate Excel file
    const fileName = `Cashflows_${data.loan.v_account_number}_${format(new Date(data.loan.fic_mis_date), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="container max-w-full max-h-full  flex flex-col flex-grow p-6 mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-sm font-bold text-gray-900">Account Cashflows</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={runDate || ''}
            onChange={e => setRunDate(e.target.value)}
            className="border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-200"
            style={{ minWidth: 120 }}
          />
          <button
            onClick={handleRun}
            disabled={!runDate || running}
            className={`bg-gray-600 text-white px-4 py-1.5 font-semibold hover:bg-gray-700 text-xs transition-colors ${running ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            Run
          </button>
          {data && (
            <button
              onClick={downloadExcel}
              className="px-4 py-2 bg-gray-600 text-white text-xs hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
            >
              <FaFileExcel />
              Export to Excel
            </button>
          )}
        </div>
      </div>
      {/* Loader and Modal */}
      {running && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-8 flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-gray-600 mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-gray-600 font-medium text-xs">Running cashflows...</span>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-8 flex flex-col items-center">
            <span className="text-green-600 font-bold text-xs mb-4">Cashflows done</span>
            <button
              className="bg-gray-600 text-white px-6 py-2 text-xs hover:bg-gray-700 font-semibold"
              onClick={() => setShowModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      <hr className="border-t-2 border-gray-100 mb-6" />
      <div className="h-px bg-gray-200 w-full mb-6"></div>

      {/* Search Panel */}
      <div className="bg-white mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              MIS Date
            </label>
            <input
              type="date"
              value={searchParams.fic_mis_date}
              onChange={(e) => setSearchParams({
                ...searchParams,
                fic_mis_date: e.target.value
              })}
              className="w-full border border-gray-200 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Account Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchParams.v_account_number}
                onChange={(e) => setSearchParams({
                  ...searchParams,
                  v_account_number: e.target.value
                })}
                className="w-full border border-gray-200 px-3 py-2 pr-10 text-xs"
                placeholder="Enter account number"
              />
              <button
                onClick={handleSearch}
                disabled={!searchParams.fic_mis_date || !searchParams.v_account_number}
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                  (!searchParams.fic_mis_date || !searchParams.v_account_number)
                    ? 'text-gray-300'
                    : 'text-gray-400 hover:text-gray-600 cursor-pointer'
                }`}
              >
                <FaSearch />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="text-center py-4 text-xs">Loading...</div>
      ) : error ? (
        <div className="text-red-500 py-4 text-xs">{error}</div>
      ) : data && (
        <div className="space-y-6">
          {/* Loan Details */}
          <div className="bg-white">
            <h2 className="text-sm font-semibold mb-4">Loan Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Account Number</p>
                <p className="font-medium text-xs">{data.loan.v_account_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">MIS Date</p>
                <p className="font-medium text-xs">{formatDate(data.loan.fic_mis_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Currency</p>
                <p className="font-medium text-xs">{data.loan.currency}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Loan Amount</p>
                <p className="font-medium text-xs">{formatCurrency(data.loan.loan_amount, data.loan.currency)}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white">
            <h2 className="text-sm font-semibold mb-4">Cashflow Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Cashflows</p>
                <p className="font-medium text-xs">{data.summary.total_cashflows}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Principal</p>
                <p className="font-medium text-xs">{formatCurrency(data.summary.total_principal, data.summary.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Interest</p>
                <p className="font-medium text-xs">{formatCurrency(data.summary.total_interest, data.summary.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-medium text-xs">{formatCurrency(data.summary.total_amount, data.summary.currency)}</p>
              </div>
            </div>
          </div>

          {/* Cashflows Table */}
          <div className="w-full flex-grow flex max-h-full max-w-full overflow-hidden flex-col bg-white border border-gray-200">
            <div className="overflow-auto flex-grow max-h-full relative max-w-full">
              <table className="w-full min-w-max border-collapse">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200" style={{ minWidth: "80px" }}>
                      Bucket
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200" style={{ minWidth: "120px" }}>
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200" style={{ minWidth: "120px" }}>
                      Principal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200" style={{ minWidth: "120px" }}>
                      Interest
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200" style={{ minWidth: "120px" }}>
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200" style={{ minWidth: "120px" }}>
                      Balance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200" style={{ minWidth: "120px" }}>
                      Accrued Interest
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-black border-b border-gray-200" style={{ minWidth: "100px" }}>
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.cashflows.map((cashflow, index) => (
                    <tr 
                      key={cashflow.n_cash_flow_bucket}
                      className={`
                        transition-colors duration-200
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        hover:bg-blue-100
                        border-b border-gray-100
                      `}
                    >
                      <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100">
                        {cashflow.n_cash_flow_bucket}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {formatDate(cashflow.d_cash_flow_date)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {formatCurrency(cashflow.n_principal_payment, cashflow.v_ccy_code)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {formatCurrency(cashflow.n_interest_payment, cashflow.v_ccy_code)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {formatCurrency(cashflow.n_cash_flow_amount, cashflow.v_ccy_code)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {formatCurrency(cashflow.n_balance, cashflow.v_ccy_code)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {formatCurrency(cashflow.n_accrued_interest || 0, cashflow.v_ccy_code)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {cashflow.v_cash_flow_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountCashflows;