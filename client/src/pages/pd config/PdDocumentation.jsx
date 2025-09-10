import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import API_URL from '../../utils/Api';

function PdDocumentation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const navigate = useNavigate();
  const location = useLocation();
  const isCreateMode = location.pathname === '/create-documentation';

  useEffect(() => {
    if (!isCreateMode) {
      // Load existing documentation if in edit mode
      // You can implement this later when needed
    }
  }, [isCreateMode]);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!version.trim()) {
        setError('Please enter a version number');
        return;
      }

      if (!title.trim()) {
        setError('Please enter a title for the documentation');
        return;
      }

      if (!editorContent.trim()) {
        setError('Please enter some content for the documentation');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_URL}/pd-documentation/save`, {
        version,
        title,
        content: editorContent,
        createdBy: 'System',
        authorizedBy: 'System'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        alert('Documentation saved successfully');
        navigate('/pd-documentation');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save documentation');
      console.error('Error saving documentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/pd-documentation');
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image', 'video'],
      ['table']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'script',
    'indent',
    'direction',
    'color', 'background',
    'font',
    'align',
    'link', 'image', 'video',
    'table'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-full px-6 py-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className=" font-bold text-[#011325]">
          {isCreateMode ? 'Create New PD Documentation' : 'Edit PD Documentation'}
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[#011325] text-white rounded-md hover:bg-[#011325]/90 transition-colors duration-200 font-medium  shadow-md hover:shadow-lg"
          >
            Save Documentation
          </button>
        </div>
      </div>
      <hr className="border-gray-300 mb-6"></hr>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
            Version
          </label>
          <input
            type="text"
            id="version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#011325] focus:border-transparent"
            placeholder="Enter version number (e.g., 1.0.0)"
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Documentation Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#011325] focus:border-transparent"
            placeholder="Enter documentation title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Documentation Content
          </label>
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <ReactQuill
              theme="snow"
              value={editorContent}
              onChange={setEditorContent}
              modules={modules}
              formats={formats}
              className="h-[calc(100vh-400px)] mb-12"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PdDocumentation;