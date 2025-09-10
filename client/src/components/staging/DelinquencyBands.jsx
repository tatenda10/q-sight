import React from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';

const DelinquencyBands = ({ 
    delinquencyBands, 
    amortizationUnits, 
    isLoading, 
    openModal 
}) => {
    return (
        <div className="overflow-auto flex-1">
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner />
                </div>
            ) : (
                <table className="w-full min-w-max border-collapse">
                    <thead className="sticky top-0 bg-white">
                        <tr className="bg-gray-100">
                            <th className="px-4 py-3 text-left text-xs font-bold text-black border-b border-gray-200" style={{ minWidth: "150px" }}>Band Code</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black border-b border-gray-200" style={{ minWidth: "150px" }}>Description</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black border-b border-gray-200" style={{ minWidth: "150px" }}>Lower Value</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black border-b border-gray-200" style={{ minWidth: "150px" }}>Upper Value</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black border-b border-gray-200" style={{ minWidth: "150px" }}>Amortization Unit</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-black border-b border-gray-200" style={{ minWidth: "100px" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {delinquencyBands.map((band, index) => (
                            <tr key={band.bandCode} 
                                className={`
                                    hover:bg-blue-100 transition-colors duration-200
                                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                    border-b border-gray-100
                                `}>
                                <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100">{band.bandCode}</td>
                                <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100">{band.description}</td>
                                <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100">{band.lowerValue}</td>
                                <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100">{band.upperValue}</td>
                                <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100">
                                    {amortizationUnits.find(u => u.value === band.amortizationTermUnit)?.label}
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-900 whitespace-nowrap border-x border-gray-100">
                                    <button
                                        onClick={() => openModal('delinquency', band)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default DelinquencyBands; 