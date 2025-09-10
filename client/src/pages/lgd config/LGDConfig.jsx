import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import axios from 'axios';
import API_URL from '../../utils/Api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import LGDConfigComponent from '../../components/lgd/LGDConfigComponent';
import LGDCollateralConfig from '../../components/lgd/LGDCollateralConfig';

function LGDConfig() {
  const [productSegments, setProductSegments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [lgdForm, setLgdForm] = useState({
    lgdTermStructureId: '',
    lgdTermStructureName: '',
    lgdPercent: '',
    ficMisDate: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('lgdConfig');

  // Fetch Product Segments
  const fetchProductSegments = async () => {
    try {
      const response = await axios.get(`${API_URL}/product-segments`);
      if (response.data.success) {
        setProductSegments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching product segments:', error);
    }
  };

  useEffect(() => {
    fetchProductSegments();
  }, []);

  // Handle Form Submission
  const handleLgdSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        ...lgdForm,
        lgdPercent: parseFloat(lgdForm.lgdPercent) // Ensure lgdPercent is a float
      };

      const response = await axios.post(`${API_URL}/lgd-term-structures/add`, formData);
      if (response.data.success) {
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error adding LGD term structure:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <h1 className="text-sm font-semibold text-gray-800">LGD Configuration</h1>
          </div>
          <div className="h-px bg-gray-200 w-full"></div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`${
                activeTab === 'lgdConfig'
                  ? 'border-gray-600 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-xs`}
              onClick={() => setActiveTab('lgdConfig')}
            >
              LGD Config
            </button>
            <button
              className={`${
                activeTab === 'lgdCollateralConfig'
                  ? 'border-gray-600 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-xs`}
              onClick={() => setActiveTab('lgdCollateralConfig')}
            >
              LGD Collateral Config
            </button>
          </nav>
        </div>

        {/* Add Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="bg-gray-600 text-white px-4 py-2 text-xs hover:bg-gray-700 flex items-center gap-2"
          >
            <FaPlus /> Add New LGD Term Structure
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'lgdConfig' ? <LGDConfigComponent /> : <LGDCollateralConfig />}
        </div>
      </div>

      {/* Modal for Adding LGD Term Structure */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border w-[500px] bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-gray-900">Add LGD Term Structure</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleLgdSubmit} className="space-y-6">
                {/* LGD Term Structure Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Product Segment
                    </label>
                    <select
                      value={lgdForm.lgdTermStructureId}
                      onChange={(e) => {
                        const selectedSegment = productSegments.find(segment => segment.segment_id === parseInt(e.target.value, 10));
                        setLgdForm({
                          ...lgdForm,
                          lgdTermStructureId: selectedSegment.segment_id,
                          lgdTermStructureName: selectedSegment.v_prod_type
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      required
                    >
                      <option value="">Select Product Segment</option>
                      {productSegments.map((segment) => (
                        <option key={segment.segment_id} value={segment.segment_id}>
                          {segment.v_prod_segment} - {segment.v_prod_type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      LGD Percentage
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={lgdForm.lgdPercent}
                      onChange={(e) => setLgdForm({...lgdForm, lgdPercent: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      MIS Date
                    </label>
                    <input
                      type="date"
                      value={lgdForm.ficMisDate}
                      onChange={(e) => setLgdForm({...lgdForm, ficMisDate: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 text-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-600 text-white text-xs hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    <FaSave className="inline-block mr-2" /> Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LGDConfig;




