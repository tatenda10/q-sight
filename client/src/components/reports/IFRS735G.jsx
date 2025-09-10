import React, { useState } from 'react';
import { Calendar, Search, Loader2, Download } from "lucide-react";
import API_URL from '../../utils/Api';
import * as XLSX from 'xlsx';

export default function IFRS735G() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportingDate, setReportingDate] = useState('');
  const [runKey, setRunKey] = useState('');
  
  const fetchData = async () => {
    if (!reportingDate || !runKey) {
      setError('Please provide both Run Key and Reporting Date');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/term-structure-report/term-structure?runKey=${runKey}&reportingDate=${reportingDate}`,
        { headers: { 'Cache-Control': 'no-cache' } }
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.data || Object.keys(data.data).length === 0) {
        setError('No data found for the specified criteria');
        setReportData(null);
      } else {
        setReportData(data.data);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(`Failed to fetch report data: ${err.message}`);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  const formatPercentage = (value) => {
    return (parseFloat(value) * 100).toFixed(2) + '%';
  };

  const handleExportToExcel = () => {
    if (!reportData) return;

    // Prepare data for Excel
    const excelData = [];
    
    // Add headers
    excelData.push([
      'Segment',
      'Band',
      'Accounts',
      'EAD',
      'Average PD',
      'Average LGD',
      'ECL'
    ]);

    // Add data rows
    Object.entries(reportData).forEach(([segment, details]) => {
      details.forEach((row, index) => {
        excelData.push([
          index === 0 ? segment : '',
          row.delinquencyBand,
          row.accountCount,
          parseFloat(row.totalExposure),
          parseFloat(row.averagePD),
          parseFloat(row.averageLGD),
          parseFloat(row.total12MECL)
        ]);
      });

      // Add segment totals
      const totals = details.reduce((acc, row) => ({
        totalExposure: acc.totalExposure + parseFloat(row.totalExposure),
        total12MECL: acc.total12MECL + parseFloat(row.total12MECL),
        accountCount: acc.accountCount + row.accountCount
      }), { totalExposure: 0, total12MECL: 0, accountCount: 0 });

      excelData.push([
        '',
        '',
        totals.accountCount,
        totals.totalExposure,
        '',
        '',
        totals.total12MECL
      ]);

      // Add empty row between segments
      excelData.push([]);
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();

    // Style configuration
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } },
      alignment: { horizontal: "center" }
    };

    const totalRowStyle = {
      font: { bold: true },
      border: { bottom: { style: "double", color: { rgb: "000000" } } }
    };

    // Apply styles
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const range = XLSX.utils.encode_range({ s: { r: i, c: 0 }, e: { r: i, c: 6 } });
      
      if (i === 0) {
        // Header row
        ws['!cols'] = [
          { width: 15 }, { width: 12 }, { width: 10 }, 
          { width: 15 }, { width: 12 }, { width: 12 }, { width: 15 }
        ];
        Object.keys(headerStyle).forEach(key => {
          if (!ws[range]) ws[range] = {};
          ws[range][key] = headerStyle[key];
        });
      }
      
      // Format numbers
      if (i > 0 && row.length > 0) {
        // EAD and ECL columns (currency)
        ['D', 'G'].forEach(col => {
          const cell = col + (i + 1);
          if (ws[cell] && ws[cell].v) {
            ws[cell].z = '"$"#,##0.00';
          }
        });
        // PD and LGD columns (percentage)
        ['E', 'F'].forEach(col => {
          const cell = col + (i + 1);
          if (ws[cell] && ws[cell].v) {
            ws[cell].z = '0.00%';
          }
        });
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Term Structure Report");

    // Generate file name with date
    const fileName = `Term_Structure_Report_${reportingDate}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="mb-4">        
        <div className="flex justify-between items-end gap-4">
          <div className="flex gap-4 items-end">
            <div>
              <label htmlFor="reportingDate" className="block text-xs font-medium text-gray-700 mb-1">Reporting Date</label>
              <div className="relative">
                <input
                  id="reportingDate"
                  type="date"
                  value={reportingDate}
                  onChange={(e) => setReportingDate(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                />
                <Calendar className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label htmlFor="runKey" className="block text-xs font-medium text-gray-700 mb-1">Run Key</label>
              <input
                id="runKey"
                type="text"
                value={runKey}
                onChange={(e) => setRunKey(e.target.value)}
                className="px-3 py-1 text-xs border border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                placeholder="Enter run key"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-1 bg-gray-600 text-white text-xs hover:bg-gray-700 transition-colors h-[30px]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportToExcel}
              disabled={!reportData || loading}
              className="flex items-center gap-2 px-4 py-1 bg-gray-600 text-white text-xs hover:bg-gray-700 transition-colors h-[30px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-3">
          <div className="flex">
            <div className="ml-2">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
        {reportData && !error && (
        <div className="overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-xs">            
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Segment</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-700">Band</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Accounts</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">EAD</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Average PD</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">Average LGD</th>                
                <th className="px-4 py-2.5 text-right font-medium text-gray-700">ECL</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(reportData).map(([segment, details]) => {
                const segmentTotals = details.reduce((acc, row) => ({
                  totalExposure: acc.totalExposure + parseFloat(row.totalExposure),
                  total12MECL: acc.total12MECL + parseFloat(row.total12MECL),
                  averageLGD: acc.averageLGD + parseFloat(row.averageLGD),
                  averagePD: acc.averagePD + parseFloat(row.averagePD),
                  accountCount: acc.accountCount + row.accountCount
                }), {
                  totalExposure: 0,
                  total12MECL: 0,
                  averageLGD: 0,
                  averagePD: 0,
                  accountCount: 0
                });

                return (
                  <React.Fragment key={segment}>
                    {details.map((row, index) => (
                      <tr key={`${segment}-${index}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                          {index === 0 ? segment : ''}
                        </td>
                        <td className="px-4 py-2.5 text-left text-gray-700">{row.delinquencyBand}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{row.accountCount.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(row.totalExposure)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{formatPercentage(row.averagePD)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{formatPercentage(row.averageLGD)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(row.total12MECL)}</td>
                      </tr>
                    ))}                    <tr className="bg-gray-100 hover:bg-gray-200 transition-colors font-semibold">
                      <td className="px-4 py-2.5 text-left font-bold text-gray-900"></td>
                      <td className="px-4 py-2.5 text-left font-bold text-gray-900"></td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{segmentTotals.accountCount.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{formatCurrency(segmentTotals.totalExposure)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900"></td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900"></td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900 border-b-2 border-double">{formatCurrency(segmentTotals.total12MECL)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}