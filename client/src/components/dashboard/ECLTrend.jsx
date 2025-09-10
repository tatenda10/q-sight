import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const ECLTrend = ({ eclTrends }) => {
  if (!eclTrends || eclTrends.length === 0) return null;

  // Calculate the maximum ECL value for scaling
  const maxEcl = Math.max(...eclTrends.map(t => t.ecl_amount));
  
  // Calculate appropriate scale intervals
  const scaleMax = Math.ceil(maxEcl / 200000) * 200000;
  const intervals = [1, 0.8, 0.6, 0.4, 0.2, 0];

  return (
    <div className="bg-white p-6 border border-gray-100 col-span-2">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">12-Month ECL Trend</h3>
      <div className="h-96 flex flex-col">
        <div className="flex flex-1 mb-8">
          {/* Y-axis */}
          <div className="w-40 flex flex-col">
            <div className="h-6 pl-2 text-xs font-bold text-gray-700">Amount (USD)</div>
            <div className="flex-1 flex flex-col justify-between pr-4 text-xs text-gray-600 font-bold">
              {intervals.map((fraction) => (
                <div key={fraction} className="flex items-center justify-end h-0">
                  {formatCurrency(scaleMax * fraction)}
                </div>
              ))}
            </div>
          </div>

          {/* Chart area */}
          <div className="flex-1 relative" style={{ minHeight: '300px' }}>
            {/* Grid lines and background boxes */}
            <div className="absolute inset-0">
              {intervals.slice(0, -1).map((fraction, index) => (
                <div key={`box-${index}`}>
                  {/* Background box */}
                  <div
                    className={`absolute left-0 right-0 ${
                      index % 2 === 0 ? 'bg-gray-25' : 'bg-white'
                    } border-b border-gray-100`}
                    style={{ 
                      top: `${(1 - fraction) * 100}%`,
                      height: `${20}%`
                    }}
                  />
                  {/* Grid line */}
                  <div
                    className={`absolute left-0 right-0 ${
                      fraction === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-200'
                    }`}
                    style={{ top: `${(1 - fraction) * 100}%` }}
                  />
                </div>
              ))}
              {/* Bottom grid line */}
              <div className="absolute left-0 right-0 bottom-0 border-t-2 border-gray-300" />
            </div>

            {/* Bars container */}
            <div className="absolute inset-0 flex items-end justify-between px-2 pb-8">
              {eclTrends.map((point, index) => {
                const heightPercentage = Math.max((point.ecl_amount / scaleMax) * 100, 0.5);
                const barWidth = Math.min(Math.floor(90 / eclTrends.length), 60);
                
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center justify-end h-full"
                    style={{ width: `${90 / eclTrends.length}%` }}
                  >
                    {/* Bar */}
                    <div
                      className="bg-gray-500 hover:bg-gray-600 transition-colors cursor-pointer group relative"
                      style={{
                        height: `${heightPercentage}%`,
                        width: `${barWidth}px`,
                        minHeight: '2px'
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10 pointer-events-none">
                        <div className="font-semibold mb-1">
                          {new Date(point.date).toLocaleDateString()}
                        </div>
                        <div>Run Key: {point.run_key}</div>
                        <div>ECL: {formatCurrency(point.ecl_amount)}</div>
                        {/* Tooltip arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
              {eclTrends.map((point, index) => (
                <div
                  key={index}
                  className="text-xs text-gray-700 text-center font-bold"
                  style={{ 
                    width: `${90 / eclTrends.length}%`
                  }}
                >
                  {new Date(point.date).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* X-axis title */}
        <div className="text-center text-xs font-bold text-gray-700">Calculation Date</div>
      </div>
    </div>
  );
};

export default ECLTrend;