import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../utils/Api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.bubble.css';

function ViewDocumentation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/pd-documentation/${id}`);
      
      if (response.data.success) {
        setDocument(response.data.documentation);
      } else {
        setError(response.data.message || 'Failed to fetch document');
      }
    } catch (error) {
      setError('Failed to fetch document');
      console.error('Error fetching document:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Document not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-full px-6 py-6 bg-white">
      <div className="flex justify-between items-center mb-2">
        <h1 className="font-bold text-[#011325]">
          PD Model Documentation - Version {document.version}
        </h1>
        <button
          onClick={() => navigate('/pd-documentation')}
          className="px-4 py-2 text-xs text-gray-600 hover:text-gray-800"
        >
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to List
          </span>
        </button>
      </div>

      <hr className="border border-gray-300 mb-2"></hr>

      <div className="bg-gray-50 p-4 rounded-sm shadow-sm mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600">Created By</p>
            <p className="text-sm font-medium">{document.created_by}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Created Date</p>
            <p className="text-sm font-medium">{new Date(document.created_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Status</p>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full 
              ${document.status.toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' : 
                document.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-gray-100 text-gray-800'}`}>
              {document.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-600">Authorized By</p>
            <p className="text-sm font-medium">{document.authorized_by || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Authorized Date</p>
            <p className="text-sm font-medium">
              {document.authorized_date ? new Date(document.authorized_date).toLocaleDateString() : '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-sm shadow-sm bg-white p-4">
        <ReactQuill
          value={document.content}
          readOnly={true}
          theme="bubble"
          modules={{ toolbar: false }}
        />
      </div>
    </div>
  );
}

export default ViewDocumentation;
