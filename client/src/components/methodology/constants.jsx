import React from 'react';

export const nodes = [
  {
    id: 'overview',
    label: 'Overview',
    content: (
      <div>
        <h2>Overview</h2>
        <p>This section provides an overview of the methodology used for calculating Probability of Default (PD) in credit risk modeling.</p>
      </div>
    ),
  },
  {
    id: 'key-components',
    label: 'Key Components',
    content: (
      <div>
        <h2>Key Components</h2>
        <ul>
          <li>Systematic Risk (Z): Follows a standard normal distribution.</li>
          <li>Idiosyncratic Risk (ε): Follows a standard normal distribution.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'calculation-steps',
    label: 'Calculation Steps',
    content: (
      <div>
        <h2>Calculation Steps</h2>
        <ol>
          <li>Convert Through-The-Cycle PD to a default threshold.</li>
          <li>Model asset returns.</li>
          <li>Calculate Point-in-Time PD.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'implementation',
    label: 'Implementation',
    content: (
      <div>
        <h2>Implementation</h2>
        <p>Implementation considerations include asset correlation values based on Basel guidelines and economic scenarios derived from IMF forecasts.</p>
      </div>
    ),
  },
]; 