import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
        ></div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span 
          className="hidden sm:inline-block sm:align-middle sm:h-screen" 
          aria-hidden="true"
        >&#8203;</span>

        {/* Modal panel */}
        <div 
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full"
          style={{
            animation: 'modal-appear 0.3s ease-out forwards'
          }}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 
                    className="text-2xl leading-6 font-bold text-gray-900" 
                    id="modal-title"
                  >
                    {title}
                  </h3>
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-4">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        @keyframes modal-appear {
          from {
            opacity: 0;
            transform: scale(0.95) translate(0, 20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translate(0, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default Modal; 