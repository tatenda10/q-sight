import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../../utils/Api";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

function ClassificationMeasurement() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const [editedClassification, setEditedClassification] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);

  const classificationOptions = [
    {
      classification: "Financial Asset at Amortized Cost",
      measurement: "Amortized Cost"
    },
    {
      classification: "Financial Asset at Fair Value Through OCI (FVOCI)",
      measurement: "Fair Value (OCI)"
    },
    {
      classification: "Financial Asset at Fair Value Through Profit or Loss (FVTPL)",
      measurement: "Fair Value (P&L)"
    }
  ];

  const columns = [
    { id: "v_prod_code", label: "V_PROD_CODE" },
    { id: "fic_mis_date", label: "FIC_MIS_DATE" },
    { id: "v_prod_type", label: "V_PROD_TYPE" },
    { id: "v_prod_desc", label: "V_PROD_DESC" },
    { id: "classification", label: "CLASSIFICATION" },
    { id: "measurement", label: "MEASUREMENT" }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTableLoading(true);
        const response = await axios.get(`${API_URL}/classification-measurement?page=${page}&limit=${limit}`);
        setData(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      } catch (error) {
        setError(error.message);
      } finally {
        setTableLoading(false);
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  const formatDate = (dateString) => {
    return dateString ? dateString.split('T')[0] : '';
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        return prev.filter(rowId => rowId !== id);
      } else {
        return [id]; // Only allow one selection at a time
      }
    });
  };

  const handleClassificationChange = (rowId, newClassification) => {
    const matchingOption = classificationOptions.find(
      option => option.classification === newClassification
    );

    setEditedClassification({
      id: rowId,
      classification: newClassification,
      measurement: matchingOption.measurement
    });

    // Update local state for immediate visual feedback
    setData(prevData => prevData.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          classification: newClassification,
          measurement: matchingOption.measurement
        };
      }
      return row;
    }));
  };

  const handleSave = async () => {
    if (!editedClassification) return;

    try {
      setLoading(true);
      await axios.put(`${API_URL}/classification-measurement`, editedClassification);
      
      // Clear selection and edited data after successful save
      setSelectedRows([]);
      setEditedClassification(null);
      
      // Optionally refresh the data
      const response = await axios.get(`${API_URL}/classification-measurement?page=${page}&limit=${limit}`);
      setData(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      setError('Failed to update classification');
    } finally {
      setLoading(false);
    }
  };

  const renderClassificationCell = (row) => {
    const isSelected = selectedRows.includes(row.id);
    
    if (isSelected) {
      return (
        <select
          value={row.classification}
          onChange={(e) => handleClassificationChange(row.id, e.target.value)}
          className="w-full p-1 text-xs border focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          {classificationOptions.map(option => (
            <option key={option.classification} value={option.classification}>
              {option.classification}
            </option>
          ))}
        </select>
      );
    }
    return row.classification;
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
    <div className="container max-w-full max-h-full overflow-hidden flex flex-col flex-grow p-6 mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-sm font-bold text-gray-900">
          Classification Measurement
        </h1>
        {selectedRows.length > 0 && editedClassification && (
          <button 
            className="px-4 py-2 bg-gray-600 text-white text-xs hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
            onClick={handleSave}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7"
              />
            </svg>
            Save Changes
          </button>
        )}
     
      </div>
      
      <div className="h-px bg-gray-200 w-full mb-6"></div>

      <div className="w-full flex-grow flex max-h-full max-w-full overflow-hidden flex-col bg-white border border-gray-200">
        <div className="overflow-auto flex-grow max-h-full relative max-w-full">
          {tableLoading ? (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex flex-col items-center">
                <LoadingSpinner />
                <span className="mt-2 text-xs text-gray-500">Loading data...</span>
              </div>
            </div>
          ) : null}
          <table className="w-full min-w-max border-collapse">
            <thead className="sticky top-0 bg-white">
              <tr className="bg-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 border-b border-gray-200 w-10"></th>
                {columns.map((column) => (
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
              {data.map((row, index) => {
                const isSelected = selectedRows.includes(row.id);
                return (
                  <tr 
                    key={row.id} 
                    className={`
                      transition-colors duration-200
                      ${isSelected ? 'bg-blue-100' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      ${!isSelected && 'hover:bg-blue-100'}
                      border-b border-gray-100
                    `}
                  >
                    <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100">
                      <input
                        type="checkbox"
                        className="border-gray-300 text-gray-600 focus:border-gray-500 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
                        checked={isSelected}
                        onChange={() => handleSelectRow(row.id)}
                      />
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap "
                        style={{ minWidth: "150px" }}
                      >
                        {column.id === 'fic_mis_date'
                          ? formatDate(row[column.id])
                          : column.id === 'classification'
                          ? renderClassificationCell(row)
                          : column.id === 'measurement'
                          ? row.measurement
                          : row[column.id]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || tableLoading}
            className={`px-3 py-1 text-xs ${
              page === 1 || tableLoading ? 'bg-gray-100 text-gray-400' : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Previous
          </button>
          <span className="text-xs text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || tableLoading}
            className={`px-3 py-1 text-xs ${
              page === totalPages || tableLoading ? 'bg-gray-100 text-gray-400' : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClassificationMeasurement;
