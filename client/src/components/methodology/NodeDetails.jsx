import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCube,
  faBalanceScale,
  faGlobeAmericas,
  faDatabase
} from '@fortawesome/free-solid-svg-icons';

const NodeDetails = ({ nodeId }) => {
  const details = {
    core: (
      <div className="space-y-4">
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h4 className="font-bold text-indigo-800 mb-2">
            <FontAwesomeIcon icon={faCube} className="mr-2" />
            Single Factor Model
          </h4>
          <p className="text-sm">All systematic risk captured through one economic factor (Z) that follows standard normal distribution.</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h4 className="font-bold text-indigo-800 mb-2">
            <FontAwesomeIcon icon={faBalanceScale} className="mr-2" />
            Asset Value Approach
          </h4>
          <p className="text-sm">Default occurs when a borrower's asset value falls below their debt threshold.</p>
        </div>
      </div>
    ),
    components: (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-bold text-blue-800 mb-2">
            <FontAwesomeIcon icon={faGlobeAmericas} className="mr-2" />
            Systematic Risk Factor (Z)
          </h4>
          <p className="text-sm">Represents macroeconomic conditions affecting all borrowers (~N(0,1)).</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-bold text-blue-800 mb-2">
            <FontAwesomeIcon icon={faDatabase} className="mr-2" />
            Idiosyncratic Risk (ε)
          </h4>
          <p className="text-sm">Firm-specific risk component that is independent across borrowers (~N(0,1)).</p>
        </div>
      </div>
    ),
    inputs: (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-bold text-green-800 mb-2">TTC PD</h4>
          <p className="text-sm">Through-The-Cycle Probability of Default (7.56% to 100% across DPD buckets).</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-bold text-green-800 mb-2">Asset Correlation</h4>
          <p className="text-sm">Basel prescribed values (ρ = 0.03-0.16).</p>
        </div>
      </div>
    ),
    calculation: (
      <div className="space-y-4">
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-bold text-purple-800 mb-2">Vasicek Formula</h4>
          <code className="block bg-white p-3 rounded text-sm">PD_PIT(z) = Φ((Φ⁻¹(PD_TTC)-√ρ*z)/√(1-ρ))</code>
          <p className="text-sm mt-2">Conditional PD given the economic state (z).</p>
        </div>
      </div>
    ),
    scenarios: (
      <div className="space-y-4">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-bold text-yellow-800 mb-2">Scenario Weights</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-100 p-2 rounded text-center">
              <div className="font-bold">Base</div>
              <div>50%</div>
            </div>
            <div className="bg-green-100 p-2 rounded text-center">
              <div className="font-bold">Best</div>
              <div>11.54%</div>
            </div>
            <div className="bg-red-100 p-2 rounded text-center">
              <div className="font-bold">Worst</div>
              <div>38.46%</div>
            </div>
          </div>
        </div>
      </div>
    ),
    output: (
      <div className="space-y-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <h4 className="font-bold text-red-800 mb-2">PIT PD</h4>
          <p className="text-sm">Economic cycle-adjusted probability of default.</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <h4 className="font-bold text-red-800 mb-2">Scenario-weighted PD</h4>
          <p className="text-sm">Probability-weighted average across scenarios.</p>
        </div>
      </div>
    )
  };

  return details[nodeId] || null;
};

export default NodeDetails; 