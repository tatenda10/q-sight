import { Link } from 'react-router-dom';
import { FaCalculator } from 'react-icons/fa';

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Cashflows() {
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRun = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/account-cashflows");
    }, 5000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-sm font-bold text-gray-900 mb-8">Cashflows</h1>
      <div className="bg-white p-8 flex flex-col items-center gap-6 w-full max-w-md">
        <div className="w-full">
          <label className="block text-xs font-medium text-gray-700 mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <button
          onClick={handleRun}
          disabled={!date || loading}
          className={`w-full bg-gray-600 text-white py-2 text-xs font-semibold hover:bg-gray-700 transition-colors ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          Run
        </button>
        {loading && (
          <div className="flex flex-col items-center mt-4">
            <svg className="animate-spin h-12 w-12 text-gray-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="mt-2 text-gray-600 font-medium text-xs">Generating cashflows...</span>
          </div>
        )}
      </div>
    </div>
  );
}


export default Cashflows;
