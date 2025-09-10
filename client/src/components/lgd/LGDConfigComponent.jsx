import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../utils/Api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { FaEdit, FaTrash } from 'react-icons/fa';

const LGDConfigComponent = () => {
  const [lgdTermStructures, setLgdTermStructures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLgdTermStructures = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/lgd-config`);
        if (response.data.success) {
          setLgdTermStructures(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching LGD term structures:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLgdTermStructures();
  }, []);

  return (
    <div className="flex-1 bg-white border border-gray-200 flex flex-col overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left uppercase font-medium text-gray-700 tracking-wider">v_LGD_term_structure_id</th>
                  <th className="px-4 py-2 text-left uppercase font-medium text-gray-700 tracking-wider">v_lgd_term_structure_name</th>
                  <th className="px-4 py-2 text-left uppercase font-medium text-gray-700 tracking-wider">LGD</th>
                  <th className="px-4 py-2 text-left uppercase font-medium text-gray-700 tracking-wider">FIC_MIS_Date</th>
                  <th className="px-4 py-2 text-left uppercase font-medium text-gray-700 tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lgdTermStructures.map((structure) => (
                  <tr key={structure.v_lgd_term_structure_id}>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{structure.v_lgd_term_structure_id}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{structure.v_lgd_term_structure_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{structure.n_lgd_percent}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{new Date(structure.fic_mis_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <FaEdit />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LGDConfigComponent; 