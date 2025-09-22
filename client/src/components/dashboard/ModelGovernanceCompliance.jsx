import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ModelGovernanceCompliance = () => {
  // Static data for Model Monitoring Alerts
  const modelMonitoringAlerts = [
    { month: 'Jan', pdDrift: 2, lgdCalibration: 1, modelPerformance: 0, total: 3 },
    { month: 'Feb', pdDrift: 3, lgdCalibration: 2, modelPerformance: 1, total: 6 },
    { month: 'Mar', pdDrift: 1, lgdCalibration: 0, modelPerformance: 2, total: 3 },
    { month: 'Apr', pdDrift: 4, lgdCalibration: 1, modelPerformance: 1, total: 6 },
    { month: 'May', pdDrift: 2, lgdCalibration: 3, modelPerformance: 0, total: 5 },
    { month: 'Jun', pdDrift: 1, lgdCalibration: 1, modelPerformance: 1, total: 3 }
  ];


  return (
    <div className="bg-white p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Model Governance & Compliance</h2>
      
      {/* Model Monitoring Alerts */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Model Monitoring Alerts</h3>
        <div className="bg-gray-50 p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={modelMonitoringAlerts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                formatter={(value, name) => [value, name]}
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: 'white', fontSize: '12px' }}
              />
              <Legend />
              <Bar dataKey="pdDrift" stackId="a" fill="#ff0000" name="PD Drift" />
              <Bar dataKey="lgdCalibration" stackId="a" fill="#ff7300" name="LGD Calibration" />
              <Bar dataKey="modelPerformance" stackId="a" fill="#ffbb28" name="Model Performance" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ModelGovernanceCompliance;