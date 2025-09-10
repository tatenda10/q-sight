import React, { useState } from 'react';

function PDComparisonReport() {
  const [selectedDate, setSelectedDate] = useState('2025-05-31');
  
  // Product segments data
  const productSegments = [
    { segment_id: 1, v_prod_segment: 'EDUCATION', v_prod_type: 'RETAIL', v_prod_desc: 'EDUCATION' },
    { segment_id: 2, v_prod_segment: 'MANUFACTURING', v_prod_type: 'RETAIL', v_prod_desc: 'MANUFACTURING' },
    { segment_id: 3, v_prod_segment: 'HEALTHY', v_prod_type: 'RETAIL', v_prod_desc: 'HEALTHY' },
    { segment_id: 4, v_prod_segment: 'AGRICULTURE', v_prod_type: 'RETAIL', v_prod_desc: 'AGRICULTURE' }
  ];

  // Delinquency bands data
  const delinquencyBands = [
    { id: 1, date: '2024-11-30', n_delq_band_code: 'Active', v_delq_band_desc: 'Stage 1', n_delq_lower_value: 0, n_delq_upper_value: 0, v_amrt_term_unit: 'M', created_by: null },
    { id: 2, date: '2024-11-30', n_delq_band_code: '1-30', v_delq_band_desc: 'Stage 1', n_delq_lower_value: 1, n_delq_upper_value: 30, v_amrt_term_unit: 'M', created_by: null },
    { id: 4, date: '2024-11-30', n_delq_band_code: '31-60', v_delq_band_desc: 'Stage 2', n_delq_lower_value: 31, n_delq_upper_value: 60, v_amrt_term_unit: 'M', created_by: null },
    { id: 5, date: '2024-11-30', n_delq_band_code: '61-89', v_delq_band_desc: 'Stage 2', n_delq_lower_value: 61, n_delq_upper_value: 89, v_amrt_term_unit: 'M', created_by: null },
    { id: 6, date: '2024-11-30', n_delq_band_code: '90+', v_delq_band_desc: 'Stage 3', n_delq_lower_value: 90, n_delq_upper_value: 100000, v_amrt_term_unit: 'M', created_by: null }
  ];

  // PD term structure data - Actual PD
  const actualPdData = [
    { id: 1, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: 'Active', n_pd_percent: 0.0756, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 2, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '1-30', n_pd_percent: 0.2283, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 3, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '31-60', n_pd_percent: 0.5169, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 4, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '61-89', n_pd_percent: 0.7947, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 5, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '90+', n_pd_percent: 1.0000, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 6, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '90+', n_pd_percent: 1.0000, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 7, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '61-89', n_pd_percent: 0.7947, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 8, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '31-60', n_pd_percent: 0.5169, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 9, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '1-30', n_pd_percent: 0.2283, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 10, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: 'Active', n_pd_percent: 0.0756, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 11, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: 'Active', n_pd_percent: 0.0756, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 12, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '1-30', n_pd_percent: 0.2283, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 13, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '31-60', n_pd_percent: 0.5169, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 14, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '61-89', n_pd_percent: 0.7947, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 15, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '90+', n_pd_percent: 1.0000, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 16, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: 'Active', n_pd_percent: 0.0756, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 17, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '1-30', n_pd_percent: 0.2283, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 18, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '31-60', n_pd_percent: 0.5169, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 19, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '61-89', n_pd_percent: 0.7947, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 20, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '90+', n_pd_percent: 1.0000, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' }
  ];

  // Observed PD data (mock data for demonstration)
  const observedPdData = [
    { id: 1, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: 'Active', n_pd_percent: 0.0820, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 2, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '1-30', n_pd_percent: 0.2450, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 3, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '31-60', n_pd_percent: 0.5500, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 4, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '61-89', n_pd_percent: 0.8200, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 5, v_pd_term_structure_id: 1, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '90+', n_pd_percent: 1.0000, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 6, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '90+', n_pd_percent: 1.0000, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 7, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '61-89', n_pd_percent: 0.8200, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 8, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '31-60', n_pd_percent: 0.5500, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 9, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '1-30', n_pd_percent: 0.2450, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 10, v_pd_term_structure_id: 2, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: 'Active', n_pd_percent: 0.0820, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 11, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: 'Active', n_pd_percent: 0.0820, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 12, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '1-30', n_pd_percent: 0.2450, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 13, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '31-60', n_pd_percent: 0.5500, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 14, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '61-89', n_pd_percent: 0.8200, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 15, v_pd_term_structure_id: 3, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '90+', n_pd_percent: 1.0000, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 16, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: 'Active', n_pd_percent: 0.0820, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 17, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '1-30', n_pd_percent: 0.2450, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 18, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '31-60', n_pd_percent: 0.5500, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 19, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '61-89', n_pd_percent: 0.8200, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' },
    { id: 20, v_pd_term_structure_id: 4, fic_mis_date: '2025-05-31', v_credit_risk_basis_cd: '90+', n_pd_percent: 1.0000, v_pd_term_frequency_unit: 'M', v_pd_term_structure_type: 'D' }
  ];

  // Filter PD data by selected date
  const filteredActualPdData = actualPdData.filter(item => item.fic_mis_date === selectedDate);
  const filteredObservedPdData = observedPdData.filter(item => item.fic_mis_date === selectedDate);

  // Create a matrix of PD values by segment and delinquency band
  const createPdMatrix = () => {
    const matrix = [];
    
    productSegments.forEach(segment => {
      const segmentData = {
        segment_id: segment.segment_id,
        v_prod_segment: segment.v_prod_segment,
        v_prod_type: segment.v_prod_type,
        v_prod_desc: segment.v_prod_desc,
        delinquencyBands: []
      };

      delinquencyBands.forEach(band => {
        const actualPdValue = filteredActualPdData.find(pd => 
          pd.v_pd_term_structure_id === segment.segment_id && 
          pd.v_credit_risk_basis_cd === band.n_delq_band_code
        );
        
        const observedPdValue = filteredObservedPdData.find(pd => 
          pd.v_pd_term_structure_id === segment.segment_id && 
          pd.v_credit_risk_basis_cd === band.n_delq_band_code
        );
        
        segmentData.delinquencyBands.push({
          band_code: band.n_delq_band_code,
          band_desc: band.v_delq_band_desc,
          lower_value: band.n_delq_lower_value,
          upper_value: band.n_delq_upper_value,
          actual_pd_percent: actualPdValue ? actualPdValue.n_pd_percent : 0,
          observed_pd_percent: observedPdValue ? observedPdValue.n_pd_percent : 0
        });
      });

      matrix.push(segmentData);
    });

    return matrix;
  };

  const pdMatrix = createPdMatrix();

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
      {/* Header and Controls */}
      <div className="flex items-center justify-between gap-4 py-2 bg-white flex-wrap mb-4">
        <div className="flex gap-2 items-center">
          <label className="text-xs font-medium text-gray-700">Select Date:</label>
          <input
            type="date"
            className="border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <hr className="mb-4 border-gray-300" />

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
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 border-r border-gray-200" colSpan="2">Active (Stage 1)</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 border-r border-gray-200" colSpan="2">1-30 Days (Stage 1)</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 border-r border-gray-200" colSpan="2">31-60 Days (Stage 2)</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 border-r border-gray-200" colSpan="2">61-89 Days (Stage 2)</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700" colSpan="2">90+ Days (Stage 3)</th>
              </tr>
              <tr>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Observed PD</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Actual PD</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Observed PD</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Actual PD</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Observed PD</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Actual PD</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Observed PD</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Actual PD</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200">Observed PD</th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-600">Actual PD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {pdMatrix.map((segment, index) => (
                <tr key={segment.segment_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-start font-medium text-gray-900 border-r border-gray-200">
                    {segment.segment_id}
                  </td>
                  <td className="px-4 py-2.5 text-start text-gray-700 border-r border-gray-200">
                    {segment.v_prod_segment}
                  </td>
                  <td className="px-4 py-2.5 text-start text-gray-700 border-r border-gray-200">
                    {segment.v_prod_type}
                  </td>
                  {segment.delinquencyBands.map((band, bandIndex) => (
                    <React.Fragment key={bandIndex}>
                      <td className="px-2 py-2.5 text-center text-gray-700 border-r border-gray-200">
                        <div className="font-medium text-red-600">
                          {formatNumber(band.observed_pd_percent * 100, 2)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {band.lower_value === band.upper_value ? 
                            `${band.lower_value}` : 
                            `${band.lower_value}-${band.upper_value}`
                          }
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center text-gray-700 border-r border-gray-200">
                        <div className="font-medium text-blue-600">
                          {formatNumber(band.actual_pd_percent * 100, 2)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {band.lower_value === band.upper_value ? 
                            `${band.lower_value}` : 
                            `${band.lower_value}-${band.upper_value}`
                          }
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

    </div>
  );
}

export default PDComparisonReport;
