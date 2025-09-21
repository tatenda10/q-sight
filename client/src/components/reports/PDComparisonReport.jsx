import React, { useState, useEffect } from 'react';
import { Calendar, Search, Loader2, Download } from "lucide-react";
import API_URL from '../../utils/Api';
import * as XLSX from 'xlsx';
import AIAnalysisPanel from '../ai/AIAnalysisPanel';
import AIChat from '../ai/AIChat';

function PDComparisonReport() {
  const [selectedDate, setSelectedDate] = useState('2025-05-31');
  const [runKey, setRunKey] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch PD Comparison Report data
  const fetchData = async () => {
    if (!selectedDate || !runKey) {
      setError('Please provide both Run Key and Reporting Date');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/reports/pd-comparison?runKey=${runKey}&reportingDate=${selectedDate}`,
        { headers: { 'Cache-Control': 'no-cache' } }
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to fetch report data');
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

  const formatNumber = (value, decimals = 4) => {
    return value === null || value === undefined
      ? "-"
      : Number(value).toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search Form */}
      <div className="mb-4">        
        <div className="flex justify-between items-end gap-4">
          <div className="flex gap-4 items-end">
            <div>
              <label htmlFor="reportingDate" className="block text-xs font-medium text-gray-700 mb-1">Reporting Date</label>
              <div className="relative">
          <input
                  id="reportingDate"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
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
        <>
          {/* AI Analysis Panel */}
          <div className="mb-6">
            <AIAnalysisPanel 
              reportData={reportData} 
              reportType="pd_comparison"
              title="PD Comparison Analysis"
            />
          </div>

          {/* AI Chat */}
          <div className="mb-6">
            <AIChat 
              reportData={reportData} 
              reportType="pd_comparison"
            />
          </div>

          {/* Summary Statistics */}
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Total Segments</div>
            <div className="text-lg font-bold text-gray-800">{reportData.summaryStats.totalSegments}</div>
          </div>
          <div className="bg-white p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Total Comparisons</div>
            <div className="text-lg font-bold text-gray-800">{reportData.summaryStats.totalComparisons}</div>
          </div>
          <div className="bg-white p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Average Variance</div>
            <div className="text-lg font-bold text-gray-800">{formatNumber(reportData.summaryStats.averageVariance, 2)}%</div>
          </div>
          <div className="bg-white p-4 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">High Variance (&gt;20%)</div>
            <div className="text-lg font-bold text-red-600">{reportData.summaryStats.highVarianceCount}</div>
          </div>
        </div>

        {/* PD Comparison Table */}
        <div className="bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-800">
              PD Comparison Report - {selectedDate}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium text-gray-700 border-r border-gray-200" rowSpan="2">Segment ID</th>
                  <th className="px-4 py-2.5 text-start font-medium text-gray-700 border-r border-gray-200" rowSpan="2">Product Segment</th>
                  <th className="px-4 py-2.5 text-start font-medium text-gray-700 border-r border-gray-200" rowSpan="2">Product Type</th>
                  {reportData.delinquencyBands.map((band, index) => (
                    <th key={index} className="px-4 py-2.5 text-center font-medium text-gray-700 border-r border-gray-200" colSpan="2">
                      {band.band_description} ({band.band_code})
                    </th>
                  ))}
                </tr>
                <tr>
                  {reportData.delinquencyBands.map((band, index) => (
                    <React.Fragment key={index}>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Observed PD</th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Model PD</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {reportData.comparisonMatrix.map((segment, index) => (
                  <tr key={segment.segment_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-start font-medium text-gray-900 border-r border-gray-200">
                      {segment.segment_id}
                    </td>
                    <td className="px-4 py-2.5 text-start text-gray-700 border-r border-gray-200">
                      {segment.segment_name}
                    </td>
                    <td className="px-4 py-2.5 text-start text-gray-700 border-r border-gray-200">
                      {segment.segment_type}
                    </td>
                    {segment.delinquencyBands.map((band, bandIndex) => (
                      <React.Fragment key={bandIndex}>
                        <td className="px-2 py-2.5 text-center text-gray-700 border-r border-gray-200">
                          <div className="font-medium text-red-600">
                            {formatNumber(band.ecl_pd * 100, 2)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {band.account_count} accounts
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center text-gray-700 border-r border-gray-200">
                          <div className="font-medium text-blue-600">
                            {formatNumber(band.term_structure_pd * 100, 2)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {band.pd_difference > 0 ? '+' : ''}{formatNumber(band.pd_difference * 100, 2)}%
                          </div>
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

    </div>
  );
}

export default PDComparisonReport;
