import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../utils/Api';

// Import components
import QuickActions from '../components/dashboard/QuickActions';
import ECLTrend from '../components/dashboard/ECLTrend';
import PortfolioSummary from '../components/dashboard/PortfolioSummary';
import ProductSegmentation from '../components/dashboard/ProductSegmentation';
import ECLByProduct from '../components/dashboard/ECLByProduct';
import LossAllowanceReport from '../components/dashboard/LossAllowanceReport';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latestRun, setLatestRun] = useState(null);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [productSegmentation, setProductSegmentation] = useState([]);
  const [eclTrends, setEclTrends] = useState([]);
  const [lossAllowanceReport, setLossAllowanceReport] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get latest approved run
      const latestRunResponse = await axios.get(`${API_URL}/dashboard/latest-approved-run`);
      const latestRunData = latestRunResponse.data.data;
      console.log('Latest Run Data:', latestRunData);
      
      // Ensure date is in YYYY-MM-DD format
      if (latestRunData) {
        latestRunData.date = new Date(latestRunData.date).toISOString().split('T')[0];
      }
      
      setLatestRun(latestRunData);

      // Get ECL trends - last 12 approved runs
      const trendsResponse = await axios.get(`${API_URL}/dashboard/ecl-trends`);
      const trendsData = trendsResponse.data.data;
      
      console.log('Raw ECL Trends Data:', trendsData);

      // Sort the data by date in ascending order and ensure ECL values are numbers
      const sortedTrends = trendsData
        .map(trend => ({
          ...trend,
          total_12m_ecl_ncy: Number(trend.total_12m_ecl_ncy) || 0
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      console.log('Processed ECL Trends Data:', sortedTrends);

      setEclTrends(sortedTrends.map(trend => ({
        date: trend.date,
        run_key: trend.run_key,
        ecl_amount: trend.total_12m_ecl_ncy
      })));

      if (latestRunData) {
        // Get portfolio summary
        console.log('Fetching portfolio summary with params:', {
          run_key: latestRunData.run_key,
          date: latestRunData.date
        });
        const portfolioResponse = await axios.get(`${API_URL}/dashboard/portfolio-summary`, {
          params: {
            run_key: latestRunData.run_key,
            date: latestRunData.date
          }
        });
        console.log('Portfolio Summary Response:', portfolioResponse.data);
        setPortfolioSummary(portfolioResponse.data.data);

        // Get product segmentation
        const segmentationResponse = await axios.get(`${API_URL}/dashboard/product-segmentation`, {
          params: {
            run_key: latestRunData.run_key,
            date: latestRunData.date
          }
        });
        setProductSegmentation(segmentationResponse.data.data);

        // Get Loss Allowance Report
        const lossAllowanceResponse = await axios.get(`${API_URL}/dashboard/loss-allowance-report`, {
          params: {
            run_key: latestRunData.run_key,
            date: latestRunData.date
          }
        });
        setLossAllowanceReport(lossAllowanceResponse.data.data);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Debug: Log ECL trends whenever they change
  useEffect(() => {
    console.log('Current ECL Trends State:', eclTrends);
  }, [eclTrends]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-xs">Error loading dashboard data: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      {/* Header with Last Calculation Date */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-sm font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 text-xs">Welcome to your ECL Management Dashboard</p>
        </div>
        <div className="text-xs text-gray-500">
          Last Calculation: {latestRun?.date && new Date(latestRun.date).toLocaleDateString()}
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Portfolio Summary - Full Width */}
      <div className="mb-6">
        <PortfolioSummary portfolioSummary={portfolioSummary} />
      </div>

      {/* ECL Trend */}
      <div className="mb-6">
        <ECLTrend eclTrends={eclTrends} />
      </div>

      {/* Product Segmentation and ECL by Product */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <ProductSegmentation 
          productSegmentation={productSegmentation}
          portfolioSummary={portfolioSummary}
        />
        <ECLByProduct 
          productSegmentation={productSegmentation}
          portfolioSummary={portfolioSummary}
        />
      </div>

      {/* Loss Allowance Report */}
      <LossAllowanceReport lossAllowanceReport={lossAllowanceReport} />
    </div>
  );
};

export default Dashboard; 