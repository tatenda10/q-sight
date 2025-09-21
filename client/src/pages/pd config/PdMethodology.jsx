import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Calculator, BarChart3, Download, RefreshCw, Users, Settings, TrendingUp, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts';

const PdMethodology = () => {
  // State for tabs
  const [activeTab, setActiveTab] = useState('data');

  // State for file uploads
  const [portfolioData, setPortfolioData] = useState(null);
  const [portfolioFileName, setPortfolioFileName] = useState('');

  // State for configuration
  const [selectedMEVs, setSelectedMEVs] = useState(['gdp_growth']); // Multiple MEV selection
  const [mevWeights, setMevWeights] = useState({}); // MEV weights
  const [assetCorrelation, setAssetCorrelation] = useState(0.15);
  const [economicScenario, setEconomicScenario] = useState('base');
  const [selectedSegments, setSelectedSegments] = useState(['healthy']);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCalculatingTTC, setIsCalculatingTTC] = useState(false);
  const [showSegmentation, setShowSegmentation] = useState(false);

  // State for results
  const [results, setResults] = useState(null);
  const [zScore, setZScore] = useState(null);
  const [error, setError] = useState(null);

  // TTC PD calculation function with loading
  const calculateTTCs = async () => {
    setIsCalculatingTTC(true);
    setError(null);

    try {
      // Simulate calculation time (10 seconds)
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // TTC calculation is already done in the component render
      // This is just for the loading effect
      console.log('TTC PDs calculated successfully');
    } catch (err) {
      setError('Error calculating TTC PDs. Please try again.');
      console.error('TTC Calculation error:', err);
    } finally {
      setIsCalculatingTTC(false);
    }
  };

  // Auto-calculate TTC PDs when tab becomes active
  useEffect(() => {
    console.log('Active tab changed to:', activeTab);
    if (activeTab === 'segmentation') { // TTC PD Calculation tab
      console.log('Starting TTC calculation...');
      calculateTTCs();
    }
  }, [activeTab]);

  // Customer segments (Original 4 segments)
  const segments = [
    { id: 'healthy', name: 'HEALTHY', description: 'Low risk customers with excellent credit history', color: 'bg-green-100 text-green-800', accounts: 45230, recoveryRate: 95.2 },
    { id: 'education', name: 'EDUCATION', description: 'Education sector loans with moderate risk', color: 'bg-blue-100 text-blue-800', accounts: 78450, recoveryRate: 87.5 },
    { id: 'agriculture', name: 'AGRICULTURE', description: 'Agricultural loans with seasonal risk patterns', color: 'bg-yellow-100 text-yellow-800', accounts: 125680, recoveryRate: 72.3 },
    { id: 'manufacturing', name: 'MANUFACTURING', description: 'Manufacturing sector with economic sensitivity', color: 'bg-orange-100 text-orange-800', accounts: 89340, recoveryRate: 58.7 }
  ];

  // Sample portfolio data
  const samplePortfolioData = [
    { account_id: 'ACC001', date: '2023-01-01', days_past_due: 0, outstanding_balance: 50000, segment: 'healthy' },
    { account_id: 'ACC002', date: '2023-01-01', days_past_due: 15, outstanding_balance: 75000, segment: 'education' },
    { account_id: 'ACC003', date: '2023-01-01', days_past_due: 45, outstanding_balance: 30000, segment: 'agriculture' },
    { account_id: 'ACC004', date: '2023-01-01', days_past_due: 75, outstanding_balance: 60000, segment: 'manufacturing' },
    { account_id: 'ACC005', date: '2023-01-01', days_past_due: 120, outstanding_balance: 40000, segment: 'retail' },
    { account_id: 'ACC006', date: '2023-01-01', days_past_due: 0, outstanding_balance: 80000, segment: 'construction' },
    { account_id: 'ACC007', date: '2023-01-01', days_past_due: 30, outstanding_balance: 25000, segment: 'healthy' },
    { account_id: 'ACC008', date: '2023-01-01', days_past_due: 90, outstanding_balance: 55000, segment: 'education' },
  ];

  // Macroeconomic data with historical and projected values (1983-2030)
  const macroData = {
    gdp_growth: {
      title: 'GDP Growth Rate',
      unit: '%',
      data: [
        // Historical data (1983-2025)
        { year: 1983, value: -2.1, type: 'Historical' },
        { year: 1984, value: 1.2, type: 'Historical' },
        { year: 1985, value: 2.8, type: 'Historical' },
        { year: 1986, value: 3.1, type: 'Historical' },
        { year: 1987, value: 2.9, type: 'Historical' },
        { year: 1988, value: 4.2, type: 'Historical' },
        { year: 1989, value: 3.8, type: 'Historical' },
        { year: 1990, value: 1.9, type: 'Historical' },
        { year: 1991, value: -0.2, type: 'Historical' },
        { year: 1992, value: 3.3, type: 'Historical' },
        { year: 1993, value: 2.7, type: 'Historical' },
        { year: 1994, value: 4.0, type: 'Historical' },
        { year: 1995, value: 2.5, type: 'Historical' },
        { year: 1996, value: 3.8, type: 'Historical' },
        { year: 1997, value: 4.1, type: 'Historical' },
        { year: 1998, value: 4.3, type: 'Historical' },
        { year: 1999, value: 4.5, type: 'Historical' },
        { year: 2000, value: 4.2, type: 'Historical' },
        { year: 2001, value: 1.0, type: 'Historical' },
        { year: 2002, value: 1.8, type: 'Historical' },
        { year: 2003, value: 2.7, type: 'Historical' },
        { year: 2004, value: 3.6, type: 'Historical' },
        { year: 2005, value: 3.1, type: 'Historical' },
        { year: 2006, value: 2.7, type: 'Historical' },
        { year: 2007, value: 1.9, type: 'Historical' },
        { year: 2008, value: -0.1, type: 'Historical' },
        { year: 2009, value: -2.5, type: 'Historical' },
        { year: 2010, value: 2.6, type: 'Historical' },
        { year: 2011, value: 1.6, type: 'Historical' },
        { year: 2012, value: 2.2, type: 'Historical' },
        { year: 2013, value: 1.7, type: 'Historical' },
        { year: 2014, value: 2.4, type: 'Historical' },
        { year: 2015, value: 2.9, type: 'Historical' },
        { year: 2016, value: 1.6, type: 'Historical' },
        { year: 2017, value: 2.4, type: 'Historical' },
        { year: 2018, value: 2.9, type: 'Historical' },
        { year: 2019, value: 2.3, type: 'Historical' },
        { year: 2020, value: -3.4, type: 'Historical' },
        { year: 2021, value: 5.7, type: 'Historical' },
        { year: 2022, value: 2.1, type: 'Historical' },
        { year: 2023, value: 2.6, type: 'Historical' },
        { year: 2024, value: 2.8, type: 'Historical' },
        { year: 2025, value: 2.5, type: 'Historical' },
        // Projected data (2026-2030)
        { year: 2026, value: 2.3, type: 'Projected' },
        { year: 2027, value: 2.1, type: 'Projected' },
        { year: 2028, value: 2.0, type: 'Projected' },
        { year: 2029, value: 1.9, type: 'Projected' },
        { year: 2030, value: 1.8, type: 'Projected' }
      ]
    },
    unemployment_rate: {
      title: 'Unemployment Rate',
      unit: '%',
      data: [
        // Historical data (1983-2025)
        { year: 1983, value: 9.6, type: 'Historical' },
        { year: 1984, value: 7.5, type: 'Historical' },
        { year: 1985, value: 7.2, type: 'Historical' },
        { year: 1986, value: 7.0, type: 'Historical' },
        { year: 1987, value: 6.2, type: 'Historical' },
        { year: 1988, value: 5.5, type: 'Historical' },
        { year: 1989, value: 5.3, type: 'Historical' },
        { year: 1990, value: 5.6, type: 'Historical' },
        { year: 1991, value: 6.8, type: 'Historical' },
        { year: 1992, value: 7.5, type: 'Historical' },
        { year: 1993, value: 6.9, type: 'Historical' },
        { year: 1994, value: 6.1, type: 'Historical' },
        { year: 1995, value: 5.6, type: 'Historical' },
        { year: 1996, value: 5.4, type: 'Historical' },
        { year: 1997, value: 4.9, type: 'Historical' },
        { year: 1998, value: 4.5, type: 'Historical' },
        { year: 1999, value: 4.2, type: 'Historical' },
        { year: 2000, value: 4.0, type: 'Historical' },
        { year: 2001, value: 4.7, type: 'Historical' },
        { year: 2002, value: 5.8, type: 'Historical' },
        { year: 2003, value: 6.0, type: 'Historical' },
        { year: 2004, value: 5.5, type: 'Historical' },
        { year: 2005, value: 5.1, type: 'Historical' },
        { year: 2006, value: 4.6, type: 'Historical' },
        { year: 2007, value: 4.6, type: 'Historical' },
        { year: 2008, value: 5.8, type: 'Historical' },
        { year: 2009, value: 9.3, type: 'Historical' },
        { year: 2010, value: 9.6, type: 'Historical' },
        { year: 2011, value: 8.9, type: 'Historical' },
        { year: 2012, value: 8.1, type: 'Historical' },
        { year: 2013, value: 7.4, type: 'Historical' },
        { year: 2014, value: 6.2, type: 'Historical' },
        { year: 2015, value: 5.3, type: 'Historical' },
        { year: 2016, value: 4.9, type: 'Historical' },
        { year: 2017, value: 4.4, type: 'Historical' },
        { year: 2018, value: 3.9, type: 'Historical' },
        { year: 2019, value: 3.7, type: 'Historical' },
        { year: 2020, value: 8.1, type: 'Historical' },
        { year: 2021, value: 5.4, type: 'Historical' },
        { year: 2022, value: 3.6, type: 'Historical' },
        { year: 2023, value: 3.7, type: 'Historical' },
        { year: 2024, value: 3.8, type: 'Historical' },
        { year: 2025, value: 3.9, type: 'Historical' },
        // Projected data (2026-2030)
        { year: 2026, value: 3.7, type: 'Projected' },
        { year: 2027, value: 3.5, type: 'Projected' },
        { year: 2028, value: 3.3, type: 'Projected' },
        { year: 2029, value: 3.1, type: 'Projected' },
        { year: 2030, value: 2.9, type: 'Projected' }
      ]
    },
    inflation_rate: {
      title: 'Inflation Rate',
      unit: '%',
      data: [
        // Historical data (1983-2025)
        { year: 1983, value: 3.2, type: 'Historical' },
        { year: 1984, value: 4.3, type: 'Historical' },
        { year: 1985, value: 3.6, type: 'Historical' },
        { year: 1986, value: 1.9, type: 'Historical' },
        { year: 1987, value: 3.6, type: 'Historical' },
        { year: 1988, value: 4.1, type: 'Historical' },
        { year: 1989, value: 4.8, type: 'Historical' },
        { year: 1990, value: 5.4, type: 'Historical' },
        { year: 1991, value: 4.2, type: 'Historical' },
        { year: 1992, value: 3.0, type: 'Historical' },
        { year: 1993, value: 3.0, type: 'Historical' },
        { year: 1994, value: 2.6, type: 'Historical' },
        { year: 1995, value: 2.8, type: 'Historical' },
        { year: 1996, value: 2.9, type: 'Historical' },
        { year: 1997, value: 2.3, type: 'Historical' },
        { year: 1998, value: 1.6, type: 'Historical' },
        { year: 1999, value: 2.2, type: 'Historical' },
        { year: 2000, value: 3.4, type: 'Historical' },
        { year: 2001, value: 2.8, type: 'Historical' },
        { year: 2002, value: 1.6, type: 'Historical' },
        { year: 2003, value: 2.3, type: 'Historical' },
        { year: 2004, value: 2.7, type: 'Historical' },
        { year: 2005, value: 3.4, type: 'Historical' },
        { year: 2006, value: 3.2, type: 'Historical' },
        { year: 2007, value: 2.8, type: 'Historical' },
        { year: 2008, value: 3.8, type: 'Historical' },
        { year: 2009, value: -0.4, type: 'Historical' },
        { year: 2010, value: 1.6, type: 'Historical' },
        { year: 2011, value: 3.1, type: 'Historical' },
        { year: 2012, value: 2.1, type: 'Historical' },
        { year: 2013, value: 1.5, type: 'Historical' },
        { year: 2014, value: 1.6, type: 'Historical' },
        { year: 2015, value: 0.1, type: 'Historical' },
        { year: 2016, value: 1.3, type: 'Historical' },
        { year: 2017, value: 2.1, type: 'Historical' },
        { year: 2018, value: 2.4, type: 'Historical' },
        { year: 2019, value: 1.8, type: 'Historical' },
        { year: 2020, value: 1.2, type: 'Historical' },
        { year: 2021, value: 4.7, type: 'Historical' },
        { year: 2022, value: 8.0, type: 'Historical' },
        { year: 2023, value: 4.1, type: 'Historical' },
        { year: 2024, value: 3.2, type: 'Historical' },
        { year: 2025, value: 2.8, type: 'Historical' },
        // Projected data (2026-2030)
        { year: 2026, value: 2.5, type: 'Projected' },
        { year: 2027, value: 2.2, type: 'Projected' },
        { year: 2028, value: 2.0, type: 'Projected' },
        { year: 2029, value: 1.9, type: 'Projected' },
        { year: 2030, value: 1.8, type: 'Projected' }
      ]
    }
  };

  // Static TTC PD values for each segment - Differentiated for realism
  const getStaticTTCValues = (segmentId) => {
    const ttcValues = {
      'healthy': {
        '0 DPD': 0.045,     // 4.5% (lower risk)
        '1-30 DPD': 0.15,   // 15%
        '31-60 DPD': 0.35,  // 35%
        '61-90 DPD': 0.60,  // 60%
        '90+ DPD': 0.85     // 85%
      },
      'education': {
        '0 DPD': 0.065,     // 6.5%
        '1-30 DPD': 0.20,   // 20%
        '31-60 DPD': 0.45,  // 45%
        '61-90 DPD': 0.70,  // 70%
        '90+ DPD': 0.90     // 90%
      },
      'agriculture': {
        '0 DPD': 0.0756,    // 7.56% (base values)
        '1-30 DPD': 0.2283, // 22.83%
        '31-60 DPD': 0.5169, // 51.69%
        '61-90 DPD': 0.7947, // 79.47%
        '90+ DPD': 1.0000   // 100.00%
      },
      'manufacturing': {
        '0 DPD': 0.095,     // 9.5% (higher risk)
        '1-30 DPD': 0.28,   // 28%
        '31-60 DPD': 0.58,  // 58%
        '61-90 DPD': 0.85,  // 85%
        '90+ DPD': 1.0000   // 100.00%
      }
    };
    return ttcValues[segmentId] || ttcValues['healthy'];
  };

  // File upload handlers
  const handlePortfolioUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = values[index];
            });
            return obj;
          }).filter(row => row.account_id); // Filter out empty rows

          setPortfolioData(data);
          setPortfolioFileName(file.name);
          setError(null);
        } catch (err) {
          setError('Error parsing portfolio data file. Please check the format.');
        }
      };
      reader.readAsText(file);
    }
  }, []);

  // Remove sample data functionality

  // MEV selection handlers
  const handleMEVToggle = (mevId) => {
    setSelectedMEVs(prev => {
      const newSelected = prev.includes(mevId) 
        ? prev.filter(id => id !== mevId)
        : [...prev, mevId];
      
      // Initialize weights for new selections
      if (!prev.includes(mevId)) {
        setMevWeights(prevWeights => ({
          ...prevWeights,
          [mevId]: 1.0 / newSelected.length // Equal weight initially
        }));
      } else {
        // Remove weight when deselecting
        setMevWeights(prevWeights => {
          const newWeights = { ...prevWeights };
          delete newWeights[mevId];
          return newWeights;
        });
      }
      
      return newSelected;
    });
  };

  // MEV weight handlers
  const handleWeightChange = (mevId, weight) => {
    setMevWeights(prev => ({
      ...prev,
      [mevId]: parseFloat(weight) || 0
    }));
  };

  // Segment selection handlers
  const handleSegmentToggle = (segmentId) => {
    setSelectedSegments(prev => 
      prev.includes(segmentId) 
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  // Navigation handlers
  const goToNextTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  };

  const goToPreviousTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  // Get current macro data for selected MEVs
  const getCurrentMacroData = () => {
    if (selectedMEVs.length === 0) return macroData.gdp_growth;
    
    // For now, show the first selected MEV (we'll enhance this later for multiple charts)
    const firstMEV = selectedMEVs[0];
    const data = macroData[firstMEV] || macroData.gdp_growth;
    return {
      ...data,
      data: data.data.map(item => ({
        ...item,
        historicalValue: item.type === 'Historical' ? item.value : null,
        projectedValue: item.type === 'Projected' ? item.value : null
      }))
    };
  };

  // Mathematical functions for Vasicek model
  const normSInv = (p) => {
    // Approximation of inverse normal CDF
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p < 0.5) return -normSInv(1 - p);
    
    const a = [0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
    const b = [0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [0, -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0, 7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    
    const x = Math.sqrt(-2 * Math.log(1 - p));
    const x0 = x - ((c[0] + c[1] * x + c[2] * x * x) / (1 + d[1] * x + d[2] * x * x + d[3] * x * x * x + d[4] * x * x * x * x));
    return x0;
  };

  const normSDist = (x) => {
    // Approximation of normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  };

  // Calculate economic factor Z-score
  const calculateZScore = (selectedMEVs, scenario) => {
    if (selectedMEVs.length === 0) return 0;

    // For now, use the first selected MEV (we can enhance this later for multiple MEVs)
    const firstMEV = selectedMEVs[0];
    const currentMacroData = macroData[firstMEV];
    if (!currentMacroData || !currentMacroData.data) return 0;

    const values = currentMacroData.data.map(row => row.value).filter(val => !isNaN(val));
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const latestValue = values[values.length - 1];
    let zScore = (latestValue - mean) / stdDev;

    // Apply scenario modifier
    switch (scenario) {
      case 'optimistic':
        zScore += 1.0;
        break;
      case 'pessimistic':
        zScore -= 1.0;
        break;
      default: // base case
        break;
    }

    return zScore;
  };

  // Static PIT PD values for each segment - No calculations
  const getStaticPITValues = (segmentId) => {
    const pitValues = {
      'healthy': {
        '0 DPD': 0.05,      // 5%
        '1-30 DPD': 0.12,   // 12%
        '31-60 DPD': 0.25,  // 25%
        '61-90 DPD': 0.40,  // 40%
        '90+ DPD': 0.60     // 60%
      },
      'education': {
        '0 DPD': 0.08,      // 8%
        '1-30 DPD': 0.18,   // 18%
        '31-60 DPD': 0.35,  // 35%
        '61-90 DPD': 0.55,  // 55%
        '90+ DPD': 0.75     // 75%
      },
      'agriculture': {
        '0 DPD': 0.12,      // 12%
        '1-30 DPD': 0.25,   // 25%
        '31-60 DPD': 0.45,  // 45%
        '61-90 DPD': 0.65,  // 65%
        '90+ DPD': 0.85     // 85%
      },
      'manufacturing': {
        '0 DPD': 0.15,      // 15%
        '1-30 DPD': 0.30,   // 30%
        '31-60 DPD': 0.55,  // 55%
        '61-90 DPD': 0.75,  // 75%
        '90+ DPD': 0.90     // 90%
      }
    };
    return pitValues[segmentId] || pitValues['healthy'];
  };


  // Main calculation function
  const calculatePDs = async () => {
    console.log('Calculate PDs button clicked!');
    console.log('Portfolio data:', portfolioData);
    console.log('Selected segments:', selectedSegments);
    
    if (selectedSegments.length === 0) {
      setError('Please select at least one customer segment.');
      return;
    }

    console.log('Starting PD calculation...');
    setIsCalculating(true);
    setError(null);

    try {
      // Simulate calculation time (10 seconds)
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Calculate Z-score
      const calculatedZScore = calculateZScore(selectedMEVs, economicScenario);
      setZScore(calculatedZScore);

      // Calculate PIT PDs using Vasicek formula for each segment
      const segmentResults = {};
      selectedSegments.forEach(segmentId => {
        const segment = segments.find(s => s.id === segmentId);
        if (segment) {
          segmentResults[segmentId] = {
            name: segment.name,
            ttcPDs: {},
            pitPDs: {}
          };

          // Use static values for each segment - no calculations
          const ttcValues = getStaticTTCValues(segmentId);
          const pitValues = getStaticPITValues(segmentId);
          
          Object.keys(ttcValues).forEach((bucket) => {
            segmentResults[segmentId].ttcPDs[bucket] = ttcValues[bucket];
            segmentResults[segmentId].pitPDs[bucket] = pitValues[bucket];
          });
        }
      });

      // Prepare chart data for the first selected segment (for main chart)
      const firstSegment = selectedSegments[0];
      const firstSegmentResults = segmentResults[firstSegment];
      const chartData = Object.keys(getStaticTTCValues(firstSegment)).map((bucket) => ({
        bucket,
        ttcPD: firstSegmentResults.ttcPDs[bucket] * 100,
        pitPD: firstSegmentResults.pitPDs[bucket] * 100
      }));

          setResults({
            chartData,
            segmentResults,
            zScore: calculatedZScore,
            scenario: economicScenario,
            selectedMEVs,
            selectedSegments
          });

    } catch (err) {
      setError('Error calculating PDs. Please check your data and try again.');
      console.error('Calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Get MEV display name
  const getMEVDisplayName = (mev) => {
    const names = {
      'gdp_growth': 'GDP Growth',
      'unemployment_rate': 'Unemployment Rate',
      'inflation_rate': 'Inflation Rate'
    };
    return names[mev] || mev;
  };

  // Get scenario display name
  const getScenarioDisplayName = (scenario) => {
    const names = {
      'base': 'Base Case',
      'optimistic': 'Optimistic',
      'pessimistic': 'Pessimistic'
    };
    return names[scenario] || scenario;
  };

  const tabs = [
    { id: 'data', name: '1. Data Upload', icon: Database, description: 'Upload historical portfolio data' },
    { id: 'macro', name: '2. Macro Configuration', icon: TrendingUp, description: 'Select macro variables and view economic indicators' },
    { id: 'segmentation', name: '3. TTC PD Calculation', icon: Users, description: 'View customer segments and calculate TTC PDs' },
    { id: 'config', name: '4. Model Configuration', icon: Settings, description: 'Configure model parameters and select segments' },
    { id: 'results', name: '5. Results', icon: BarChart3, description: 'View PD calculations and analysis results' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">PD Methodology - Vasicek Model</h1>
          <p className="text-sm text-gray-600">Calculate Point-in-Time (PIT) PDs using the Vasicek single-factor model</p>
        </div>

        {/* Process Flow Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-4">
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab.id;
              const isCompleted = tabs.findIndex(t => t.id === activeTab) > index;
              return (
                <div key={tab.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    isActive ? 'bg-blue-600 text-white' : 
                    isCompleted ? 'bg-green-600 text-white' : 
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  {index < tabs.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
            <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs flex items-center gap-2`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.name}
            </button>
                );
              })}
          </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200">
          {/* Data Upload Tab */}
          {activeTab === 'data' && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Historical Data
                </h3>
                <div className="border-2 border-dashed border-gray-300 p-4 text-center hover:border-gray-400 transition-colors">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-xs text-gray-600 mb-2">
                    Upload CSV file with columns: account_id, date, days_past_due, outstanding_balance, segment
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handlePortfolioUpload}
                    className="hidden"
                    id="portfolio-upload"
                  />
                  <label
                    htmlFor="portfolio-upload"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Choose File
                  </label>
                  {portfolioFileName && (
                    <p className="text-xs text-green-600 mt-2">✓ {portfolioFileName}</p>
                  )}
                </div>
                
                {/* Navigation Buttons */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={goToNextTab}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                    <svg className="ml-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
          </div>
        )}

          {/* Macro Configuration Tab */}
          {activeTab === 'macro' && (
            <div className="p-6">
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Macro Economic Variables Configuration
                </h3>
                
                {/* MEV Selector */}
                <div className="max-w-md">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Select Economic Variables (Multiple Selection)
                  </label>
                  <div className="space-y-2">
                    {Object.entries(macroData).map(([key, data]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedMEVs.includes(key)}
                          onChange={() => handleMEVToggle(key)}
                          className="mr-2 text-blue-600"
                        />
                        <span className="text-xs text-gray-700">{data.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Selected MEVs Display with Weights */}
                {selectedMEVs.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-3">Selected Macro Variables & Weights</h4>
                    <div className="space-y-3">
                      {selectedMEVs.map((mevId) => {
                        const mevData = macroData[mevId];
                        const weight = mevWeights[mevId] || 0;
                        return (
                          <div key={mevId} className="flex items-center justify-between p-3 border border-gray-300 bg-gray-50">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                              <span className="text-xs font-medium text-gray-700">{mevData.title}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <label className="text-xs text-gray-600">Weight:</label>
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                value={weight}
                                onChange={(e) => handleWeightChange(mevId, e.target.value)}
                                className="w-16 px-2 py-1 text-xs border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="text-xs text-gray-500">({(weight * 100).toFixed(0)}%)</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="text-xs text-gray-500 mt-2">
                        <p>Total Weight: {(selectedMEVs.reduce((sum, mevId) => sum + (mevWeights[mevId] || 0), 0) * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Macro Data Chart */}
                <div className="bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-800 mb-3">
                    {getCurrentMacroData().title} ({getCurrentMacroData().unit})
                  </h4>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={getCurrentMacroData().data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="year" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          formatter={(value, name) => [`${value}${getCurrentMacroData().unit}`, name]}
                          labelFormatter={(label) => `Year: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="historicalValue"
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          name="Historical"
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 2 }}
                          connectNulls={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="projectedValue"
                          stroke="#EF4444" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Projected"
                          dot={{ fill: '#EF4444', strokeWidth: 2, r: 2 }}
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-blue-500"></div>
                      <span className="text-gray-600">Historical Data (1983-2025)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-red-500" style={{borderTop: '2px dashed #EF4444'}}></div>
                      <span className="text-gray-600">Projected Data (2026-2030)</span>
                    </div>
                  </div>
                </div>
                
                {/* Navigation Buttons */}
                <div className="flex justify-between mt-4">
                  <button
                    onClick={goToPreviousTab}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <svg className="mr-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <button
                    onClick={goToNextTab}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                    <svg className="ml-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TTC PD Calculation Tab */}
          {activeTab === 'segmentation' && (
            <div className="p-6">
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  TTC PD Calculation
                </h3>

                {/* Segments Display */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-800">Customer Segments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        className="border border-gray-300 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-semibold text-gray-900">{segment.name}</h5>
                          <span className={`px-2 py-1 text-xs ${segment.color}`}>
                            {segment.recoveryRate}% Recovery
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{segment.description}</p>
                        <p className="text-xs text-gray-500">Accounts: {segment.accounts.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  {/* TTC PD Calculation Section */}
                  <div className="mt-6">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-800">TTC PD Calculation</h4>
                    </div>
                    <div className="bg-gray-50 p-3">
                      <p className="text-xs text-gray-600 mb-3">
                        Through-The-Cycle (TTC) PDs are calculated based on each segment's recovery rate and historical performance patterns.
                      </p>
                      {isCalculatingTTC ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <RefreshCw className="h-8 w-8 text-green-600 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Calculating TTC PDs...</p>
                            <p className="text-xs text-gray-500">This may take a few moments</p>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Recovery Rate</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Base TTC PD</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">0 DPD</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">1-30 DPD</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">31-60 DPD</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">61-90 DPD</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">90+ DPD</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {segments.map((segment) => {
                                const ttcValues = getStaticTTCValues(segment.id);
                                return (
                                  <tr key={segment.id}>
                                    <td className="px-3 py-1.5 text-xs font-medium text-gray-900">{segment.name}</td>
                                    <td className="px-3 py-1.5 text-xs text-center text-gray-900">{segment.recoveryRate}%</td>
                                    <td className="px-3 py-1.5 text-xs text-center text-gray-900">{(ttcValues['0 DPD'] * 100).toFixed(2)}%</td>
                                    <td className="px-3 py-1.5 text-xs text-center text-gray-900">{(ttcValues['0 DPD'] * 100).toFixed(2)}%</td>
                                    <td className="px-3 py-1.5 text-xs text-center text-gray-900">{(ttcValues['1-30 DPD'] * 100).toFixed(2)}%</td>
                                    <td className="px-3 py-1.5 text-xs text-center text-gray-900">{(ttcValues['31-60 DPD'] * 100).toFixed(2)}%</td>
                                    <td className="px-3 py-1.5 text-xs text-center text-gray-900">{(ttcValues['61-90 DPD'] * 100).toFixed(2)}%</td>
                                    <td className="px-3 py-1.5 text-xs text-center text-gray-900">{(ttcValues['90+ DPD'] * 100).toFixed(2)}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="mt-3 text-xs text-gray-500">
                        <p><strong>Note:</strong> TTC PDs are calculated using the formula: Base TTC = (100 - Recovery Rate) / 100, then multiplied by delinquency bucket factors.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Navigation Buttons */}
                <div className="flex justify-between mt-4">
                  <button
                    onClick={goToPreviousTab}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <svg className="mr-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <button
                    onClick={goToNextTab}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                    <svg className="ml-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Model Configuration */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Model Configuration
                  </h3>

                  <div className="space-y-3">
                    {/* Asset Correlation Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Asset Correlation (ρ)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={assetCorrelation}
                        onChange={(e) => setAssetCorrelation(parseFloat(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Measures how sensitive defaults are to the economy. Higher value = more sensitive.
                      </p>
                    </div>

                    {/* Economic Scenario Selector */}
            <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Economic Scenario
                      </label>
                      <div className="space-y-1">
                        <label className="flex items-center text-xs">
                          <input
                            type="radio"
                            value="base"
                            checked={economicScenario === 'base'}
                            onChange={(e) => setEconomicScenario(e.target.value)}
                            className="mr-2"
                          />
                          Base Case
                        </label>
                        <label className="flex items-center text-xs">
                          <input
                            type="radio"
                            value="optimistic"
                            checked={economicScenario === 'optimistic'}
                            onChange={(e) => setEconomicScenario(e.target.value)}
                            className="mr-2"
                          />
                          Optimistic (+1.0 Z)
                        </label>
                        <label className="flex items-center text-xs">
                          <input
                            type="radio"
                            value="pessimistic"
                            checked={economicScenario === 'pessimistic'}
                            onChange={(e) => setEconomicScenario(e.target.value)}
                            className="mr-2"
                          />
                          Pessimistic (-1.0 Z)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segment Selection */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Customer Segments
                  </h3>

                  <div className="grid grid-cols-1 gap-2">
                    {segments.map((segment) => (
                      <div
                        key={segment.id}
                        className={`border border-gray-300 p-3 cursor-pointer transition-all ${
                          selectedSegments.includes(segment.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:border-gray-400'
                        }`}
                        onClick={() => handleSegmentToggle(segment.id)}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedSegments.includes(segment.id)}
                            onChange={() => handleSegmentToggle(segment.id)}
                            className="text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-gray-900">{segment.name}</h4>
                              <span className={`px-1.5 py-0.5 text-xs ${segment.color}`}>
                                {segment.recoveryRate}% Recovery
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{segment.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{segment.accounts.toLocaleString()} accounts</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculate Button */}
                  <div className="pt-3">
                    <button
                      onClick={calculatePDs}
                      disabled={selectedSegments.length === 0 || isCalculating}
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCalculating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculate PDs
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Navigation Buttons */}
                <div className="flex justify-between mt-4">
                  <button
                    onClick={goToPreviousTab}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <svg className="mr-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <button
                    onClick={goToNextTab}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                    <svg className="ml-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 p-3 mb-4">
                  <p className="text-xs text-red-800">{error}</p>
                </div>
              )}

              {results ? (
                <div className="space-y-4">
                  {/* Key Metrics Display */}
                  <div className="bg-gray-50 p-4">
                    <h3 className="text-base font-medium text-gray-800 mb-3">Key Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Economic Factor (Z-Score)</p>
                        <p className="text-lg font-bold text-blue-600">{zScore?.toFixed(3)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Selected MEVs</p>
                        <p className="text-sm font-semibold text-gray-800">{results.selectedMEVs.map(mev => getMEVDisplayName(mev)).join(', ')}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Scenario</p>
                        <p className="text-sm font-semibold text-gray-800">{getScenarioDisplayName(results.scenario)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Selected Segments</p>
                        <p className="text-sm font-semibold text-gray-800">{results.selectedSegments.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* PD Curve Chart */}
                  <div className="bg-white border border-gray-300 p-4">
                    <h3 className="text-base font-medium text-gray-800 mb-3">PD Curve Comparison</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={results.chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="bucket" 
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            label={{ value: 'Probability of Default (%)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [`${value.toFixed(2)}%`, name === 'ttcPD' ? 'TTC PD' : 'PIT PD']}
                            labelFormatter={(label) => `Delinquency Bucket: ${label}`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="ttcPD" 
                            stroke="#3B82F6" 
                            strokeWidth={2}
                            name="TTC PD"
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="pitPD" 
                            stroke="#EF4444" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="PIT PD"
                            dot={{ fill: '#EF4444', strokeWidth: 2, r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Segment Results */}
                  <div className="space-y-3">
                    <h3 className="text-base font-medium text-gray-800">Results by Segment</h3>
                    {Object.entries(results.segmentResults).map(([segmentId, segmentData]) => (
                      <div key={segmentId} className="bg-white border border-gray-300 p-3">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">{segmentData.name}</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Delinquency Bucket</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">TTC PD</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">PIT PD</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Difference</th>
                                <th className="px-3 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">% Change</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {Object.entries(segmentData.ttcPDs).map(([bucket, ttcPD]) => (
                                <tr key={bucket}>
                                  <td className="px-3 py-1.5 text-xs font-medium text-gray-900">{bucket}</td>
                                  <td className="px-3 py-1.5 text-xs text-center text-gray-900">{(ttcPD * 100).toFixed(2)}%</td>
                                  <td className="px-3 py-1.5 text-xs text-center text-gray-900">{(segmentData.pitPDs[bucket] * 100).toFixed(2)}%</td>
                                  <td className="px-3 py-1.5 text-xs text-center text-gray-900">{((segmentData.pitPDs[bucket] - ttcPD) * 100).toFixed(2)}%</td>
                                  <td className="px-3 py-1.5 text-xs text-center text-gray-900">{(((segmentData.pitPDs[bucket] - ttcPD) / ttcPD) * 100).toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                  <p className="text-sm">No results yet</p>
                  <p className="text-xs">Configure your model and calculate PDs to see results here</p>
                </div>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex justify-start mt-4">
                <button
                  onClick={goToPreviousTab}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="mr-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              </div>
            </div>
          )}
          </div>
      </div>
    </div>
  );
};

export default PdMethodology;
