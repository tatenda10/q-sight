import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Node = ({ node, isActive, onClick }) => {
  return (
    <div 
      className={`absolute w-32 transform -translate-x-1/2 -translate-y-1/2 z-10
        ${isActive ? 'z-20' : ''}`}
      style={{
        top: node.position.top,
        left: node.position.left
      }}
    >
      <div 
        className={`border-2 ${node.color} rounded-lg shadow-md cursor-pointer transition-all
          ${isActive ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}`}
        onClick={onClick}
      >
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${node.color} mr-2`}>
              <FontAwesomeIcon icon={node.icon} className="text-sm" />
            </div>
            <h3 className="font-semibold text-sm">{node.title}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Node; 