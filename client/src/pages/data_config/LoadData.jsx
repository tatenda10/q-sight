import React, { useState, useRef } from 'react';
import axios from 'axios';
import API_URL from '../../utils/Api';

function LoadData() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileType, setSelectedFileType] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);
  
  const fileTypes = [
    { id: 'LOAN_CONTRACTS', label: 'Loan Contracts' },
    { id: 'INVESTMENTS', label: 'Investments' },
    { id: 'PARTY_RATINGS', label: 'Party Ratings' },
    { id: 'PARTY_MASTER', label: 'Party Master', endpoint: '/customer-info' },
    { id: 'EXCHANGE_RATES', label: 'Exchange Rates' }
  ];

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus(null); // Reset status on new file selection
    }
  };

  const handleFileTypeChange = (event) => {
    setSelectedFileType(event.target.value);
    setUploadStatus(null); // Reset status on file type change
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedFileType) {
      alert('Please select both a file and file type');
      return;
    }

    setIsLoading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      let response;
      
      // Handle different file types
      switch (selectedFileType) {
        case 'PARTY_MASTER':
          response = await axios.post(`${API_URL}/customer-info`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          break;

        case 'LOAN_CONTRACTS':
          response = await axios.post(`${API_URL}/loan-contracts`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              console.log('Upload Progress:', percentCompleted);
            },
          });
          break;

        default:
          throw new Error('Unsupported file type');
      }

      setUploadStatus({
        type: 'success',
        message: `Successfully uploaded ${response.data.count} records`,
      });
      
      // Clear the form
      setSelectedFile(null);
      setSelectedFileType('');
      
    } catch (error) {
      let errorMessage = 'Error uploading file';
      
      if (error.response) {
        if (error.response.data.duplicates) {
          errorMessage = `Found ${error.response.data.duplicates.length} duplicate records. Please check the data and try again.`;
        } else if (error.response.data.errors) {
          // Handle validation errors array or object
          if (Array.isArray(error.response.data.errors)) {
            errorMessage = `Validation errors found:\n${error.response.data.errors.join('\n')}`;
          } else if (error.response.data.errors.affectedRows) {
            // Handle specific row errors for loan contracts
            const affectedRows = error.response.data.errors.affectedRows;
            errorMessage = `Validation errors found in rows:\n${affectedRows.map(row => 
              `Row ${row.row}: ${row.value || 'missing value'}`
            ).join('\n')}`;
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }

      setUploadStatus({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = (fileType) => {
    // TODO: Implement template download logic
    console.log('Downloading template for:', fileType);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="p-3">
      {/* <div className="mb-8">
        <h1 className=" px-5 text-xl font-semibold text-gray-800 mb-4">Load Data</h1>
      </div> */}

      {/* File Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold font-medium text-gray-800 mb-4">Upload Data File</h2>
        <hr className="border-t border-gray-200 mb-8" />

        <div className="space-y-4">
          {/* File Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File Type
            </label>
            <select
              value={selectedFileType}
              onChange={handleFileTypeChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a file type...</option>
              {fileTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* New Drag & Drop File Input */}
    <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose File
            </label>
            <div
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8
                flex flex-col items-center justify-center
                cursor-pointer
                transition-colors
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-500'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="flex items-center space-x-2">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-600">{selectedFile.name}</span>
                </div>
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V6" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Drag and drop your file here, or click to select
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Supports: CSV, Excel files
                  </p>
                </>
              )}
            </div>
            
            {/* Upload Status Message */}
            {uploadStatus && (
              <div className={`mt-4 p-4 rounded-md ${
                uploadStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <p className="text-sm whitespace-pre-line">{uploadStatus.message}</p>
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !selectedFileType || isLoading}
                className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2
                  ${isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {isLoading && (
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {isLoading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Download Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fileTypes.map(type => (
            <div
              key={type.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{type.label}</span>
                <button
                  onClick={() => handleDownloadTemplate(type.id)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadData;
