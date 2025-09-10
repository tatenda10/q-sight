import React from 'react';

function SensitivityAnalysisReport() {
  const sensitivityData = {
    'Mortgage Loans': [
      {
        scenario: 'Base Case',
        pdAssumption: 1.50,
        eclImpact: 37500
      },
      {
        scenario: 'Downturn Scenario',
        pdAssumption: 3.00,
        eclImpact: 75000
      },
      {
        scenario: 'Optimistic Scenario',
        pdAssumption: 0.75,
        eclImpact: 18750
      }
    ],
    'Vehicle Loans': [
      {
        scenario: 'Base Case',
        pdAssumption: 2.00,
        eclImpact: 40000
      },
      {
        scenario: 'Downturn Scenario',
        pdAssumption: 4.00,
        eclImpact: 80000
      },
      {
        scenario: 'Optimistic Scenario',
        pdAssumption: 1.00,
        eclImpact: 20000
      }
    ],
    'SME Loans': [
      {
        scenario: 'Base Case',
        pdAssumption: 5.00,
        eclImpact: 45000
      },
      {
        scenario: 'Downturn Scenario',
        pdAssumption: 7.50,
        eclImpact: 67500
      },
      {
        scenario: 'Optimistic Scenario',
        pdAssumption: 2.50,
        eclImpact: 22500
      }
    ]
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZW', {
      style: 'currency',
      currency: 'ZWL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {Object.entries(sensitivityData).map(([segment, scenarios]) => (
        <div key={segment} className="mb-6">
          <h2 className="text-base font-medium mb-3 text-gray-700">{segment}</h2>
          <div className="overflow-x-auto rounded-lg">
            <div className="inline-block min-w-full align-middle">
              <div className="border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200">
                        Scenario
                      </th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200">
                        PD Assumption (%)
                      </th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200">
                        ECL Impact (ZWL)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scenarios.map((row, index) => (
                      <tr 
                        key={row.scenario}
                        className={`hover:bg-gray-50 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                          {row.scenario}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600 text-right">
                          {row.pdAssumption.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-600 text-right">
                          {formatCurrency(row.eclImpact)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium mb-2 text-gray-700">Analysis Notes</h3>
        <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600">
          <li>Base Case: Represents current economic conditions and expected credit risk</li>
          <li>Downturn Scenario: Reflects potential economic stress and increased default rates</li>
          <li>Optimistic Scenario: Assumes favorable economic conditions and reduced default rates</li>
          <li>ECL Impact shows the sensitivity of expected credit losses to changes in PD assumptions</li>
        </ul>
      </div>
    </div>
  );
}

export default SensitivityAnalysisReport;