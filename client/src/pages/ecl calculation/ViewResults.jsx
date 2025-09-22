import React, { useState, useCallback, useMemo } from "react";
import axios from "axios";
import API_URL from "../../utils/Api";
import moment from "moment";
import { FixedSizeList as List } from "react-window";
import ResultsVisualization from "../../components/ecl/ResultsVisualization";

function ViewResults() {
  const todayStr = moment().format("YYYY-MM-DD");
  const [ficMisDate, setFicMisDate] = useState(todayStr);
  const [nRunKey, setNRunKey] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [columns, setColumns] = useState([]);
  const [activeTab, setActiveTab] = useState('data');

  const fetchResults = useCallback(() => {
    if (!ficMisDate || !nRunKey) {
      setError("Please enter both Date and Run Key.");
      return;
    }
    
    setLoading(true);
    setError("");
    setData([]);
    
    console.time('API Request');
    axios
      .get(`${API_URL}/ecl-data/get-ecl`, {
        params: { fic_mis_date: ficMisDate, n_run_key: nRunKey },
      })
      .then((res) => {
        console.timeEnd('API Request');
        console.time('Process Data');
        
        const responseData = res.data.data || [];
        if (responseData.length > 0) {
          setColumns(Object.keys(responseData[0]));
        }
        setData(responseData);
        
        console.timeEnd('Process Data');
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError("Failed to fetch ECL results.");
        setLoading(false);
      });
  }, [ficMisDate, nRunKey]);

  const downloadCSV = useCallback(() => {
    if (!data.length) return;
    
    console.time('CSV Generation');
    
    // Create CSV headers
    const csvContent = [columns.join(",")];
    
    // Use a streaming approach with batches for large datasets
    const batchSize = 1000;
    const totalRows = data.length;
    
    // Process in batches to avoid blocking the main thread
    const processBatch = (startIndex) => {
      const endIndex = Math.min(startIndex + batchSize, totalRows);
      
      for (let i = startIndex; i < endIndex; i++) {
        const row = data[i];
        csvContent.push(
          columns.map(col => JSON.stringify(row[col] ?? "")).join(",")
        );
      }
      
      if (endIndex < totalRows) {
        // Process next batch asynchronously
        setTimeout(() => processBatch(endIndex), 0);
      } else {
        // Finished all batches, create and download the file
        const blob = new Blob([csvContent.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ECL_Results_${ficMisDate}_${nRunKey}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up
        
        console.timeEnd('CSV Generation');
      }
    };
    
    // Start the first batch
    processBatch(0);
  }, [data, columns, ficMisDate, nRunKey]);

  // This is our virtualized row component that works with tables
  const VirtualRow = useCallback(
    ({ index, style }) => {
      const row = data[index];
      return (
        <tr 
          className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
          style={{ ...style, display: "flex" }}
        >
          {columns.map((col, colIndex) => {
            const cellValue = col === "fic_mis_date" && row[col]
              ? moment(row[col]).format("YYYY-MM-DD")
              : row[col] === null
              ? ""
              : row[col].toString();
              
            return (
              <td 
                key={colIndex} 
                className="border border-gray-300 px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis text-xs"
                style={{ 
                  minWidth: "150px", // Adjust column width as needed
                  flex: 1,
                  display: "block"
                }}
              >
                {cellValue}
              </td>
            );
          })}
        </tr>
      );
    },
    [data, columns]
  );

  // Calculate table width based on columns
  const tableWidth = useMemo(() => 
    columns.length * 150, // 150px per column (adjust as needed)
    [columns]
  );

  return (
    <div className="bg-white w-full p-4">
      <style jsx>{`
        .thin-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 0;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .thin-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #888 #f1f1f1;
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-sm font-bold text-gray-800">ECL Results</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Input */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-700 whitespace-nowrap">
              Date:
            </label>
            <input
              type="date"
              className="border border-gray-300 px-2 py-1 text-xs w-32"
              value={ficMisDate}
              onChange={(e) => setFicMisDate(e.target.value)}
            />
          </div>

          {/* Run Key Input */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-700 whitespace-nowrap">
              Run Key:
            </label>
            <input
              type="number"
              className="border border-gray-300 px-2 py-1 text-xs w-32"
              value={nRunKey}
              onChange={(e) => setNRunKey(e.target.value)}
              min={1}
            />
          </div>

          {/* Fetch Button */}
          <button
            className="p-1.5 text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
            onClick={fetchResults}
            disabled={loading}
            title="Fetch Results"
          >
            {loading ? (
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </button>

          {/* Download Button (conditional) */}
          {data.length > 0 && (
            <button
              className="p-1.5 text-white bg-gray-600 hover:bg-gray-700"
              onClick={downloadCSV}
              title="Download Results"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <hr className="border-gray-200 mb-4" />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6">
          <button
            className={`py-2 px-1 text-xs font-medium border-b-2 ${
              activeTab === 'data'
                ? 'border-gray-600 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('data')}
          >
            Data Table
          </button>
          <button
            className={`py-2 px-1 text-xs font-medium border-b-2 ${
              activeTab === 'visualization'
                ? 'border-gray-600 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('visualization')}
          >
            Results Visualization
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'data' && (
        <>
          {loading ? (
        <div className="text-gray-600 flex items-center justify-center h-32">
          <svg
            className="animate-spin h-6 w-6 text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="ml-2 text-xs">Loading...</span>
        </div>
      ) : error ? (
        <div className="text-red-600 text-xs">{error}</div>
      ) : data.length === 0 ? (
        <div className="text-gray-500 text-xs">No results found.</div>
      ) : (
        <div className="overflow-auto h-[calc(100vh-200px)] border border-gray-300 thin-scrollbar">
          <div style={{ width: tableWidth + "px", minWidth: "100%" }}>
            {/* Table Header */}
            <div style={{ display: "flex" }} className="sticky top-0 z-10">
              {columns.map((col) => (
                <div
                  key={col}
                  className="border border-gray-300 px-2 py-2 bg-gray-50 text-gray-700 whitespace-nowrap text-xs font-medium"
                  style={{ 
                    minWidth: "150px", // Adjust as needed
                    flex: 1,
                  }}
                >
                  {col}
                </div>
              ))}
            </div>
            
            {/* Virtualized Rows */}
            {data.length > 0 && (
              <List
                height={Math.max(400, window.innerHeight - 300)}
                itemCount={data.length}
                itemSize={30} // Adjust based on your row height
                width="100%"
              >
                {VirtualRow}
              </List>
            )}
          </div>
          
          {data.length > 0 && (
            <div className="text-xs text-gray-500 p-2">
              Showing {data.length} records
            </div>
          )}
        </div>
      )}
        </>
      )}

      {activeTab === 'visualization' && (
        <ResultsVisualization />
      )}
    </div>
  );
}

export default ViewResults;