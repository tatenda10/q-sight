import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../../utils/Api';
import SuccessModal from '../../components/shared/SuccessModal';
import ErrorModal from '../../components/shared/ErrorModal';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import DelinquencyBands from '../../components/staging/DelinquencyBands';
import DPDThresholds from '../../components/staging/DPDThresholds';
import StagingRatings from '../../components/staging/StagingRatings';

function StagingConfig() {
    const [activeTab, setActiveTab] = useState('delinquency');
    const [delinquencyBands, setDelinquencyBands] = useState([]);
    const [dpdThresholds, setDpdThresholds] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formType, setFormType] = useState('');
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [creditRatings, setCreditRatings] = useState([]);

    const amortizationUnits = [
        { value: 'D', label: 'Daily' },
        { value: 'W', label: 'Weekly' },
        { value: 'M', label: 'Monthly' },
        { value: 'Q', label: 'Quarterly' },
        { value: 'H', label: 'Half-yearly' },
        { value: 'Y', label: 'Yearly' }
    ];

    useEffect(() => {
        fetchData();
    }, [activeTab, currentPage]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            let response;
            switch (activeTab) {
                case 'delinquency':
                    response = await axios.get(`${API_URL}/staging/delinquency-bands`);
                setDelinquencyBands(response.data.data);
                    break;
                case 'dpd':
                    response = await axios.get(`${API_URL}/staging/dpd-thresholds`);
                setDpdThresholds(response.data.data);
                    break;
                case 'rating':
                    response = await axios.get(`${API_URL}/staging/credit-rating`);
                    setCreditRatings(response.data.data);
                    break;
            }
                setTotalPages(response.data.pagination?.totalPages || 1);
        } catch (error) {
            toast.error(`Failed to fetch ${activeTab} data`);
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = activeTab === 'delinquency' 
                ? `${API_URL}/staging/delinquency-bands` 
                : activeTab === 'dpd' 
                    ? `${API_URL}/staging/dpd-thresholds`
                    : `${API_URL}/staging/credit-rating`;
            
            await axios.post(endpoint, formData);
            
            // Set success message and show success modal
            setSuccessMessage(`${activeTab} configuration saved successfully`);
            setShowSuccessModal(true);
            setShowModal(false); // Close the form modal
            fetchData(); // Refresh the data
        } catch (error) {
            // Set error message and show error modal
            setErrorMessage(error.response?.data?.message || 'Configuration failed');
            setShowErrorModal(true);
            console.error('Error:', error);
        }
    };

    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        setSuccessMessage('');
    };

    const handleErrorModalClose = () => {
        setShowErrorModal(false);
        setErrorMessage('');
    };

    const openModal = (type, data = null) => {
        setFormType(type);
        setIsEditing(!!data);
        setFormData(data || getInitialFormData(type));
        setShowModal(true);
    };

    const getInitialFormData = (type) => {
        switch (type) {
            case 'delinquency':
                return { bandCode: '', description: '', lowerValue: '', upperValue: '', amortizationTermUnit: 'M' };
            case 'dpd':
                return { payment_frequency: 'M', stage_1_threshold: '', stage_2_threshold: '', stage_3_threshold: '' };
            case 'rating':
                return { credit_rating: '', stage: '', description: '' };
            default:
                return {};
        }
    };

  return (
        <div className="h-screen flex flex-col overflow-hidden">
            <div className="p-6 space-y-6">
                <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                        <h1 className="text-sm font-semibold text-gray-800">Staging Configuration</h1>
                    </div>
                    <div className="h-px bg-gray-200 w-full"></div>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            className={`${
                                activeTab === 'delinquency'
                                    ? 'border-gray-600 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-xs`}
                            onClick={() => setActiveTab('delinquency')}
                        >
                            Delinquency Bands
                        </button>
                        <button
                            className={`${
                                activeTab === 'dpd'
                                    ? 'border-gray-600 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-xs`}
                            onClick={() => setActiveTab('dpd')}
                        >
                            DPD Thresholds
                        </button>
                        <button
                            className={`${
                                activeTab === 'rating'
                                    ? 'border-gray-600 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-xs`}
                            onClick={() => setActiveTab('rating')}
                        >
                            Staging Ratings
                        </button>
                    </nav>
                </div>

                {/* Add Button */}
                <div className="mb-4 flex justify-end">
                    <button
                        onClick={() => openModal(activeTab)}
                        className="bg-gray-600 text-white px-4 py-2 text-xs hover:bg-gray-700"
                    >
                        Add New {activeTab === 'delinquency' ? 'Delinquency Band' : activeTab === 'dpd' ? 'DPD Threshold' : 'Staging Rating'}
                    </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 bg-white border border-gray-200 flex flex-col overflow-hidden">
                        {activeTab === 'delinquency' && (
                            <DelinquencyBands
                                delinquencyBands={delinquencyBands}
                                amortizationUnits={amortizationUnits}
                                isLoading={isLoading}
                                openModal={openModal}
                            />
                        )}
                        {activeTab === 'dpd' && (
                            <DPDThresholds
                                dpdThresholds={dpdThresholds}
                                amortizationUnits={amortizationUnits}
                                isLoading={isLoading}
                                openModal={openModal}
                            />
                        )}
                        {activeTab === 'rating' && (
                            <StagingRatings
                                creditRatings={creditRatings}
                                isLoading={isLoading}
                                openModal={openModal}
                            />
                            )}
                        </div>

                        {/* Pagination section */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                            <div className="flex items-center">
                                <span className="text-xs text-gray-700">
                                    Page {currentPage} of {totalPages}
                                </span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border text-xs disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border text-xs disabled:opacity-50"
                                >
                                    Next
                                </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-8 border w-[500px] bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    {isEditing ? 'Edit' : 'Add'} {formType === 'delinquency' ? 'Delinquency Band' : formType === 'dpd' ? 'DPD Threshold' : 'Staging Rating'}
                                </h3>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {formType === 'delinquency' ? (
                                    <>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                                    Band Code
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.bandCode}
                                                    onChange={(e) => setFormData({ ...formData, bandCode: e.target.value })}
                                                    placeholder="e.g., STG1_DPD"
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                                    Description
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    placeholder="e.g., Stage 1 - Current to 30 Days"
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                        Lower Value (Days)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={formData.lowerValue}
                                                        onChange={(e) => setFormData({ ...formData, lowerValue: e.target.value })}
                                                        placeholder="0"
                                                        min="0"
                                                        className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                        required
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                                        Upper Value (Days)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={formData.upperValue}
                                                        onChange={(e) => setFormData({ ...formData, upperValue: e.target.value })}
                                                        placeholder="30"
                                                        min="0"
                                                        className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                                    Amortization Term Unit
                                                </label>
                                                <select
                                                    value={formData.amortizationTermUnit}
                                                    onChange={(e) => setFormData({ ...formData, amortizationTermUnit: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                >
                                                    {amortizationUnits.map((unit) => (
                                                        <option key={unit.value} value={unit.value}>
                                                            {unit.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                ) : formType === 'dpd' ? (
                                    <>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Payment Frequency</label>
                                                <select
                                                    value={formData.payment_frequency}
                                                    onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                >
                                                    {amortizationUnits.map((unit) => (
                                                        <option key={unit.value} value={unit.value}>
                                                            {unit.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Stage 1 Threshold (Days)</label>
                                                <input
                                                    type="number"
                                                    value={formData.stage_1_threshold}
                                                    onChange={(e) => setFormData({ ...formData, stage_1_threshold: parseInt(e.target.value) })}
                                                    placeholder="e.g., 30"
                                                    min="0"
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Stage 2 Threshold (Days)</label>
                                                <input
                                                    type="number"
                                                    value={formData.stage_2_threshold}
                                                    onChange={(e) => setFormData({ ...formData, stage_2_threshold: parseInt(e.target.value) })}
                                                    placeholder="e.g., 90"
                                                    min="0"
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Stage 3 Threshold (Days)</label>
                                                <input
                                                    type="number"
                                                    value={formData.stage_3_threshold}
                                                    onChange={(e) => setFormData({ ...formData, stage_3_threshold: parseInt(e.target.value) })}
                                                    placeholder="e.g., 10000"
                                                    min="0"
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Credit Rating</label>
                                                <input
                                                    type="text"
                                                    value={formData.credit_rating}
                                                    onChange={(e) => setFormData({ ...formData, credit_rating: e.target.value })}
                                                    placeholder="e.g., AAA"
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Stage</label>
                                                <input
                                                    type="text"
                                                    value={formData.stage}
                                                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                                                    placeholder="e.g., 1"
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                />
                                            </div>

    <div>
                                                <label className="block text-xs font-medium text-gray-700">Description</label>
                                                <input
                                                    type="text"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    placeholder="e.g., High credit quality"
                                                    className="w-full px-4 py-2 border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                
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
                                        {isEditing ? 'Update' : 'Add'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessModalClose}
                message={successMessage}
            />

            {/* Error Modal */}
            <ErrorModal
                isOpen={showErrorModal}
                onClose={handleErrorModalClose}
                message={errorMessage}
            />
    </div>
    );
}

export default StagingConfig;
