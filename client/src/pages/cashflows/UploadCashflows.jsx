import React, { useState } from "react";
import { CheckCircle } from "lucide-react"; // or use any icon library you prefer
function UploadCashflows() {
  const [account, setAccount] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState(null);

  return (
    <div className="w-full bg-white p-8">
      {/* Top bar: title left, form right */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-sm font-bold text-gray-800">Upload Cashflows</h2>

        <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full sm:w-auto">
          {/* Account Number Input */}
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Account Number"
            className="w-full sm:w-[140px] border border-gray-300 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />

          {/* Date Picker */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-[150px] border border-gray-300 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />

          {/* Icon Button */}
          <button
            type="button"
            className="bg-gray-600 hover:bg-gray-700 text-white p-2 text-xs transition"
            title="Select"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
      <hr className="my-1 border-gray-200" />
      {/* Upload icon area, centered horizontally but full width */}
      <div className="flex flex-col items-center justify-center w-full py-16 bg-gray-50 border border-dashed border-gray-300 transition hover:bg-gray-100">
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center justify-center text-center"
        >
          {/* File upload icon */}
          <svg
            className="w-16 h-16 text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V6"
            />
          </svg>
          <span className="text-sm font-semibold text-gray-600">
            Click to select Excel file
          </span>
          <span className="text-xs text-gray-500 mt-1">
            (Accepted: .xlsx, .xls)
          </span>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
          />
        </label>

        {file && (
          <div className="mt-3 text-xs text-green-600 font-medium">
            Selected: {file.name}
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadCashflows;
