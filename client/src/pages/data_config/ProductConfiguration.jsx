import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../../utils/Api";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

function ProductConfiguration() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = [
    { id: "fic_mis_date", label: "FIC_MIS_DATE" },
    { id: "v_prod_code", label: "V_PROD_CODE" },
    { id: "v_prod_name", label: "V_PROD_NAME" },
    { id: "v_prod_type", label: "V_PROD_TYPE" },
    { id: "v_prod_type_desc", label: "V_PROD_TYPE_DESC" },
    { id: "v_prod_segment", label: "SEGMENT" },
    { id: "v_prod_group", label: "GROUP" },
    { id: "v_prod_group_desc", label: "GROUP_DESC" },
    { id: "v_balance_sheet_category", label: "V_BAL_SHEET_CAT" },
    { id: "v_balance_sheet_category_desc", label: "CATEGORY_DESC" }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/products`);
        setData(response.data.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString) => {
    return dateString ? dateString.split('T')[0] : '';
  };

  if (loading) {
    return (
      <div className="container max-w-full flex items-center justify-center p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-full flex items-center justify-center p-6">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container max-w-full max-h-full overflow-hidden flex flex-col flex-grow p-6 mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-semibold text-gray-800">
        Product Configuration
      </h1>
        <button 
          className="px-4 py-2 bg-[#E95900] text-white text-sm rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-sm"
          onClick={() => navigate('/load-products')}
        >
          Update Products
        </button>
      </div>
      
      <div className="h-px bg-gray-200 w-full mb-6"></div>

      <div className="w-full flex-grow flex max-h-full max-w-full overflow-hidden flex-col bg-white rounded-lg shadow border border-gray-200">
        {/* Scrollable container for responsiveness */}
        <div className="overflow-auto flex-grow max-h-full  relative max-w-full">
          <table className=" w-full min-w-max border-collapse">
            <thead className="sticky top-0 bg-white">
              <tr className="bg-gray-100">
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className="px-4 py-3 text-left text-xs font-bold text-black border-b border-gray-200"
                    style={{ minWidth: "150px" }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr 
                  key={index} 
                  className={`
                    hover:bg-blue-100 transition-colors duration-200
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    border-b border-gray-100
                  `}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100"
                      style={{ minWidth: "150px" }}
                    >
                      {column.id === 'fic_mis_date' 
                        ? formatDate(row[column.id])
                        : row[column.id]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

       
      </div>
    </div>
  );
}

export default ProductConfiguration;
