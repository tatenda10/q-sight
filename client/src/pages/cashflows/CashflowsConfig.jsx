import React, { useState } from 'react';

const CashflowConfig = () => {
  const methodDetails = {
    Simple: {
      formula: 'P * R * T',
      explanation: 'Simple interest is calculated on the principal amount only. Interest is not compounded.',
      variables: [
        { name: 'P', description: 'Principal amount (original loan amount)' },
        { name: 'R', description: 'Interest rate (in decimal form)' },
        { name: 'T', description: 'Time (in years or as per day count convention)' }
      ],
      example: 'For a loan of $10,000 at 5% for 1 year: $10,000 × 0.05 × 1 = $500 interest',
      useCase: 'Best suited for short-term loans or when interest is paid regularly'
    },
    Compound: {
      formula: 'P(1 + R)^T',
      explanation: 'Compound interest calculates interest on both the principal and accumulated interest.',
      variables: [
        { name: 'P', description: 'Principal amount' },
        { name: 'R', description: 'Interest rate per period' },
        { name: 'T', description: 'Number of periods' }
      ],
      example: 'For $10,000 at 5% compounded annually for 2 years: $10,000 × (1 + 0.05)² = $11,025',
      useCase: 'Typically used for investment products and long-term loans'
    },
    Amortized: {
      formula: 'PMT = P * (r(1+r)^n)/((1+r)^n-1)',
      explanation: 'Amortized loans have equal periodic payments that include both principal and interest.',
      variables: [
        { name: 'PMT', description: 'Payment amount per period' },
        { name: 'P', description: 'Principal loan amount' },
        { name: 'r', description: 'Interest rate per period' },
        { name: 'n', description: 'Total number of payments' }
      ],
      example: 'A $200,000 mortgage at 4% for 30 years results in monthly payments of $954.83',
      useCase: 'Common for mortgages, auto loans, and other installment loans'
    },
    Floating: {
      formula: 'P * (R + M) * T',
      explanation: 'Floating rate loans have interest rates that vary based on a reference rate plus a margin.',
      variables: [
        { name: 'P', description: 'Principal amount' },
        { name: 'R', description: 'Reference/Base rate (e.g., LIBOR)' },
        { name: 'M', description: 'Margin/Spread' },
        { name: 'T', description: 'Time period' }
      ],
      example: 'For $100,000 with LIBOR at 2% + 3% margin: $100,000 × (0.02 + 0.03) × 1 = $5,000 interest',
      useCase: 'Used in commercial lending and adjustable-rate mortgages'
    }
  };

  const [config, setConfig] = useState({
    interestMethod: 'Amortized',
    dayCountConvention: '30/360',
  });

  const handleSave = () => {
    console.log('Saving configuration:', config);
    alert('Configuration saved (dummy implementation)');
  };

  return (
    <div className="p-6">
      <h1 className="text-sm font-semibold mb-6">Cashflow Configuration</h1>
 <hr  className='border-t-2 border-gray-100'/>
      {/* Default Settings */}
      <div className="bg-white p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Default Interest Method
            </label>
            <select
              value={config.interestMethod}
              onChange={(e) => setConfig({...config, interestMethod: e.target.value})}
              className="w-full border border-gray-200 px-3 py-2 text-xs"
            >
              <option value="Simple">Simple Interest</option>
              <option value="Compound">Compound Interest</option>
              <option value="Amortized">Amortized</option>
              <option value="Floating">Floating Rate</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Day Count Convention
            </label>
            <select
              value={config.dayCountConvention}
              onChange={(e) => setConfig({...config, dayCountConvention: e.target.value})}
              className="w-full border border-gray-200 px-3 py-2 text-xs"
            >
              <option value="30/360">30/360</option>
              <option value="30/365">30/365</option>
              <option value="Actual/360">Actual/360</option>
              <option value="Actual/365">Actual/365</option>
            </select>
          </div>
        </div>
      </div>

      {/* Method Details */}
      <div className="bg-white p-6 mb-6">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-2">Formula</h4>
            <code className="block p-3 text-xs">
              {methodDetails[config.interestMethod].formula}
            </code>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Explanation</h4>
            <p className="text-gray-700 text-xs">
              {methodDetails[config.interestMethod].explanation}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Variables</h4>
            <ul className="list-disc pl-5 space-y-2">
              {methodDetails[config.interestMethod].variables.map((variable, index) => (
                <li key={index} className="text-gray-700 text-xs">
                  <span className="font-medium">{variable.name}</span>: {variable.description}
                </li>
              ))}
            </ul>
          </div>

          

          
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-gray-600 text-white text-xs hover:bg-gray-700"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default CashflowConfig;
