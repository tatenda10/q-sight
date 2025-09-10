import React, { useState } from 'react'

function PdMethodology() {
  const [activeTab, setActiveTab] = useState('methodology');

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">PD Methodology & Model Development</h1>
          </div>
          <div className="h-px bg-gray-200 w-full"></div>
        </div>

        {/* Tabs (interactive) */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`$ {activeTab === 'methodology' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium`}
              onClick={() => setActiveTab('methodology')}
            >
              PD Methodology
            </button>
            <button
              className={`$ {activeTab === 'develop' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium`}
              onClick={() => setActiveTab('develop')}
            >
              Develop PD Model
            </button>
          </nav>
        </div>

        {/* Section 1: PD Methodology */}
        {activeTab === 'methodology' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-[#011325] mb-4">PD Methodology</h2>
            <p className="text-gray-700">Methodology</p>
          </div>
        )}

        {/* Section 2: Develop PD Model */}
        {activeTab === 'develop' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-[#011325] mb-4">Develop PD Model</h2>
            {/* Upload Data */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Data</label>
              <input type="file" accept=".csv, .xlsx, .xls" className="block w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            {/* Select Method */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select PD Model Method</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">Select a method</option>
                <option value="jacob-fryer">Jacob Fryer</option>
                <option value="vasicek">Vasicek</option>
                <option value="other">Other</option>
              </select>
            </div>
            {/* Segmentation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Segmentation</label>
              <input type="text" className="w-full border border-gray-300 rounded px-3 py-2" placeholder="e.g. Retail, SME, Corporate" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PdMethodology
