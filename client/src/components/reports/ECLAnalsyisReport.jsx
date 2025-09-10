import React, { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../../utils/Api";
import { FaSearch } from "react-icons/fa";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

function ECLAnalsyisReport() {
  const [ficMisDate, setFicMisDate] = useState("");
  const [nRunKey, setNRunKey] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'chart'

  // Fetch analysis
  const fetchAnalysis = () => {
    setLoading(true);
    setError("");
    axios
      .get(`${API_URL}/ecl-analysis-report/ecl-full-analysis`, {
        params: {
          ...(ficMisDate && { fic_mis_date: ficMisDate }),
          ...(nRunKey && { n_run_key: nRunKey }),
        },
      })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch ECL analysis.");
        setLoading(false);
      });
  };

  // Helper for formatting numbers
  const fmt = (val, decimals = 2) =>
    val === null || val === undefined
      ? "-"
      : Number(val).toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });

  // Chart data helpers
  const currencyChartData = data && {
    labels: data.byCurrency.map((row) => row.v_ccy_code),
    datasets: [
      {
        label: "EAD",
        data: data.byCurrency.map((row) => row.n_exposure_at_default_ncy),
        backgroundColor: "#3b82f6",
      },
      {
        label: "Lifetime ECL",
        data: data.byCurrency.map((row) => row.n_lifetime_ecl_ncy),
        backgroundColor: "#22c55e",
      },
      {
        label: "12M ECL",
        data: data.byCurrency.map((row) => row.n_12m_ecl_ncy),
        backgroundColor: "#eab308",
      },
    ],
  };

  const stageChartData = data && {
    labels: data.byStage.map((row) => row.n_stage_descr),
    datasets: [
      {
        label: "Accounts",
        data: data.byStage.map((row) => row.accounts),
        backgroundColor: "#64748b",
      },
      {
        label: "EAD",
        data: data.byStage.map((row) => row.n_exposure_at_default_ncy),
        backgroundColor: "#3b82f6",
      },
    ],
  };

  const segmentChartData = data && {
    labels: data.bySegment.map((row) => row.n_prod_segment),
    datasets: [
      {
        label: "EAD",
        data: data.bySegment.map((row) => row.n_exposure_at_default_ncy),
        backgroundColor: "#38bdf8",
      },
    ],
  };

  const delinquencyChartData = data && {
    labels: data.byDelinquency.map((row) => row.delinquency_band),
    datasets: [
      {
        label: "Accounts",
        data: data.byDelinquency.map((row) => row.accounts),
        backgroundColor: "#f472b6",
      },
      {
        label: "EAD",
        data: data.byDelinquency.map((row) => row.n_exposure_at_default_ncy),
        backgroundColor: "#818cf8",
      },
    ],
  };

  const topExposureChartData = data && {
    labels: data.topExposures.map((row) => row.n_account_number),
    datasets: [
      {
        label: "EAD",
        data: data.topExposures.map((row) => row.n_exposure_at_default_ncy),
        backgroundColor: "#f59e42",
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4  py-2 bg-white flex-wrap">
        {/* Left Side - Date and Run Key */}
        <div className="flex gap-2 items-center">
          <input
            type="date"
            className="border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            value={ficMisDate}
            onChange={(e) => setFicMisDate(e.target.value)}
          />
          <input
            type="number"
            placeholder="Run Key"
            className="border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            value={nRunKey}
            onChange={(e) => setNRunKey(e.target.value)}
            min={1}
          />
        </div>

        {/* Right Side - View Mode and Search Button */}
        <div className="flex gap-2 items-center">
          <select
            className="border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value="table">Tabular View</option>
            <option value="chart">Graphical View</option>
          </select>

          <button
            className="flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={fetchAnalysis}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Fetching...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      <hr className="mb-4 border-gray-300" />

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {data && (
        <div className="space-y-8">
          {/* Summary Cards */}
      

          {/* By Currency */}
          <div className="space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="text-sm font-semibold text-gray-800">Totals by Currency</h2>
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-500">View:</span>
      <select 
        className="border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
        value={viewMode}
        onChange={(e) => setViewMode(e.target.value)}
      >
        <option value="table">Table</option>
        <option value="chart">Chart</option>
      </select>
    </div>
  </div>

  {viewMode === "table" ? (
    <div className="overflow-x-auto border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2.5 text-start font-medium text-gray-700 w-1/4">Currency</th>
            <th className="px-4 py-2.5 text-start font-medium text-gray-700 w-1/4">EAD</th>
            <th className="px-4 py-2.5 text-start font-medium text-gray-700 w-1/4">Lifetime ECL</th>
            <th className="px-4 py-2.5 text-start font-medium text-gray-700 w-1/4">12M ECL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.byCurrency?.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="whitespace-nowrap px-4 py-2.5 text-start font-medium text-gray-900">
                {row.v_ccy_code}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-start text-gray-700">
                {fmt(row.n_exposure_at_default_ncy)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-start text-gray-700">
                {fmt(row.n_lifetime_ecl_ncy)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-start text-gray-700">
                {fmt(row.n_12m_ecl_ncy)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="bg-white p-4 border border-gray-200 shadow-sm">
      <Bar 
        data={currencyChartData}
        options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: {
                  size: 12
                },
                boxWidth: 12,
                padding: 20
              }
            },
            tooltip: {
              backgroundColor: '#1F2937',
              titleFont: {
                size: 12
              },
              bodyFont: {
                size: 12
              },
              padding: 10,
              cornerRadius: 4,
              displayColors: true,
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                }
              }
            },
            y: {
              grid: {
                color: '#E5E7EB',
                drawBorder: false
              },
              ticks: {
                font: {
                  size: 11
                },
                callback: function(value) {
                  return fmt(value);
                }
              }
            }
          },
          elements: {
            bar: {
              borderRadius: 4,
              borderSkipped: false
            }
          }
        }}
      />
    </div>
  )}
</div>

          {/* By Stage */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Breakdown by IFRS Stage</h2>
            {viewMode === "table" ? (
              <div className="overflow-x-auto border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">Stage</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">Accounts</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">EAD</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.byStage?.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                          {row.n_stage_descr}
                        </td>
                        <td className="px-4 py-2.5 text-left text-gray-700">
                          {fmt(row.accounts, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-left text-gray-700">
                          {fmt(row.n_exposure_at_default_ncy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Bar data={stageChartData} />
            )}
          </div>

          {/* By Segment */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Breakdown by Product Segment</h2>
            {viewMode === "table" ? (
              <div className="overflow-x-auto border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">Segment</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">EAD</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.bySegment?.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                          {row.n_prod_segment}
                        </td>
                        <td className="px-4 py-2.5 text-left text-gray-700">
                          {fmt(row.n_exposure_at_default_ncy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Bar data={segmentChartData} />
            )}
          </div>

          {/* Delinquency Distribution */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Delinquency Distribution</h2>
            {viewMode === "table" ? (
              <div className="overflow-x-auto border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">
                        Delinquency Band
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">
                        Accounts
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">
                        Exposure At Default
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.byDelinquency?.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                          {row.delinquency_band}
                        </td>
                        <td className="px-4 py-2.5 text-left text-gray-700">
                          {fmt(row.accounts, 0)}
                        </td>
                        <td className="px-4 py-2.5 text-left text-gray-700">
                          {fmt(row.n_exposure_at_default_ncy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Bar data={delinquencyChartData} />
            )}
          </div>

          {/* Top 10 Exposures */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Top 10 Exposures</h2>
            {viewMode === "table" ? (
              <div className="overflow-x-auto border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">Account</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-700">EAD</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.topExposures?.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-left font-medium text-gray-900">
                          {row.n_account_number}
                        </td>
                        <td className="px-4 py-2.5 text-left text-gray-700">
                          {fmt(row.n_exposure_at_default_ncy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Bar data={topExposureChartData} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ECLAnalsyisReport;
