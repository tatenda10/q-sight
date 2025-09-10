import React, { useState, useCallback } from 'react';
import axios from 'axios';
import API_URL from "../../utils/Api";
import { useNavigate } from 'react-router-dom';
import { FaFileUpload } from 'react-icons/fa'; // Make sure to install react-icons

function LoadProducts() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/vnd.ms-excel' || 
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'text/csv') {
        setFile(file);
        setError(null);
      } else {
        setError('Please upload only Excel or CSV files');
      }
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setFile(file);
    setError(null);
    setSuccess(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/products/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/product-configuration');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/template`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Error downloading template. Please try again.');
    }
  };

  return (
    <div className="container max-w-full max-h-full overflow-hidden flex flex-col flex-grow p-6 mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-semibold text-gray-800">
          Load Products
        </h1>
        <button 
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors duration-200 shadow-sm flex items-center gap-2"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download Template
        </button>
      </div>
      
      <div className="h-px bg-gray-200 w-full mb-6"></div>

      <div className="w-full max-w-2xl mx-auto">
        <form onSubmit={handleUpload} className="bg-white shadow-lg rounded-lg p-8">
          <div 
            className={`
              relative group
              border-2 border-dashed rounded-lg
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${file ? 'border-green-500 bg-green-50' : ''}
              transition-all duration-200 ease-in-out
              h-64 flex flex-col items-center justify-center
              cursor-pointer
            `}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput').click()}
          >
            <input
              id="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <FaFileUpload className={`
              text-6xl mb-4
              ${isDragging ? 'text-blue-500' : 'text-gray-400'}
              ${file ? 'text-green-500' : ''}
              transition-colors duration-200
            `}/>

            <div className="text-center">
              {file ? (
                <div className="text-green-600 font-medium">
                  {file.name}
                </div>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-700 mb-1">
                    Drag and drop your file here
                  </p>
                  <p className="text-sm text-gray-500">
                    or click to select a file
                  </p>
                </>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Supported formats: .xlsx, .xls, .csv
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-600 text-sm">File uploaded successfully! Redirecting...</p>
            </div>
          )}

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading || !file}
              className={`
                w-full bg-blue-600 hover:bg-blue-700 text-white font-medium
                py-3 px-4 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                transition-all duration-200
                ${(loading || !file) ? 'opacity-50 cursor-not-allowed' : ''}
                flex items-center justify-center
              `}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload Products'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoadProducts;
