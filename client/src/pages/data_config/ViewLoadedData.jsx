import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../../utils/Api";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

function ViewLoadedData() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileType, setSelectedFileType] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fileTypes = [
    { id: 'LOAN_CONTRACTS', label: 'Loan Contracts', endpoint: '/loan-contracts' },
    { id: 'PARTY_MASTER', label: 'Party Master', endpoint: '/customer-info' }
  ];

  const columnDefinitions = {
    LOAN_CONTRACTS: [
      { id: "fic_mis_date", label: "MIS DATE" },
      { id: "v_account_number", label: "ACCOUNT NUMBER" },
      { id: "v_cust_ref_code", label: "CUSTOMER REF" },
      { id: "v_prod_code", label: "PRODUCT CODE" },
      { id: "n_curr_interest_rate", label: "CURRENT INTEREST RATE" },
      { id: "n_interest_changing_rate", label: "INTEREST CHANGING RATE" },
      { id: "v_interest_freq_unit", label: "INTEREST FREQ UNIT" },
      { id: "v_interest_payment_type", label: "INTEREST PAYMENT TYPE" },
      { id: "v_day_count_ind", label: "DAY COUNT IND" },
      { id: "v_management_fee_rate", label: "MANAGEMENT FEE RATE" },
      { id: "n_wht_percent", label: "WHT PERCENT" },
      { id: "n_effective_interest_rate", label: "EFFECTIVE INTEREST RATE" },
      { id: "n_accrued_interest", label: "ACCRUED INTEREST" },
      { id: "d_start_date", label: "START DATE" },
      { id: "d_last_payment_date", label: "LAST PAYMENT DATE" },
      { id: "d_next_payment_date", label: "NEXT PAYMENT DATE" },
      { id: "d_maturity_date", label: "MATURITY DATE" },
      { id: "v_amrt_repayment_type", label: "REPAYMENT TYPE" },
      { id: "v_amrt_term_unit", label: "TERM UNIT" },
      { id: "n_eop_curr_prin_bal", label: "PRINCIPAL BALANCE" },
      { id: "n_eop_int_bal", label: "INTEREST BALANCE" },
      { id: "n_eop_bal", label: "EOP BALANCE" },
      { id: "n_curr_payment_recd", label: "CURRENT PAYMENT" },
      { id: "n_collateral_amount", label: "COLLATERAL AMOUNT" },
      { id: "n_delinquent_days", label: "DELINQUENT DAYS" },
      { id: "n_pd_percent", label: "PD PERCENT" },
      { id: "n_lgd_percent", label: "LGD PERCENT" },
      { id: "v_ccy_code", label: "CURRENCY CODE" },
      { id: "v_loan_type", label: "LOAN TYPE" },
      { id: "m_fees", label: "FEES" },
      { id: "v_m_fees_term_unit", label: "FEES TERM UNIT" },
      { id: "v_lob_code", label: "LOB CODE" },
      { id: "v_lv_code", label: "LV CODE" },
      { id: "v_country_id", label: "COUNTRY ID" },
      { id: "v_credit_rating_code", label: "CREDIT RATING" },
      { id: "v_org_credit_score", label: "ORIGINAL CREDIT SCORE" },
      { id: "v_curr_credit_score", label: "CURRENT CREDIT SCORE" },
      { id: "v_acct_rating_movement", label: "RATING MOVEMENT" },
      { id: "v_collateral_type", label: "COLLATERAL TYPE" },
      { id: "v_loan_desc", label: "LOAN DESCRIPTION" },
      { id: "v_account_classification_cd", label: "ACCOUNT CLASSIFICATION" },
      { id: "v_gaap_code", label: "GAAP CODE" },
      { id: "v_branch_code", label: "BRANCH CODE" }
    ],
    PARTY_MASTER: [
      { id: "fic_mis_date", label: "MIS DATE" },
      { id: "v_party_id", label: "PARTY ID" },
      { id: "v_partner_name", label: "PARTNER NAME" },
      { id: "v_party_type", label: "PARTY TYPE" }
    ]
  };

  const formatValue = (value, columnId) => {
    if (value === null || value === undefined) return '';
    
    if (columnId.startsWith('d_') || columnId === 'fic_mis_date') {
      return formatDate(value);
    }
    
    if (columnId.startsWith('n_') || columnId === 'm_fees') {
      return typeof value === 'number' ? value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      }) : value;
    }
    
    return value;
  };

  const handleSearch = async (page = 1) => {
    if (!selectedFileType || !selectedDate) return;

    setLoading(true);
    setError(null);
    try {
      const fileType = fileTypes.find(type => type.id === selectedFileType);
      let url = `${API_URL}${fileType.endpoint}?fic_mis_date=${selectedDate}&page=${page}`;
      
      if (selectedFileType === 'LOAN_CONTRACTS' && accountNumber) {
        url += `&v_account_number=${accountNumber}`;
      }

      const response = await axios.get(url);
        setData(response.data.data);
      setCurrentPage(response.data.pagination.currentPage);
      setTotalPages(response.data.pagination.totalPages);
      setTotalRecords(response.data.pagination.totalRecords);
      } catch (error) {
      setError(error.response?.data?.message || 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

  const formatDate = (dateString) => {
    return dateString ? dateString.split('T')[0] : '';
  };

  const adjustDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1); // Add one day to fix the date issue
    return date.toISOString().split('T')[0];
  };

  const handleDelete = async (rowIds) => {
    if (!window.confirm(`Are you sure you want to delete ${rowIds.length} selected items?`)) {
      return;
    }

    setLoading(true);
    try {
      const fileType = fileTypes.find(type => type.id === selectedFileType);
      await axios.delete(`${API_URL}${fileType.endpoint}`, {
        data: { ids: rowIds }
      });
      
      // Refresh the data
      handleSearch(currentPage);
      setSelectedRows([]);
    } catch (error) {
      setError(error.response?.data?.message || 'Error deleting records');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (rowId) => {
    // Implement edit functionality for single row
    console.log('Editing row:', rowId);
  };

  if (loading) {
    return (
      <div className="container max-w-full flex items-center justify-center p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-full flex items-center justify-center p-6">
        <div className="text-xs text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <h1 className="text-sm font-semibold text-gray-800">View Loaded Data</h1>
            <button 
              onClick={() => navigate('/load-data')}
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors"
            >
              Upload Input Data
            </button>
          </div>
          <div className="h-px bg-gray-200 w-full"></div>

          {selectedRows.length > 0 && (
            <div className="flex space-x-4">
              {selectedRows.length === 1 ? (
                <button 
                  onClick={() => handleEdit(selectedRows[0])}
                  className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700"
                >
                  Edit Selected
                </button>
              ) : (
                <button 
                  onClick={() => handleDelete(selectedRows)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete Selected ({selectedRows.length})
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white px-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Select File Type
              </label>
              <select
                value={selectedFileType}
                onChange={(e) => {
                  setSelectedFileType(e.target.value);
                  setSelectedDate('');
                  setAccountNumber('');
                  setData([]);
                  setSelectedRows([]);
                }}
                className="w-full border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="">Select a file type...</option>
                {fileTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Enter Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!selectedFileType}
                className="w-full border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>

            {selectedFileType === 'LOAN_CONTRACTS' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account number..."
                  className="w-full border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>
            )}

            <div className="flex justify-end">
        <button 
                onClick={() => handleSearch(1)}
                disabled={!selectedFileType || !selectedDate || loading}
                className="p-2 hover:bg-gray-100 transition-colors"
        >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
        </button>
            </div>
          </div>
        </div>
      </div>
      
      {data.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 mx-6 mb-6">
          <div className="flex-1 bg-white border border-gray-200 flex flex-col overflow-hidden">
            <div className="overflow-auto flex-1">
              <table className="w-full min-w-max border-collapse">
            <thead className="sticky top-0 bg-white">
              <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left sticky top-0 bg-gray-100">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(data.map(row => row.id));
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                        checked={data.length > 0 && selectedRows.length === data.length}
                        className="border-gray-300"
                      />
                    </th>
                    {columnDefinitions[selectedFileType].map((column) => (
                  <th
                    key={column.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200"
                    style={{ minWidth: "150px" }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr 
                  key={index} 
                  className={`
                    hover:bg-blue-100 transition-colors duration-200
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        ${selectedRows.includes(row.id) ? 'bg-blue-100' : ''}
                    border-b border-gray-100
                  `}
                >
                      <td className="px-4 py-2 sticky left-0 bg-inherit">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows([...selectedRows, row.id]);
                            } else {
                              setSelectedRows(selectedRows.filter(id => id !== row.id));
                            }
                          }}
                          className="border-gray-300"
                        />
                      </td>
                      {columnDefinitions[selectedFileType].map((column) => (
                    <td
                      key={column.id}
                      className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100"
                    >
                          {formatValue(row[column.id], column.id)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-center">
                <span className="text-xs text-gray-700">
                  Showing {((currentPage - 1) * 100) + 1} to {Math.min(currentPage * 100, totalRecords)} of {totalRecords} results
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSearch(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleSearch(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border text-xs disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs">
            {error}
          </div>
        )}

        {!loading && !error && selectedDate && data.length === 0 && (
          <div className="mb-6 p-4 bg-gray-50 text-gray-700 text-xs text-center">
            No data found for the selected criteria
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewLoadedData;
